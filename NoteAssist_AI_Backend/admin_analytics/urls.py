from django.urls import path

from .views import AdminAnalyticsViewSet

urlpatterns = [
    path('overview/', AdminAnalyticsViewSet.as_view({'get': 'overview'}), name='admin-analytics-overview'),
    path('users/', AdminAnalyticsViewSet.as_view({'get': 'users'}), name='admin-analytics-users'),
    path('ai-analytics/', AdminAnalyticsViewSet.as_view({'get': 'ai_analytics'}), name='admin-analytics-ai-analytics'),
    path('refresh/', AdminAnalyticsViewSet.as_view({'post': 'refresh'}), name='admin-analytics-refresh'),

    # Frontend compatibility
    path('user_metrics/', AdminAnalyticsViewSet.as_view({'get': 'user_metrics'}), name='admin-analytics-user-metrics'),
    path('ai_metrics/', AdminAnalyticsViewSet.as_view({'get': 'ai_metrics'}), name='admin-analytics-ai-metrics'),
]
