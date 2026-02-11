# FILE: accounts/middleware/blocking_middleware.py
# Middleware to check and enforce user blocking
# ============================================================================

from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
import logging

logger = logging.getLogger(__name__)


class UserBlockingMiddleware(MiddlewareMixin):
    """
    Middleware to check if user is blocked and prevent access
    Applied to all authenticated API requests
    """
    
    def process_request(self, request):
        """
        Check if authenticated user is blocked
        """
        # Skip for non-API routes
        if not request.path.startswith('/api/'):
            return None
        
        # Skip for auth endpoints (login, register, etc.)
        if any(endpoint in request.path for endpoint in ['/api/token/', '/api/auth/register/', '/api/auth/google_auth/']):
            return None
        
        # Check if user is authenticated
        if hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
            
            # Check if user is blocked
            if hasattr(user, 'is_blocked') and user.is_blocked:
                logger.warning(f"Blocked user attempted access: {user.email}")
                
                return JsonResponse({
                    'error': 'Account Blocked',
                    'message': f'Your account has been blocked. Reason: {user.block_reason or "Policy violation"}',
                    'support_email': 'shahriyarkhanpk3@gmail.com',
                    'blocked_at': user.blocked_at.isoformat() if user.blocked_at else None,
                    'is_blocked': True,
                }, status=403)
        
        return None


class JWTBlockedUserMiddleware:
    """
    Custom JWT authentication that checks for blocked users
    Use this in place of standard JWTAuthentication
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_auth = JWTAuthentication()
    
    def __call__(self, request):
        # Try to authenticate with JWT
        try:
            auth_result = self.jwt_auth.authenticate(request)
            if auth_result:
                user, token = auth_result
                request.user = user
                request.auth = token
                
                # Check if user is blocked
                if hasattr(user, 'is_blocked') and user.is_blocked:
                    return JsonResponse({
                        'error': 'Account Blocked',
                        'message': f'Your account has been blocked. Reason: {user.block_reason or "Policy violation"}',
                        'support_email': 'shahriyarkhanpk3@gmail.com',
                        'is_blocked': True,
                    }, status=403)
        except AuthenticationFailed:
            pass
        
        response = self.get_response(request)
        return response