# FILE: accounts/permissions.py
# ============================================================================

from rest_framework import permissions


class IsAuthenticatedUser(permissions.BasePermission):
    """
    ✅ Custom permission to require user authentication.
    Blocks guest sessions and unauthenticated requests.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if it's a guest session (guest middleware sets is_guest attribute)
        if hasattr(request.user, 'is_guest') and request.user.is_guest:
            return False
        
        # Allow authenticated, non-guest users
        return True


class IsAuthenticatedForMutations(permissions.BasePermission):
    """
    ✅ Authentication required for mutations (POST, PUT, DELETE)
    Allows GET requests without authentication, but requires auth for write operations.
    
    Usage:
    - Allows GET (list, retrieve) without authentication
    - Blocks POST, PUT, DELETE without authentication
    - Shows user-friendly error message
    """
    
    message = 'Authentication required to perform this action. Please login or register to continue.'
    
    def has_permission(self, request, view):
        # Allow GET, HEAD, OPTIONS requests without authentication
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For POST, PUT, DELETE - require authentication
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Block guest sessions from mutations
        if hasattr(request.user, 'is_guest') and request.user.is_guest:
            return False
        
        return True


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admin users to access it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Admin users have full access
        if request.user.role == 'admin' or request.user.is_staff or request.user.is_superuser:
            return True
        
        # Check if object has 'user' attribute and matches request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Check if object IS the user
        return obj == request.user


class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to only allow admin users.
    Checks if user has 'admin' role, is_staff, or is_superuser.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (
                request.user.role == 'admin' or 
                request.user.is_staff or 
                request.user.is_superuser
            )
        )


class IsStudentUser(permissions.BasePermission):
    """
    Custom permission to only allow student users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'student'
        )