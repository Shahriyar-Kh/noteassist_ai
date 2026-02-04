from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Avg, Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from ai_tools.models import AIToolUsage
from notes.models import Note
from .models import SystemStatistics

User = get_user_model()


class AdminAnalyticsViewSet(viewsets.ViewSet):
    """Admin-only analytics API"""

    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        cache_key = 'admin_overview'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            stats = SystemStatistics.objects.latest()
            if (timezone.now() - stats.calculated_at) > timedelta(hours=1):
                stats = SystemStatistics.calculate()
        except SystemStatistics.DoesNotExist:
            stats = SystemStatistics.calculate()

        data = {
            'total_users': stats.total_users,
            'active_users_today': stats.active_users_today,
            'total_notes': stats.total_notes,
            'total_ai_requests': stats.total_ai_requests,
            'avg_response_time': stats.avg_response_time,
        }

        cache.set(cache_key, data, 600)
        return Response(data)

    @action(detail=False, methods=['get'])
    def users(self, request):
        users = User.objects.annotate(
            note_count=Count('notes'),
            ai_usage_count=Count('ai_tool_usages')
        ).order_by('-created_at')[:100]

        data = [
            {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'note_count': user.note_count,
                'ai_usage_count': user.ai_usage_count,
                'created_at': user.created_at,
            }
            for user in users
        ]

        return Response(data)

    @action(detail=False, methods=['get'], url_path='ai-analytics')
    def ai_analytics(self, request):
        by_type = AIToolUsage.objects.values('tool_type').annotate(
            count=Count('id'),
            avg_time=Avg('response_time')
        )

        return Response({'by_type': list(by_type)})

    @action(detail=False, methods=['post'])
    def refresh(self, request):
        try:
            stats = SystemStatistics.calculate()
            cache.delete('admin_overview')
            return Response({
                'success': True,
                'calculated_at': stats.calculated_at,
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Frontend compatibility endpoints
    @action(detail=False, methods=['get'], url_path='user_metrics')
    def user_metrics(self, request):
        return self.users(request)

    @action(detail=False, methods=['get'], url_path='ai_metrics')
    def ai_metrics(self, request):
        users = User.objects.count()
        by_type = AIToolUsage.objects.values('tool_type').annotate(
            count=Count('id'),
            avg_time=Avg('response_time')
        )
        total_usage = sum(item['count'] for item in by_type)
        return Response({
            'by_type': list(by_type),
            'total_usage': total_usage,
            'total_users': users,
        })
