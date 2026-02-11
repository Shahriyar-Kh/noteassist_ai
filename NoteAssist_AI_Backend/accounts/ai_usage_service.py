# FILE: accounts/ai_usage_service.py
# Comprehensive AI Usage Tracking Service
# ============================================================================

from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)


class AIUsageService:
    """
    Service to track and enforce AI usage limits per user
    Handles daily/monthly resets and feature-specific tracking
    """
    
    # Plan-based default limits
    PLAN_LIMITS = {
        'free': {
            'daily_limit': 10,
            'monthly_limit': 100,
        },
        'pro': {
            'daily_limit': 50,
            'monthly_limit': 1000,
        },
        'enterprise': {
            'daily_limit': 0,  # 0 = unlimited
            'monthly_limit': 0,  # 0 = unlimited
        },
    }
    
    # Feature type mapping
    FEATURE_TYPES = {
        'generate': 'generate_topic_count',
        'generate_topic': 'generate_topic_count',
        'improve': 'improve_count',
        'summarize': 'summarize_count',
        'code': 'generate_code_count',
        'generate_code': 'generate_code_count',
    }
    
    @staticmethod
    def check_user_can_use_ai(user, feature_type=None):
        """
        Check if user can make an AI request
        Returns: (can_use: bool, reason: str)
        """
        # Check if user is blocked
        if user.is_blocked:
            return False, f"Your account has been blocked. Reason: {user.blocked_reason or 'Policy violation'}. Contact support at {settings.DEFAULT_FROM_EMAIL}"
        
        # Check feature-specific access
        if feature_type:
            feature_permission = AIUsageService._get_feature_permission(feature_type)
            if feature_permission and not getattr(user, feature_permission, True):
                return False, f"You don't have access to the {feature_type} feature. Please upgrade your plan or contact support."
        
        # Reset counters if needed
        AIUsageService._reset_counters_if_needed(user)
        
        # Check daily limit (0 = unlimited)
        if user.daily_ai_limit > 0 and user.daily_ai_requests >= user.daily_ai_limit:
            return False, f"Daily AI limit reached ({user.daily_ai_limit} requests). Resets at midnight. Upgrade for more requests."
        
        # Check monthly limit (0 = unlimited)
        if user.monthly_ai_limit > 0 and user.monthly_ai_requests >= user.monthly_ai_limit:
            return False, f"Monthly AI limit reached ({user.monthly_ai_limit} requests). Upgrade for more requests."
        
        return True, "OK"
    
    @staticmethod
    def increment_usage(user, feature_type):
        """
        Increment AI usage counters for a user
        
        Args:
            user: User instance
            feature_type: Type of AI feature used (generate, improve, summarize, code)
        """
        # Reset counters if needed
        AIUsageService._reset_counters_if_needed(user)
        
        # Increment global counters
        user.total_ai_requests += 1
        user.daily_ai_requests += 1
        user.monthly_ai_requests += 1
        user.last_ai_request_date = date.today()
        
        # Increment feature-specific counter
        feature_field = AIUsageService.FEATURE_TYPES.get(feature_type)
        if feature_field:
            current_count = getattr(user, feature_field, 0)
            setattr(user, feature_field, current_count + 1)
        
        user.save(update_fields=[
            'total_ai_requests',
            'daily_ai_requests',
            'monthly_ai_requests',
            'last_ai_request_date',
            feature_field,
        ] if feature_field else [
            'total_ai_requests',
            'daily_ai_requests',
            'monthly_ai_requests',
            'last_ai_request_date',
        ])
        
        logger.info(
            f"AI usage incremented for {user.email}: "
            f"feature={feature_type}, "
            f"daily={user.daily_ai_requests}/{user.daily_ai_limit}, "
            f"monthly={user.monthly_ai_requests}/{user.monthly_ai_limit}"
        )
    
    @staticmethod
    def _reset_counters_if_needed(user):
        """Reset daily/monthly counters if time period has passed"""
        today = date.today()
        
        # Reset daily counter if it's a new day
        if user.last_ai_request_date and user.last_ai_request_date < today:
            user.daily_ai_requests = 0
            user.last_ai_request_date = today
            user.save(update_fields=['daily_ai_requests', 'last_ai_request_date'])
            logger.info(f"Daily AI counter reset for {user.email}")
        
        # Reset monthly counter if it's a new month
        if user.last_monthly_reset:
            # Check if we're in a new month
            if (today.year > user.last_monthly_reset.year or 
                (today.year == user.last_monthly_reset.year and today.month > user.last_monthly_reset.month)):
                user.monthly_ai_requests = 0
                user.last_monthly_reset = today
                user.save(update_fields=['monthly_ai_requests', 'last_monthly_reset'])
                logger.info(f"Monthly AI counter reset for {user.email}")
        else:
            # Initialize monthly reset date
            user.last_monthly_reset = today
            user.save(update_fields=['last_monthly_reset'])
    
    @staticmethod
    def get_usage_stats(user):
        """
        Get comprehensive usage statistics for a user
        
        Returns:
            dict with usage stats
        """
        AIUsageService._reset_counters_if_needed(user)
        
        return {
            'plan_type': user.plan_type,
            'is_blocked': user.is_blocked,
            'blocked_reason': user.blocked_reason if user.is_blocked else None,
            
            # Limits
            'daily_limit': user.daily_ai_limit,
            'monthly_limit': user.monthly_ai_limit,
            'is_unlimited': user.daily_ai_limit == 0 and user.monthly_ai_limit == 0,
            
            # Current usage
            'daily_used': user.daily_ai_requests,
            'monthly_used': user.monthly_ai_requests,
            'total_used': user.total_ai_requests,
            
            # Remaining
            'daily_remaining': max(0, user.daily_ai_limit - user.daily_ai_requests) if user.daily_ai_limit > 0 else 'Unlimited',
            'monthly_remaining': max(0, user.monthly_ai_limit - user.monthly_ai_requests) if user.monthly_ai_limit > 0 else 'Unlimited',
            
            # Feature-specific usage
            'by_feature': {
                'generate_topic': user.generate_topic_count,
                'improve': user.improve_count,
                'summarize': user.summarize_count,
                'generate_code': user.generate_code_count,
            },
            
            # Feature access permissions
            'feature_access': {
                'generate_topic': user.can_generate_topic,
                'improve': user.can_improve,
                'summarize': user.can_summarize,
                'generate_code': user.can_generate_code,
                'export_pdf': user.can_export_pdf,
                'google_drive': user.can_use_google_drive,
            },
            
            # Reset dates
            'last_request_date': user.last_ai_request_date,
            'last_monthly_reset': user.last_monthly_reset,
            'next_daily_reset': 'Midnight',
            'next_monthly_reset': (user.last_monthly_reset + timedelta(days=30)).strftime('%Y-%m-%d') if user.last_monthly_reset else 'Unknown',
        }
    
    @staticmethod
    def apply_plan_limits(user, plan_type):
        """
        Apply default limits based on plan type
        
        Args:
            user: User instance
            plan_type: 'free', 'pro', or 'enterprise'
        """
        if plan_type not in AIUsageService.PLAN_LIMITS:
            logger.error(f"Invalid plan type: {plan_type}")
            return
        
        limits = AIUsageService.PLAN_LIMITS[plan_type]
        user.plan_type = plan_type
        user.daily_ai_limit = limits['daily_limit']
        user.monthly_ai_limit = limits['monthly_limit']
        user.save(update_fields=['plan_type', 'daily_ai_limit', 'monthly_ai_limit'])
        
        logger.info(f"Applied {plan_type} plan limits to {user.email}")
    
    @staticmethod
    def block_user(user, reason, blocked_by_email):
        """
        Block a user and send notification email
        
        Args:
            user: User instance
            reason: Reason for blocking
            blocked_by_email: Email of admin who blocked the user
        """
        user.is_blocked = True
        user.blocked_reason = reason
        user.blocked_at = timezone.now()
        user.blocked_by = blocked_by_email
        user.save(update_fields=['is_blocked', 'blocked_reason', 'blocked_at', 'blocked_by'])
        
        # Send notification email
        try:
            subject = '⚠️ Your NoteAssist AI Account Has Been Blocked'
            message = f"""Dear {user.full_name or user.email},

Your NoteAssist AI account has been temporarily blocked by our administration team.

Reason: {reason}

If you believe this is a mistake or would like to discuss this matter, please contact our support team:
📧 Support Email: shahriyarkhanpk3@gmail.com

Your account details:
• Email: {user.email}
• Blocked on: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}
• Blocked by: {blocked_by_email}

Thank you for your understanding.

Best regards,
NoteAssist AI Team
"""
            
            from_email = getattr(settings, 'SENDGRID_FROM_EMAIL', None) or settings.DEFAULT_FROM_EMAIL
            
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            logger.info(f"Block notification email sent to {user.email}")
            
        except Exception as e:
            logger.error(f"Failed to send block notification email to {user.email}: {str(e)}")
    
    @staticmethod
    def unblock_user(user):
        """
        Unblock a user
        
        Args:
            user: User instance
        """
        user.is_blocked = False
        user.blocked_reason = ''
        user.blocked_at = None
        user.blocked_by = None
        user.save(update_fields=['is_blocked', 'blocked_reason', 'blocked_at', 'blocked_by'])
        
        logger.info(f"User unblocked: {user.email}")
        
        # Send notification email
        try:
            subject = '✅ Your NoteAssist AI Account Has Been Unblocked'
            message = f"""Dear {user.full_name or user.email},

Good news! Your NoteAssist AI account has been unblocked.

You can now log in and use all features according to your plan.

If you have any questions, please contact us:
📧 Support Email: shahriyarkhanpk3@gmail.com

Thank you for your patience.

Best regards,
NoteAssist AI Team
"""
            
            from_email = getattr(settings, 'SENDGRID_FROM_EMAIL', None) or settings.DEFAULT_FROM_EMAIL
            
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            logger.info(f"Unblock notification email sent to {user.email}")
            
        except Exception as e:
            logger.error(f"Failed to send unblock notification email to {user.email}: {str(e)}")
    
    @staticmethod
    def _get_feature_permission(feature_type):
        """Get the permission field name for a feature type"""
        feature_permissions = {
            'generate': 'can_generate_topic',
            'generate_topic': 'can_generate_topic',
            'improve': 'can_improve',
            'summarize': 'can_summarize',
            'code': 'can_generate_code',
            'generate_code': 'can_generate_code',
        }
        return feature_permissions.get(feature_type)