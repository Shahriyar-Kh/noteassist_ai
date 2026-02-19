# FILE: notes/email_service.py - PRODUCTION FIX WITH ASYNC SENDING
# ============================================================================
# This version prevents worker timeouts and handles SendGrid properly
# ============================================================================

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
import logging
import threading

logger = logging.getLogger(__name__)


class EmailService:
    """
    Unified email service that handles both SendGrid and SMTP
    with async sending to prevent worker timeouts
    """
    
    @staticmethod
    def send_email(
        to_email,
        subject,
        text_content,
        html_content=None,
        from_email=None,
        reply_to=None,
        async_send=True  # NEW: Send asynchronously by default in production
    ):
        """
        Send email using best available method
        
        Args:
            async_send: If True, sends email in background thread (prevents timeouts)
        
        Returns:
            bool: True if email queued/sent successfully
        """
        try:
            # Validate inputs
            if not to_email or not subject or not text_content:
                logger.error("❌ Email sending failed: Missing required fields")
                return False
            
            # Use default from_email if not provided
            # Priority: SENDGRID_FROM_EMAIL > EMAIL_HOST_USER > DEFAULT_FROM_EMAIL
            # This ensures we use a VERIFIED sender email
            if not from_email:
                from_email = (
                    getattr(settings, 'SENDGRID_FROM_EMAIL', None) or 
                    getattr(settings, 'EMAIL_HOST_USER', None) or 
                    settings.DEFAULT_FROM_EMAIL
                )
            
            logger.info(f"📧 Attempting to send email to: {to_email}")
            logger.info(f"   Subject: {subject}")
            logger.info(f"   From: {from_email}")
            
            # Check if we're in development mode
            if settings.DEBUG:
                logger.info("   Method: Console (Development Mode)")
                return EmailService._send_via_console(
                    to_email=to_email,
                    subject=subject,
                    text_content=text_content,
                    html_content=html_content,
                    from_email=from_email
                )
            
            # Production mode - use async sending to prevent timeouts
            if async_send:
                logger.info("   Method: Async (Background Thread)")
                thread = threading.Thread(
                    target=EmailService._send_email_sync,
                    args=(to_email, subject, text_content, html_content, from_email, reply_to)
                )
                thread.daemon = True
                thread.start()
                logger.info("✅ Email queued for background sending")
                return True
            else:
                # Synchronous sending (not recommended in production)
                return EmailService._send_email_sync(
                    to_email, subject, text_content, html_content, from_email, reply_to
                )
                
        except Exception as e:
            logger.error(f"❌ Email sending failed: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    @staticmethod
    def _send_email_sync(to_email, subject, text_content, html_content, from_email, reply_to=None):
        """Internal method for synchronous email sending"""
        try:
            # Production mode - try SendGrid first
            sendgrid_api_key = getattr(settings, 'SENDGRID_API_KEY', '').strip()
            
            if sendgrid_api_key and len(sendgrid_api_key) > 20:
                logger.info("   Using: SendGrid API")
                success = EmailService._send_via_sendgrid_api(
                    to_email=to_email,
                    subject=subject,
                    text_content=text_content,
                    html_content=html_content,
                    from_email=from_email,
                    api_key=sendgrid_api_key
                )
                
                if success:
                    return True
                else:
                    logger.warning("⚠️  SendGrid failed, trying SMTP fallback")
            
            # Fallback to SMTP
            logger.info("   Using: SMTP")
            return EmailService._send_via_smtp(
                to_email=to_email,
                subject=subject,
                text_content=text_content,
                html_content=html_content,
                from_email=from_email,
                reply_to=reply_to
            )
            
        except Exception as e:
            logger.error(f"❌ Sync email sending failed: {str(e)}")
            return False
    
    @staticmethod
    def _send_via_console(to_email, subject, text_content, html_content, from_email):
        """
        Send email to console (development mode)
        """
        try:
            from django.core.mail import send_mail
            
            # This will print to console
            send_mail(
                subject=subject,
                message=text_content,
                from_email=from_email,
                recipient_list=[to_email],
                fail_silently=False
            )
            
            logger.info(f"✅ Email printed to console")
            logger.info("=" * 60)
            logger.info(f"TO: {to_email}")
            logger.info(f"FROM: {from_email}")
            logger.info(f"SUBJECT: {subject}")
            logger.info("-" * 60)
            logger.info(text_content[:500])
            logger.info("=" * 60)
            return True
            
        except Exception as e:
            logger.error(f"❌ Console email failed: {str(e)}")
            return False
    
    @staticmethod
    def _send_via_sendgrid_api(to_email, subject, text_content, html_content, from_email, api_key):
        """
        Send email using SendGrid API with timeout protection
        """
        try:
            # Import SendGrid
            try:
                import sendgrid
                from sendgrid.helpers.mail import Mail, Email, To, Content
            except ImportError:
                logger.error("❌ SendGrid library not installed")
                logger.error("   Install with: pip install sendgrid")
                return False
            
            # Validate API key format
            if not api_key.startswith('SG.'):
                logger.warning("⚠️  SendGrid API key format unusual (should start with 'SG.')")
            
            # Create SendGrid client
            sg = sendgrid.SendGridAPIClient(api_key=api_key)
            
            # Create mail object
            message = Mail(
                from_email=Email(from_email),
                to_emails=To(to_email),
                subject=subject,
                plain_text_content=Content("text/plain", text_content),
                html_content=Content("text/html", html_content) if html_content else None
            )
            
            # Send with SHORT timeout to prevent worker hangs
            import socket
            original_timeout = socket.getdefaulttimeout()
            socket.setdefaulttimeout(10)  # 10 second timeout
            
            try:
                response = sg.send(message)
                
                logger.info(f"   SendGrid Status: {response.status_code}")
                
                if response.status_code == 202:
                    logger.info(f"✅ Email accepted by SendGrid for delivery to {to_email}")
                    return True
                    
                elif response.status_code == 401:
                    logger.error("❌ SendGrid 401: Invalid API key")
                    return False
                    
                elif response.status_code == 403:
                    error_body = response.body.decode('utf-8') if response.body else "No details"
                    logger.error(f"❌ SendGrid 403 Forbidden: {error_body}")
                    logger.error("")
                    logger.error("🔧 SENDER EMAIL NOT VERIFIED IN SENDGRID!")
                    logger.error(f"   Verify: {from_email}")
                    logger.error("   Go to: https://app.sendgrid.com/settings/sender_auth")
                    logger.error("")
                    return False
                    
                else:
                    error_body = response.body.decode('utf-8') if response.body else "Unknown error"
                    logger.error(f"❌ SendGrid Error {response.status_code}: {error_body}")
                    return False
                    
            finally:
                socket.setdefaulttimeout(original_timeout)
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ SendGrid API Exception: {error_msg}")
            return False
    
    @staticmethod
    def _send_via_smtp(to_email, subject, text_content, html_content, from_email, reply_to=None):
        """
        Send email using SMTP with timeout protection
        Uses original SMTP settings (Gmail) as fallback when SendGrid fails
        """
        try:
            # Use original SMTP settings (Gmail) instead of overridden SendGrid SMTP
            smtp_host = getattr(settings, 'SMTP_HOST_ORIGINAL', None) or settings.EMAIL_HOST
            smtp_port = getattr(settings, 'SMTP_PORT_ORIGINAL', 587)
            smtp_user = getattr(settings, 'SMTP_USER_ORIGINAL', None) or settings.EMAIL_HOST_USER
            smtp_password = getattr(settings, 'SMTP_PASSWORD_ORIGINAL', None) or settings.EMAIL_HOST_PASSWORD
            smtp_use_tls = getattr(settings, 'SMTP_USE_TLS_ORIGINAL', True)
            
            # Check if we have valid SMTP configuration
            if not smtp_host or not smtp_user or not smtp_password:
                logger.error("❌ No valid SMTP configuration available for fallback")
                logger.error(f"   SMTP Host: {smtp_host or 'NOT SET'}")
                logger.error(f"   SMTP User: {smtp_user or 'NOT SET'}")
                return False
            
            logger.info(f"   SMTP Host: {smtp_host}")
            logger.info(f"   SMTP User: {smtp_user}")
            
            # Use sender email that matches SMTP credentials for better deliverability
            actual_from = smtp_user if smtp_user else from_email
            
            # Create custom SMTP connection with explicit settings
            from django.core.mail import get_connection
            connection = get_connection(
                host=smtp_host,
                port=smtp_port,
                username=smtp_user,
                password=smtp_password,
                use_tls=smtp_use_tls,
                use_ssl=False,
                timeout=15  # 15 second timeout
            )
            
            # Create email message
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=actual_from,
                to=[to_email],
                reply_to=[reply_to or actual_from],
                connection=connection
            )
            
            if html_content:
                email.attach_alternative(html_content, "text/html")
            
            email.send(fail_silently=False)
            
            logger.info(f"✅ Email sent via SMTP ({smtp_host}) to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ SMTP sending failed: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    @staticmethod
    def test_email_configuration():
        """
        Test email configuration and return status
        """
        status_report = {
            'debug_mode': settings.DEBUG,
            'sendgrid_api_available': False,
            'sendgrid_api_valid': False,
            'smtp_configured': False,
            'email_backend': settings.EMAIL_BACKEND,
            'recommended_method': None,
            'issues': [],
            'from_email': settings.DEFAULT_FROM_EMAIL
        }
        
        # Check SendGrid API
        sendgrid_key = getattr(settings, 'SENDGRID_API_KEY', '').strip()
        if sendgrid_key:
            status_report['sendgrid_api_available'] = True
            
            if sendgrid_key.startswith('SG.') and len(sendgrid_key) > 20:
                status_report['sendgrid_api_valid'] = True
                if not settings.DEBUG:
                    status_report['recommended_method'] = 'SendGrid API'
            else:
                status_report['issues'].append(
                    "SendGrid API key format invalid"
                )
        
        # Check SMTP
        if settings.EMAIL_HOST and settings.EMAIL_PORT:
            status_report['smtp_configured'] = True
            if not status_report['recommended_method']:
                status_report['recommended_method'] = 'SMTP'
        
        # Development mode
        if settings.DEBUG:
            status_report['recommended_method'] = 'Console (Development)'
        
        # Overall recommendation
        if not status_report['recommended_method']:
            status_report['recommended_method'] = 'NONE - Email not configured'
            status_report['issues'].append("No email method available")
        
        # Log status
        logger.info("=" * 60)
        logger.info("📧 EMAIL CONFIGURATION STATUS")
        logger.info(f"   Debug Mode: {status_report['debug_mode']}")
        logger.info(f"   Backend: {status_report['email_backend']}")
        logger.info(f"   From Email: {status_report['from_email']}")
        logger.info(f"   SendGrid API: {'✅ Available' if status_report['sendgrid_api_available'] else '❌ Not Available'}")
        logger.info(f"   SMTP: {'✅ Configured' if status_report['smtp_configured'] else '❌ Not Configured'}")
        logger.info(f"   Recommended: {status_report['recommended_method']}")
        
        if status_report['issues']:
            logger.warning("   Issues:")
            for issue in status_report['issues']:
                logger.warning(f"   - {issue}")
        
        logger.info("=" * 60)
        
        return status_report