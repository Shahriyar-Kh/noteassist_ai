import logging
from datetime import timedelta

from django.core.cache import cache
from django.db.models import Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ActivityLog, DashboardCache
from .serializers import (
    AIUsageBreakdownSerializer,
    ActivityLogSerializer,
    DashboardOverviewSerializer,
    QuickStatsSerializer,
    WeeklyChartDataSerializer,
)
from ai_tools.models import AIToolUsage
from notes.models import ChapterTopic, Note

logger = logging.getLogger(__name__)


class DashboardViewSet(viewsets.ViewSet):
    """
    User Dashboard API

    Endpoints:
    - GET /api/dashboard/overview/          - Main dashboard data
    - GET /api/dashboard/quick-stats/       - Quick stat cards
    - GET /api/dashboard/weekly-chart/      - Weekly activity chart
    - GET /api/dashboard/ai-breakdown/      - AI usage breakdown
    - GET /api/dashboard/recent-activity/   - Recent activity timeline
    - GET /api/dashboard/recent-notes/      - Recent notes
    - POST /api/dashboard/refresh/          - Force refresh cache

    Legacy endpoints kept for frontend compatibility:
    - GET /api/dashboard/activity/
    - GET /api/dashboard/recent_notes/
    - GET /api/dashboard/ai_stats/
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get complete dashboard overview. Uses caching for performance."""
        user = request.user
        cache_key = f'dashboard_overview:{user.id}'
        cached_data = cache.get(cache_key)

        if cached_data:
            logger.info("Dashboard cache hit for user %s", user.id)
            return Response(cached_data)

        dashboard, created = DashboardCache.objects.get_or_create(user=user)
        if created or dashboard.should_refresh():
            logger.info("Refreshing dashboard for user %s", user.id)
            dashboard = DashboardCache.refresh_for_user(user)

        serializer = DashboardOverviewSerializer(dashboard)
        data = serializer.data

        data.update({
            'total_ai_generations': dashboard.ai_generations,
            'current_streak': dashboard.streak_days,
            'user_name': user.first_name or user.username,
            'user_email': user.email,
        })

        cache.set(cache_key, data, 300)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='quick-stats')
    def quick_stats(self, request):
        """Quick stats for dashboard cards."""
        dashboard, _ = DashboardCache.objects.get_or_create(user=request.user)
        if dashboard.should_refresh():
            dashboard = DashboardCache.refresh_for_user(request.user)

        stats = [
            {
                'label': 'Total Notes',
                'value': dashboard.total_notes,
                'change': dashboard.notes_this_week,
                'change_type': 'increase' if dashboard.notes_this_week > 0 else 'neutral',
                'icon': 'notes',
            },
            {
                'label': 'Topics Created',
                'value': dashboard.total_topics,
                'change': dashboard.topics_this_week,
                'change_type': 'increase' if dashboard.topics_this_week > 0 else 'neutral',
                'icon': 'topics',
            },
            {
                'label': 'AI Generations',
                'value': dashboard.total_ai_requests,
                'change': dashboard.ai_requests_this_week,
                'change_type': 'increase' if dashboard.ai_requests_this_week > 0 else 'neutral',
                'icon': 'ai',
            },
            {
                'label': 'Current Streak',
                'value': dashboard.streak_days,
                'change': None,
                'change_type': 'neutral',
                'icon': 'streak',
            },
        ]

        serializer = QuickStatsSerializer(stats, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='weekly-chart')
    def weekly_chart(self, request):
        """Weekly activity data for charts (last 7 days)."""
        user = request.user
        cache_key = f'dashboard_weekly_chart:{user.id}'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        end_date = timezone.now()
        start_date = end_date - timedelta(days=6)
        daily_data = []

        for i in range(7):
            day = start_date + timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            notes_count = Note.objects.filter(
                user=user,
                created_at__gte=day_start,
                created_at__lt=day_end,
            ).count()

            topics_count = ChapterTopic.objects.filter(
                chapter__note__user=user,
                created_at__gte=day_start,
                created_at__lt=day_end,
            ).count()

            ai_count = AIToolUsage.objects.filter(
                user=user,
                created_at__gte=day_start,
                created_at__lt=day_end,
            ).count()

            daily_data.append({
                'date': day.date(),
                'notes': notes_count,
                'topics': topics_count,
                'ai_requests': ai_count,
            })

        serializer = WeeklyChartDataSerializer(daily_data, many=True)
        data = serializer.data
        cache.set(cache_key, data, 3600)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='ai-breakdown')
    def ai_breakdown(self, request):
        """AI usage breakdown by tool type."""
        user = request.user
        breakdown = AIToolUsage.objects.filter(user=user).values('tool_type').annotate(
            count=Count('id')
        ).order_by('-count')

        total = sum(item['count'] for item in breakdown)
        data = [
            {
                'tool_type': item['tool_type'],
                'count': item['count'],
                'percentage': round((item['count'] / total * 100), 1) if total > 0 else 0,
            }
            for item in breakdown
        ]

        serializer = AIUsageBreakdownSerializer(data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='recent-activity')
    def recent_activity(self, request):
        """Recent activity timeline (last 20)."""
        activities = ActivityLog.objects.filter(user=request.user).order_by('-created_at')[:20]
        serializer = ActivityLogSerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='recent-notes')
    def recent_notes(self, request):
        """Recently updated notes (last 10)."""
        notes = Note.objects.filter(user=request.user).prefetch_related(
            'chapters__topics'
        ).order_by('-updated_at')[:10]

        data = []
        for note in notes:
            topics_count = ChapterTopic.objects.filter(chapter__note=note).count()
            data.append({
                'id': note.id,
                'title': note.title,
                'slug': note.slug,
                'created_at': note.created_at,
                'updated_at': note.updated_at,
                'topics_count': topics_count,
                'subject_area': getattr(note, 'course', '') or '',
                'time_ago': ActivityLogSerializer().get_time_ago(
                    type('obj', (), {'created_at': note.updated_at})
                ) if note.updated_at else None,
            })

        return Response(data)

    @action(detail=False, methods=['post'])
    def refresh(self, request):
        """Force refresh dashboard cache."""
        try:
            dashboard = DashboardCache.refresh_for_user(request.user, force=True)
            cache_key = f'dashboard_overview:{request.user.id}'
            cache.delete(cache_key)
            serializer = DashboardOverviewSerializer(dashboard)
            return Response({
                'success': True,
                'message': 'Dashboard refreshed successfully',
                'data': serializer.data,
            })
        except Exception as e:
            logger.error("Dashboard refresh error: %s", str(e))
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Legacy endpoints for frontend compatibility
    @action(detail=False, methods=['get'], url_path='activity')
    def activity(self, request):
        activities = ActivityLog.objects.filter(user=request.user).order_by('-created_at')[:20]
        serializer = ActivityLogSerializer(activities, many=True)
        data = [
            {
                'id': item['id'],
                'action': item['description'],
                'time_ago': item['time_ago'],
            }
            for item in serializer.data
        ]
        return Response(data)

    @action(detail=False, methods=['get'], url_path='recent_notes')
    def recent_notes_legacy(self, request):
        return self.recent_notes(request)

    @action(detail=False, methods=['get'], url_path='ai_stats')
    def ai_stats(self, request):
        user = request.user
        usage_by_type = {
            'generate': AIToolUsage.objects.filter(user=user, tool_type='generate').count(),
            'improve': AIToolUsage.objects.filter(user=user, tool_type='improve').count(),
            'summarize': AIToolUsage.objects.filter(user=user, tool_type='summarize').count(),
            'code': AIToolUsage.objects.filter(user=user, tool_type='code').count(),
        }

        seven_days_ago = timezone.now() - timedelta(days=7)
        daily_trend = []
        for i in range(7):
            day = seven_days_ago.date() + timedelta(days=i)
            count = AIToolUsage.objects.filter(user=user, created_at__date=day).count()
            daily_trend.append({'date': day.isoformat(), 'count': count})

        return Response({
            'usage_by_type': usage_by_type,
            'daily_trend': daily_trend,
            'total_usage': sum(usage_by_type.values()),
        })
