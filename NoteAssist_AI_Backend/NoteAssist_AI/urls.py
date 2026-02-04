from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import EmailTokenObtainPairView
from django.http import JsonResponse


def api_root(request):
    """API root endpoint with available routes"""
    return JsonResponse({
        "message": "NoteAssist AI API is running!",
        "version": "1.0.0",
        "endpoints": {
            "admin": "/admin/",
            "token_obtain": "/api/token/",
            "token_refresh": "/api/token/refresh/",
            "auth": "/api/auth/",
            "profile": "/api/profile/",
            "dashboard": "/api/dashboard/",
            "notes": "/api/",
            "ai_tools": "/api/ai-tools/",
            "admin_analytics": "/api/admin/analytics/",
        }
    })


urlpatterns = [
    # Root URL
    path('', api_root, name='api_root'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # JWT Auth endpoints
    path('api/token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # App URLs
    path('api/auth/', include('accounts.urls')),
    path('api/profile/', include('profiles.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/ai-tools/', include('ai_tools.urls')),
    path('api/admin/analytics/', include('admin_analytics.urls')),
    path('api/', include('notes.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)