# FILE: accounts/urls.py - FIXED WITH ALL AUTH ROUTES
# ============================================================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthViewSet, UserViewSet, GuestSessionView
from .admin_views import AdminUserManagementViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

# Admin router
admin_router = DefaultRouter()
admin_router.register('user-management', AdminUserManagementViewSet, basename='admin-user-management')

urlpatterns = [
    # Authentication endpoints
    path('register/', AuthViewSet.as_view({'post': 'register'}), name='register'),
    path('google_auth/', AuthViewSet.as_view({'post': 'google_auth'}), name='google_auth'),
    path('logout/', AuthViewSet.as_view({'post': 'logout'}), name='logout'),
    
    # Guest session endpoints
    path('guest/session/', GuestSessionView.as_view(), name='guest_session'),
    
    # Password management
    path('request_password_reset/', AuthViewSet.as_view({'post': 'request_password_reset'}), name='request_password_reset'),
    path('reset_password/', AuthViewSet.as_view({'post': 'reset_password'}), name='reset_password'),
    
    # Email verification
    path('verify_email/', AuthViewSet.as_view({'post': 'verify_email'}), name='verify_email'),
    path('resend_verification/', AuthViewSet.as_view({'post': 'resend_verification'}), name='resend_verification'),
    
    # Admin endpoints
    path('admin/', include(admin_router.urls)),
    
    # User management routes
    path('', include(router.urls)),
]