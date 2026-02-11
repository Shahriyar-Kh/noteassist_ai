# FILE: sendgrid_service.py
# ============================================================================

import sendgrid
from sendgrid.helpers.mail import Mail, Content, To
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_admin_notification_email(user_email, subject, message, action_type='general'):
    """Send admin notification emails to users"""
    try:
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        
        # Email templates based on action type
        templates = {
            'block': {
                'color': '#ef4444',
                'icon': '🚫',
                'title': 'Account Blocked'
            },
            'unblock': {
                'color': '#10b981',
                'icon': '✅',
                'title': 'Account Unblocked'
            },
            'limits_changed': {
                'color': '#f59e0b',
                'icon': '⚙️',
                'title': 'Limits Updated'
            },
            'plan_changed': {
                'color': '#3b82f6',
                'icon': '🎉',
                'title': 'Plan Updated'
            },
            'access_changed': {
                'color': '#8b5cf6',
                'icon': '🔐',
                'title': 'Access Changed'
            },
            'general': {
                'color': '#6366f1',
                'icon': '📧',
                'title': 'Notification'
            }
        }
        
        template = templates.get(action_type, templates['general'])
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6; 
                    color: #374151; 
                    max-width: 600px; 
                    margin: 0 auto; 
                    padding: 20px; 
                    background: #f9fafb;
                }}
                .container {{
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }}
                .header {{ 
                    background: {template['color']};
                    color: white; 
                    padding: 40px 30px; 
                    text-align: center; 
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 700;
                }}
                .icon {{
                    font-size: 48px;
                    margin-bottom: 15px;
                }}
                .content {{ 
                    padding: 40px 30px; 
                }}
                .message {{
                    background: #f3f4f6;
                    padding: 20px;
                    border-left: 4px solid {template['color']};
                    border-radius: 4px;
                    margin: 20px 0;
                }}
                .footer {{ 
                    margin-top: 30px; 
                    padding-top: 20px; 
                    border-top: 1px solid #e5e7eb; 
                    text-align: center; 
                    color: #6b7280; 
                    font-size: 14px; 
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background: {template['color']};
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    margin-top: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icon">{template['icon']}</div>
                    <h1>{template['title']}</h1>
                </div>
                <div class="content">
                    <h2>Hello!</h2>
                    <div class="message">
                        <p style="margin: 0;"><strong>{message}</strong></p>
                    </div>
                    <p>If you have any questions or concerns, please contact our support team.</p>
                    <div style="text-align: center;">
                        <a href="{settings.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2024 NoteAssist AI. All rights reserved.</p>
                    <p>This is an automated notification from the admin panel.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        from_email = settings.DEFAULT_FROM_EMAIL
        to_emails = [To(user_email)]
        
        message = Mail(
            from_email=from_email,
            to_emails=to_emails,
            subject=subject,
            html_content=html_content
        )
        
        response = sg.send(message)
        logger.info(f"Admin notification email sent to {user_email}: {response.status_code}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to send admin notification email to {user_email}: {str(e)}")
        return False


class SendGridEmailService:
    """SendGrid specific email service"""
    
    @staticmethod
    def send_daily_report(user, report_data):
        """Send daily report via SendGrid"""
        try:
            # Initialize SendGrid client
            sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
            
            # Prepare email content
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .stats {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }}
                    .stat-box {{ background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                    .stat-number {{ font-size: 24px; font-weight: bold; margin: 10px 0; }}
                    .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📚 Daily Learning Report</h1>
                    <p>{report_data['date']}</p>
                </div>
                <div class="content">
                    <h2>Hello {user.first_name or user.username}!</h2>
                    <p>Here's your learning activity summary for today:</p>
                    
                    <div class="stats">
                        <div class="stat-box">
                            <div>Notes Created</div>
                            <div class="stat-number" style="color: #667eea;">{report_data['notes_created']}</div>
                        </div>
                        <div class="stat-box">
                            <div>Notes Updated</div>
                            <div class="stat-number" style="color: #10b981;">{report_data['notes_updated']}</div>
                        </div>
                        <div class="stat-box">
                            <div>Topics Added</div>
                            <div class="stat-number" style="color: #8b5cf6;">{report_data['topics_created']}</div>
                        </div>
                        <div class="stat-box">
                            <div>Study Time</div>
                            <div class="stat-number" style="color: #f59e0b;">{report_data['study_time_estimate']} min</div>
                        </div>
                    </div>
                    
                    <p>Keep up the great work! Your consistency is key to mastering new concepts.</p>
                    
                    <div class="footer">
                        <p>This is an automated report from NoteAssist AI.</p>
                        <p>You can adjust email preferences in your account settings.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Create SendGrid mail object
            from_email = settings.DEFAULT_FROM_EMAIL
            to_email = user.email
            subject = f'📚 Your Daily Learning Report - {report_data["date"]}'
            
            mail = Mail(
                from_email=from_email,
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            
            # Send email
            response = sg.send(mail)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"✅ SendGrid email sent successfully to {user.email}")
                return True
            else:
                logger.error(f"❌ SendGrid error: {response.status_code} - {response.body}")
                return False
                
        except Exception as e:
            logger.error(f"SendGrid email error: {str(e)}")
            return False