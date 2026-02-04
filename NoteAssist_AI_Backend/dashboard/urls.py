from django.urls import path

from .views import DashboardViewSet

urlpatterns = [
	path('overview/', DashboardViewSet.as_view({'get': 'overview'}), name='dashboard-overview'),
	path('quick-stats/', DashboardViewSet.as_view({'get': 'quick_stats'}), name='dashboard-quick-stats'),
	path('weekly-chart/', DashboardViewSet.as_view({'get': 'weekly_chart'}), name='dashboard-weekly-chart'),
	path('ai-breakdown/', DashboardViewSet.as_view({'get': 'ai_breakdown'}), name='dashboard-ai-breakdown'),
	path('recent-activity/', DashboardViewSet.as_view({'get': 'recent_activity'}), name='dashboard-recent-activity'),
	path('recent-notes/', DashboardViewSet.as_view({'get': 'recent_notes'}), name='dashboard-recent-notes'),
	path('refresh/', DashboardViewSet.as_view({'post': 'refresh'}), name='dashboard-refresh'),

	# Legacy endpoints
	path('activity/', DashboardViewSet.as_view({'get': 'activity'}), name='dashboard-activity'),
	path('recent_notes/', DashboardViewSet.as_view({'get': 'recent_notes_legacy'}), name='dashboard-recent-notes-legacy'),
	path('ai_stats/', DashboardViewSet.as_view({'get': 'ai_stats'}), name='dashboard-ai-stats-legacy'),
]
