# FILE: admin_analytics/urls.py
# ============================================================================
# All admin analytics endpoints including user management, insights, and actions
# ============================================================================

from django.urls import path
from .views import AdminAnalyticsViewSet

urlpatterns = [
    # ----- Overview / AI analytics (existing) --------------------------------
    path('overview/',     AdminAnalyticsViewSet.as_view({'get': 'overview'}),     name='admin-overview'),
    path('users/',        AdminAnalyticsViewSet.as_view({'get': 'users'}),        name='admin-users-list'),
    path('ai-analytics/', AdminAnalyticsViewSet.as_view({'get': 'ai_analytics'}), name='admin-ai-analytics'),
    path('refresh/',      AdminAnalyticsViewSet.as_view({'post': 'refresh'}),     name='admin-refresh'),

    # ----- Legacy frontend compatibility -------------------------------------
    path('user_metrics/', AdminAnalyticsViewSet.as_view({'get': 'user_metrics'}), name='admin-user-metrics'),
    path('ai_metrics/',   AdminAnalyticsViewSet.as_view({'get': 'ai_metrics'}),   name='admin-ai-metrics'),

    # ----- User Management (new) ---------------------------------------------
    # Stats cards on the user management dashboard
    path('user_stats/',     AdminAnalyticsViewSet.as_view({'get': 'user_stats'}),     name='admin-user-stats'),
    # Insight leaderboards (?type=top_creators|ai_power_users|most_published|new_users|active_users)
    path('user_insights/',  AdminAnalyticsViewSet.as_view({'get': 'user_insights'}),  name='admin-user-insights'),
    # CSV export of user list
    path('users/export/',   AdminAnalyticsViewSet.as_view({'get': 'export_users'}),   name='admin-users-export'),

    # ----- Single-user actions -----------------------------------------------
    path('users/<int:user_id>/',            AdminAnalyticsViewSet.as_view({'get':   'user_detail'}),    name='admin-user-detail'),
    path('users/<int:user_id>/block/',      AdminAnalyticsViewSet.as_view({'post':  'block_user'}),     name='admin-user-block'),
    path('users/<int:user_id>/unblock/',    AdminAnalyticsViewSet.as_view({'post':  'unblock_user'}),   name='admin-user-unblock'),
    path('users/<int:user_id>/ai_limits/',  AdminAnalyticsViewSet.as_view({'patch': 'update_ai_limits'}), name='admin-user-ai-limits'),
    path('users/<int:user_id>/ai_access/',  AdminAnalyticsViewSet.as_view({'patch': 'toggle_ai_access'}), name='admin-user-ai-access'),
    path('users/<int:user_id>/plan/',       AdminAnalyticsViewSet.as_view({'patch': 'update_plan'}),    name='admin-user-plan'),
    path('users/<int:user_id>/send_email/', AdminAnalyticsViewSet.as_view({'post':  'send_user_email'}), name='admin-user-send-email'),
]