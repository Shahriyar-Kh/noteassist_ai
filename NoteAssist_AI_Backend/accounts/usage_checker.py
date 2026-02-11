# FILE: accounts/usage_checker.py
# Centralized AI usage limit checker for all AI tools
# ============================================================================

from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from accounts.models import UserPlan
import logging

logger = logging.getLogger(__name__)


class AIUsageLimitChecker:
    """
    Centralized AI usage limit checker for all AI tools.
    Checks user plan limits before allowing AI requests.
    """
    
    @staticmethod
    def check_and_increment(user, tool_type='generate'):
        """
        Check if user can make an AI request and increment usage if allowed.
        
        Args:
            user: User object
            tool_type: Type of AI tool (generate, improve, summarize, code)
        
        Returns:
            dict: Status information
        
        Raises:
            ValidationError: If limit exceeded or access denied
        """
        try:
            user_plan = user.plan
        except UserPlan.DoesNotExist:
            # Create default plan
            user_plan = UserPlan.objects.create(user=user)
        
        # Check if user is blocked
        if user_plan.is_blocked:
            raise ValidationError({
                'error': 'Account Blocked',
                'message': f'Your account has been blocked. Reason: {user_plan.blocked_reason or "No reason provided"}. Please contact support at shahriyarkhanpk3@gmail.com',
                'blocked': True,
                'blocked_reason': user_plan.blocked_reason,
                'contact_email': 'shahriyarkhanpk3@gmail.com'
            })
        
        # Check if AI tools are enabled for this user
        if not user_plan.can_use_ai_tools:
            raise ValidationError({
                'error': 'AI Tools Disabled',
                'message': 'AI tools have been disabled for your account. Please contact support at shahriyarkhanpk3@gmail.com or upgrade your plan.',
                'ai_tools_disabled': True,
                'contact_email': 'shahriyarkhanpk3@gmail.com'
            })
        
        # Check if user can make AI request (resets counters if needed)
        if not user_plan.can_make_ai_request():
            remaining = user_plan.get_remaining_requests()
            
            # Determine which limit was exceeded
            limit_type = None
            if remaining['daily'] == 0:
                limit_type = 'daily'
            elif remaining['weekly'] == 0:
                limit_type = 'weekly'
            elif remaining['monthly'] == 0:
                limit_type = 'monthly'
            
            raise ValidationError({
                'error': 'AI Usage Limit Reached',
                'message': f'Your {limit_type} AI usage limit has been reached. Please upgrade your plan or contact admin at shahriyarkhanpk3@gmail.com for assistance.',
                'limit_reached': True,
                'limit_type': limit_type,
                'remaining': remaining,
                'current_plan': user_plan.plan_type,
                'limits': {
                    'daily': user_plan.daily_ai_limit,
                    'weekly': user_plan.weekly_ai_limit,
                    'monthly': user_plan.monthly_ai_limit
                },
                'usage': {
                    'daily': user_plan.ai_requests_today,
                    'weekly': user_plan.ai_requests_week,
                    'monthly': user_plan.ai_requests_month
                },
                'contact_email': 'shahriyarkhanpk3@gmail.com'
            })
        
        # Increment usage
        user_plan.increment_ai_usage()
        
        remaining = user_plan.get_remaining_requests()
        
        return {
            'success': True,
            'remaining': remaining,
            'usage': {
                'daily': user_plan.ai_requests_today,
                'weekly': user_plan.ai_requests_week,
                'monthly': user_plan.ai_requests_month
            }
        }
    
    @staticmethod
    def get_usage_stats(user):
        """Get current usage statistics for a user."""
        try:
            user_plan = user.plan
        except UserPlan.DoesNotExist:
            user_plan = UserPlan.objects.create(user=user)
        
        # Ensure counters are up to date
        user_plan.reset_daily_usage()
        user_plan.reset_weekly_usage()
        user_plan.reset_monthly_usage()
        
        return {
            'limits': {
                'daily': user_plan.daily_ai_limit,
                'weekly': user_plan.weekly_ai_limit,
                'monthly': user_plan.monthly_ai_limit
            },
            'usage': {
                'daily': user_plan.ai_requests_today,
                'weekly': user_plan.ai_requests_week,
                'monthly': user_plan.ai_requests_month
            },
            'remaining': user_plan.get_remaining_requests(),
            'can_use': user_plan.can_make_ai_request(),
            'is_blocked': user_plan.is_blocked,
            'can_use_ai_tools': user_plan.can_use_ai_tools
        }