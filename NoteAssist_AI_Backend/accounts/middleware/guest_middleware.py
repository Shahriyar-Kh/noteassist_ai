"""
Guest User Middleware
Manages guest session initialization and cleanup
"""
from accounts.guest_manager import GuestSessionManager


class GuestSessionMiddleware:
    """
    Middleware to handle guest user sessions.
    Ensures guest sessions are properly initialized and maintained.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Process request
        response = self.get_response(request)
        return response
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """
        Process view to handle guest session logic.
        If user logs in, clear guest session.
        """
        # If user is authenticated and has a guest session, clear it
        if hasattr(request, 'user') and request.user.is_authenticated:
            if GuestSessionManager.is_guest(request):
                GuestSessionManager.clear_guest_session(request)
        
        return None
