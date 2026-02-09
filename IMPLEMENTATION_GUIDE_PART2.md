# Implementation Guide Part 2 - Dashboard, Admin & Integration

## 📊 Phase 2: Dashboard Module (Days 5-7)

### 1. Dashboard App Structure

```bash
# Create dashboard app
python manage.py startapp dashboard

# Directory structure
dashboard/
├── __init__.py
├── admin.py
├── apps.py
├── models.py
├── serializers.py
├── views.py
├── services.py
├── tasks.py
├── urls.py
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_views.py
│   └── test_services.py
└── migrations/
    └── __init__.py
```

### 2. Dashboard Models

```python
# dashboard/models.py

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models import Count, Sum, Avg, Max
from datetime import timedelta

class DashboardCache(models.Model):
    """
    Cache dashboard statistics to avoid repeated queries
    Refreshed every 5 minutes or on user activity
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dashboard_cache',
        primary_key=True
    )
    
    # Content Statistics
    total_notes = models.IntegerField(default=0)
    total_chapters = models.IntegerField(default=0)
    total_topics = models.IntegerField(default=0)
    published_notes = models.IntegerField(default=0)
    draft_notes = models.IntegerField(default=0)
    
    # AI Usage Statistics
    ai_generations = models.IntegerField(default=0)
    ai_improvements = models.IntegerField(default=0)
    ai_summarizations = models.IntegerField(default=0)
    ai_code_generations = models.IntegerField(default=0)
    total_ai_requests = models.IntegerField(default=0)
    total_tokens_used = models.BigIntegerField(default=0)
    
    # Weekly Activity
    notes_this_week = models.IntegerField(default=0)
    topics_this_week = models.IntegerField(default=0)
    ai_requests_this_week = models.IntegerField(default=0)
    
    # Engagement Metrics
    last_activity_at = models.DateTimeField(null=True, blank=True)
    streak_days = models.IntegerField(default=0)
    total_active_days = models.IntegerField(default=0)
    
    # Google Drive Integration
    drive_connected = models.BooleanField(default=False)
    total_drive_uploads = models.IntegerField(default=0)
    
    # Cache Metadata
    last_refreshed_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'dashboard_cache'
        indexes = [
            models.Index(fields=['last_refreshed_at'], name='dash_refreshed_idx'),
        ]
    
    @classmethod
    def refresh_for_user(cls, user, force=False):
        """
        Refresh dashboard cache for a user
        
        Args:
            user: User instance
            force: Force refresh even if recently updated
        
        Returns:
            DashboardCache instance
        """
        from notes.models import Note, Chapter, ChapterTopic
        from ai_tools.models import AIToolUsage
        
        # Get or create cache
        cache, created = cls.objects.get_or_create(user=user)
        
        # Skip if recently updated (unless forced)
        if not force and not created:
            time_since_update = timezone.now() - cache.last_refreshed_at
            if time_since_update < timedelta(minutes=5):
                return cache
        
        # Calculate date ranges
        week_ago = timezone.now() - timedelta(days=7)
        
        # Note statistics
        notes_qs = Note.objects.filter(user=user)
        cache.total_notes = notes_qs.count()
        cache.published_notes = notes_qs.filter(status='published').count()
        cache.draft_notes = notes_qs.filter(status='draft').count()
        cache.notes_this_week = notes_qs.filter(created_at__gte=week_ago).count()
        
        # Chapter statistics
        cache.total_chapters = Chapter.objects.filter(note__user=user).count()
        
        # Topic statistics
        topics_qs = ChapterTopic.objects.filter(chapter__note__user=user)
        cache.total_topics = topics_qs.count()
        cache.topics_this_week = topics_qs.filter(created_at__gte=week_ago).count()
        
        # AI Usage statistics
        ai_usage_qs = AIToolUsage.objects.filter(user=user)
        
        # Count by tool type
        ai_by_type = ai_usage_qs.values('tool_type').annotate(count=Count('id'))
        ai_type_counts = {item['tool_type']: item['count'] for item in ai_by_type}
        
        cache.ai_generations = ai_type_counts.get('generate', 0)
        cache.ai_improvements = ai_type_counts.get('improve', 0)
        cache.ai_summarizations = ai_type_counts.get('summarize', 0)
        cache.ai_code_generations = ai_type_counts.get('code', 0)
        
        # Total AI usage
        ai_totals = ai_usage_qs.aggregate(
            total=Count('id'),
            total_tokens=Sum('tokens_used')
        )
        cache.total_ai_requests = ai_totals['total'] or 0
        cache.total_tokens_used = ai_totals['total_tokens'] or 0
        cache.ai_requests_this_week = ai_usage_qs.filter(created_at__gte=week_ago).count()
        
        # Activity tracking
        latest_note = notes_qs.order_by('-updated_at').first()
        cache.last_activity_at = latest_note.updated_at if latest_note else user.created_at
        
        # Calculate streak
        cache.streak_days = cls._calculate_streak(user)
        cache.total_active_days = cls._calculate_total_active_days(user)
        
        # Google Drive status
        cache.drive_connected = cls._check_drive_connected(user)
        cache.total_drive_uploads = notes_qs.filter(drive_file_id__isnull=False).count()
        
        cache.save()
        
        return cache
    
    @staticmethod
    def _calculate_streak(user):
        """Calculate current streak of consecutive active days"""
        from notes.models import Note, ChapterTopic
        from django.db.models.functions import TruncDate
        
        # Get all unique active dates (notes or topics created/updated)
        note_dates = Note.objects.filter(user=user).annotate(
            date=TruncDate('updated_at')
        ).values_list('date', flat=True).distinct()
        
        topic_dates = ChapterTopic.objects.filter(
            chapter__note__user=user
        ).annotate(
            date=TruncDate('updated_at')
        ).values_list('date', flat=True).distinct()
        
        # Combine and sort dates
        all_dates = sorted(set(list(note_dates) + list(topic_dates)), reverse=True)
        
        if not all_dates:
            return 0
        
        # Calculate streak from today backwards
        today = timezone.now().date()
        streak = 0
        expected_date = today
        
        for date in all_dates:
            if date == expected_date:
                streak += 1
                expected_date -= timedelta(days=1)
            elif date < expected_date:
                # Gap in dates, streak broken
                break
        
        return streak
    
    @staticmethod
    def _calculate_total_active_days(user):
        """Calculate total unique days with activity"""
        from notes.models import Note, ChapterTopic
        from django.db.models.functions import TruncDate
        
        note_dates = Note.objects.filter(user=user).annotate(
            date=TruncDate('updated_at')
        ).values_list('date', flat=True).distinct()
        
        topic_dates = ChapterTopic.objects.filter(
            chapter__note__user=user
        ).annotate(
            date=TruncDate('updated_at')
        ).values_list('date', flat=True).distinct()
        
        unique_dates = set(list(note_dates) + list(topic_dates))
        return len(unique_dates)
    
    @staticmethod
    def _check_drive_connected(user):
        """Check if user has Google Drive connected"""
        import os
        from django.conf import settings
        
        token_path = os.path.join(
            settings.MEDIA_ROOT,
            'google_tokens',
            f'token_{user.id}.pickle'
        )
        return os.path.exists(token_path)
    
    def should_refresh(self):
        """Check if cache should be refreshed (older than 5 minutes)"""
        if not self.last_refreshed_at:
            return True
        
        age = timezone.now() - self.last_refreshed_at
        return age > timedelta(minutes=5)


class ActivityLog(models.Model):
    """
    Track user activity for dashboard timeline
    """
    
    ACTIVITY_TYPES = (
        ('note_created', 'Note Created'),
        ('note_updated', 'Note Updated'),
        ('note_published', 'Note Published'),
        ('topic_created', 'Topic Created'),
        ('ai_generated', 'AI Content Generated'),
        ('ai_improved', 'Content Improved with AI'),
        ('drive_uploaded', 'Uploaded to Drive'),
        ('pdf_exported', 'PDF Exported'),
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES, db_index=True)
    description = models.CharField(max_length=500)
    
    # Related objects (optional)
    note_id = models.IntegerField(null=True, blank=True)
    note_title = models.CharField(max_length=500, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='activity_user_created_idx'),
            models.Index(fields=['activity_type', '-created_at'], name='activity_type_created_idx'),
        ]
    
    @classmethod
    def log_activity(cls, user, activity_type, description, note=None, **metadata):
        """
        Helper method to create activity log
        
        Args:
            user: User instance
            activity_type: Type of activity
            description: Human-readable description
            note: Optional Note instance
            **metadata: Additional metadata
        """
        return cls.objects.create(
            user=user,
            activity_type=activity_type,
            description=description,
            note_id=note.id if note else None,
            note_title=note.title if note else '',
            metadata=metadata
        )
    
    def __str__(self):
        return f"{self.user.email} - {self.get_activity_type_display()}"
```

### 3. Dashboard Serializers

```python
# dashboard/serializers.py

from rest_framework import serializers
from .models import DashboardCache, ActivityLog

class DashboardOverviewSerializer(serializers.ModelSerializer):
    """Main dashboard overview statistics"""
    
    # Computed fields
    total_content_items = serializers.SerializerMethodField()
    ai_usage_percentage = serializers.SerializerMethodField()
    week_over_week_growth = serializers.SerializerMethodField()
    
    class Meta:
        model = DashboardCache
        fields = [
            # Content stats
            'total_notes', 'total_chapters', 'total_topics',
            'published_notes', 'draft_notes', 'total_content_items',
            
            # AI stats
            'ai_generations', 'ai_improvements', 'ai_summarizations',
            'ai_code_generations', 'total_ai_requests', 'total_tokens_used',
            'ai_usage_percentage',
            
            # Weekly activity
            'notes_this_week', 'topics_this_week', 'ai_requests_this_week',
            'week_over_week_growth',
            
            # Engagement
            'last_activity_at', 'streak_days', 'total_active_days',
            
            # Integrations
            'drive_connected', 'total_drive_uploads',
            
            # Meta
            'last_refreshed_at',
        ]
    
    def get_total_content_items(self, obj):
        """Total content items (notes + chapters + topics)"""
        return obj.total_notes + obj.total_chapters + obj.total_topics
    
    def get_ai_usage_percentage(self, obj):
        """Calculate what percentage of topics used AI"""
        if obj.total_topics == 0:
            return 0
        # Rough estimate: if user generated content with AI, likely used on topics
        return min(100, round((obj.total_ai_requests / obj.total_topics) * 100, 1))
    
    def get_week_over_week_growth(self, obj):
        """Calculate growth compared to previous week"""
        # This would require historical data, simplified version:
        return {
            'notes': obj.notes_this_week,
            'topics': obj.topics_this_week,
            'ai_requests': obj.ai_requests_this_week,
        }


class ActivityLogSerializer(serializers.ModelSerializer):
    """Activity log for timeline"""
    
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'activity_type', 'activity_type_display',
            'description', 'note_id', 'note_title',
            'metadata', 'created_at', 'time_ago'
        ]
    
    def get_time_ago(self, obj):
        """Human-readable time ago"""
        from django.utils import timezone
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
        elif diff.seconds // 3600 > 0:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff.seconds // 60 > 0:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            return "Just now"


class QuickStatsSerializer(serializers.Serializer):
    """Quick stats for dashboard cards"""
    
    label = serializers.CharField()
    value = serializers.IntegerField()
    change = serializers.IntegerField(required=False)
    change_type = serializers.ChoiceField(
        choices=['increase', 'decrease', 'neutral'],
        required=False
    )
    icon = serializers.CharField(required=False)


class WeeklyChartDataSerializer(serializers.Serializer):
    """Weekly chart data"""
    
    date = serializers.DateField()
    notes = serializers.IntegerField()
    topics = serializers.IntegerField()
    ai_requests = serializers.IntegerField()


class AIUsageBreakdownSerializer(serializers.Serializer):
    """AI usage breakdown by tool type"""
    
    tool_type = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()
```

### 4. Dashboard Views

```python
# dashboard/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from datetime import timedelta
from django.core.cache import cache

from .models import DashboardCache, ActivityLog
from .serializers import (
    DashboardOverviewSerializer, ActivityLogSerializer,
    QuickStatsSerializer, WeeklyChartDataSerializer,
    AIUsageBreakdownSerializer
)
from notes.models import Note, ChapterTopic
from ai_tools.models import AIToolUsage

import logging

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
    """
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """
        Get complete dashboard overview
        Uses caching for performance
        """
        user = request.user
        
        # Try cache first
        cache_key = f'dashboard_overview:{user.id}'
        cached_data = cache.get(cache_key)
        
        if cached_data:
            logger.info(f"Dashboard cache hit for user {user.id}")
            return Response(cached_data)
        
        # Get or create dashboard cache
        dashboard, created = DashboardCache.objects.get_or_create(user=user)
        
        # Refresh if needed
        if created or dashboard.should_refresh():
            logger.info(f"Refreshing dashboard for user {user.id}")
            dashboard = DashboardCache.refresh_for_user(user)
        
        # Serialize
        serializer = DashboardOverviewSerializer(dashboard)
        data = serializer.data
        
        # Cache for 5 minutes
        cache.set(cache_key, data, 300)
        
        return Response(data)
    
    @action(detail=False, methods=['get'], url_path='quick-stats')
    def quick_stats(self, request):
        """
        Get quick stats for dashboard cards
        Format optimized for frontend cards
        """
        dashboard, _ = DashboardCache.objects.get_or_create(user=request.user)
        if dashboard.should_refresh():
            dashboard = DashboardCache.refresh_for_user(request.user)
        
        stats = [
            {
                'label': 'Total Notes',
                'value': dashboard.total_notes,
                'change': dashboard.notes_this_week,
                'change_type': 'increase' if dashboard.notes_this_week > 0 else 'neutral',
                'icon': 'notes'
            },
            {
                'label': 'Topics Created',
                'value': dashboard.total_topics,
                'change': dashboard.topics_this_week,
                'change_type': 'increase' if dashboard.topics_this_week > 0 else 'neutral',
                'icon': 'topics'
            },
            {
                'label': 'AI Generations',
                'value': dashboard.total_ai_requests,
                'change': dashboard.ai_requests_this_week,
                'change_type': 'increase' if dashboard.ai_requests_this_week > 0 else 'neutral',
                'icon': 'ai'
            },
            {
                'label': 'Current Streak',
                'value': dashboard.streak_days,
                'change': None,
                'change_type': 'neutral',
                'icon': 'streak'
            },
        ]
        
        serializer = QuickStatsSerializer(stats, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='weekly-chart')
    def weekly_chart(self, request):
        """
        Get weekly activity data for charts
        Returns last 7 days of activity
        """
        user = request.user
        
        # Try cache
        cache_key = f'dashboard_weekly_chart:{user.id}'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        # Calculate data for last 7 days
        end_date = timezone.now()
        start_date = end_date - timedelta(days=6)  # 7 days including today
        
        # Get daily stats
        daily_data = []
        
        for i in range(7):
            day = start_date + timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            notes_count = Note.objects.filter(
                user=user,
                created_at__gte=day_start,
                created_at__lt=day_end
            ).count()
            
            topics_count = ChapterTopic.objects.filter(
                chapter__note__user=user,
                created_at__gte=day_start,
                created_at__lt=day_end
            ).count()
            
            ai_count = AIToolUsage.objects.filter(
                user=user,
                created_at__gte=day_start,
                created_at__lt=day_end
            ).count()
            
            daily_data.append({
                'date': day.date(),
                'notes': notes_count,
                'topics': topics_count,
                'ai_requests': ai_count,
            })
        
        serializer = WeeklyChartDataSerializer(daily_data, many=True)
        data = serializer.data
        
        # Cache for 1 hour
        cache.set(cache_key, data, 3600)
        
        return Response(data)
    
    @action(detail=False, methods=['get'], url_path='ai-breakdown')
    def ai_breakdown(self, request):
        """
        Get AI usage breakdown by tool type
        For pie/donut charts
        """
        user = request.user
        
        # Get counts by tool type
        breakdown = AIToolUsage.objects.filter(user=user).values('tool_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        total = sum(item['count'] for item in breakdown)
        
        # Calculate percentages
        data = []
        for item in breakdown:
            data.append({
                'tool_type': item['tool_type'],
                'count': item['count'],
                'percentage': round((item['count'] / total * 100), 1) if total > 0 else 0
            })
        
        serializer = AIUsageBreakdownSerializer(data, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='recent-activity')
    def recent_activity(self, request):
        """
        Get recent activity timeline
        Last 20 activities
        """
        activities = ActivityLog.objects.filter(
            user=request.user
        ).order_by('-created_at')[:20]
        
        serializer = ActivityLogSerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='recent-notes')
    def recent_notes(self, request):
        """
        Get recently updated notes
        """
        from notes.serializers import NoteListSerializer
        
        notes = Note.objects.filter(
            user=request.user
        ).select_related('user').prefetch_related(
            'chapters'
        ).order_by('-updated_at')[:10]
        
        serializer = NoteListSerializer(notes, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def refresh(self, request):
        """
        Force refresh dashboard cache
        """
        try:
            dashboard = DashboardCache.refresh_for_user(request.user, force=True)
            
            # Clear cache
            cache_key = f'dashboard_overview:{request.user.id}'
            cache.delete(cache_key)
            
            serializer = DashboardOverviewSerializer(dashboard)
            
            return Response({
                'success': True,
                'message': 'Dashboard refreshed successfully',
                'data': serializer.data
            })
        except Exception as e:
            logger.error(f"Dashboard refresh error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

### 5. Dashboard URLs

```python
# dashboard/urls.py

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
]
```

### 6. Dashboard Background Tasks

```python
# dashboard/tasks.py

from celery import shared_task
from django.contrib.auth import get_user_model
from .models import DashboardCache, ActivityLog
from datetime import timedelta
from django.utils import timezone
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task
def refresh_all_dashboards():
    """
    Refresh dashboard cache for all active users
    Run daily at 2 AM
    """
    active_users = User.objects.filter(is_active=True)
    
    refreshed = 0
    errors = 0
    
    for user in active_users:
        try:
            DashboardCache.refresh_for_user(user, force=True)
            refreshed += 1
        except Exception as e:
            logger.error(f"Error refreshing dashboard for user {user.id}: {str(e)}")
            errors += 1
    
    logger.info(f"Dashboard refresh complete: {refreshed} successful, {errors} errors")
    return {
        'refreshed': refreshed,
        'errors': errors
    }


@shared_task
def cleanup_old_activity_logs():
    """
    Delete activity logs older than 90 days
    Run weekly
    """
    cutoff_date = timezone.now() - timedelta(days=90)
    
    deleted, _ = ActivityLog.objects.filter(created_at__lt=cutoff_date).delete()
    
    logger.info(f"Cleaned up {deleted} old activity logs")
    return deleted


@shared_task
def update_user_streaks():
    """
    Update streak calculations for all users
    Run daily at midnight
    """
    users = User.objects.filter(is_active=True)
    updated = 0
    
    for user in users:
        try:
            cache = DashboardCache.objects.get(user=user)
            cache.streak_days = DashboardCache._calculate_streak(user)
            cache.save(update_fields=['streak_days'])
            updated += 1
        except DashboardCache.DoesNotExist:
            pass
    
    logger.info(f"Updated streaks for {updated} users")
    return updated
```

### 7. Integration with Notes App

```python
# notes/signals.py

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Note, ChapterTopic
from dashboard.models import ActivityLog, DashboardCache
from django.core.cache import cache

@receiver(post_save, sender=Note)
def note_saved_handler(sender, instance, created, **kwargs):
    """Handle note save events"""
    
    # Log activity
    if created:
        ActivityLog.log_activity(
            user=instance.user,
            activity_type='note_created',
            description=f"Created note '{instance.title}'",
            note=instance
        )
    else:
        ActivityLog.log_activity(
            user=instance.user,
            activity_type='note_updated',
            description=f"Updated note '{instance.title}'",
            note=instance
        )
    
    # Clear dashboard cache
    cache_key = f'dashboard_overview:{instance.user.id}'
    cache.delete(cache_key)
    
    # Mark dashboard for refresh
    try:
        dashboard = DashboardCache.objects.get(user=instance.user)
        dashboard.last_refreshed_at = None  # Force refresh
        dashboard.save()
    except DashboardCache.DoesNotExist:
        pass


@receiver(post_save, sender=ChapterTopic)
def topic_created_handler(sender, instance, created, **kwargs):
    """Handle topic creation"""
    
    if created:
        ActivityLog.log_activity(
            user=instance.chapter.note.user,
            activity_type='topic_created',
            description=f"Created topic '{instance.name}'",
            note=instance.chapter.note
        )
        
        # Clear cache
        cache_key = f'dashboard_overview:{instance.chapter.note.user.id}'
        cache.delete(cache_key)
```

### 8. Add to Main URLs

```python
# NoteAssist_AI/urls.py

from django.urls import path, include

urlpatterns = [
    # ... existing patterns ...
    path('api/dashboard/', include('dashboard.urls')),
]
```

---

## 🔧 Phase 3: Admin Analytics Module (Days 8-9)

### 1. Admin Analytics Models

```python
# Create new app
python manage.py startapp admin_analytics

# admin_analytics/models.py

from django.db import models
from django.utils import timezone
from django.db.models import Count, Sum, Avg, Q
from datetime import timedelta

class SystemStatistics(models.Model):
    """
    System-wide statistics cache
    Refreshed hourly via background task
    """
    
    # User Statistics
    total_users = models.IntegerField(default=0)
    active_users_today = models.IntegerField(default=0)
    active_users_week = models.IntegerField(default=0)
    active_users_month = models.IntegerField(default=0)
    new_users_today = models.IntegerField(default=0)
    new_users_week = models.IntegerField(default=0)
    
    # Content Statistics
    total_notes = models.IntegerField(default=0)
    total_chapters = models.IntegerField(default=0)
    total_topics = models.IntegerField(default=0)
    published_notes = models.IntegerField(default=0)
    draft_notes = models.IntegerField(default=0)
    
    # AI Statistics
    total_ai_requests = models.IntegerField(default=0)
    ai_requests_today = models.IntegerField(default=0)
    ai_requests_week = models.IntegerField(default=0)
    avg_response_time = models.FloatField(default=0)
    total_tokens_used = models.BigIntegerField(default=0)
    
    # Performance Metrics
    avg_topics_per_note = models.FloatField(default=0)
    avg_chapters_per_note = models.FloatField(default=0)
    user_engagement_rate = models.FloatField(default=0)  # Percentage
    
    # Timestamps
    calculated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'system_statistics'
        get_latest_by = 'calculated_at'
    
    @classmethod
    def calculate(cls):
        """Calculate current system statistics"""
        from django.contrib.auth import get_user_model
        from notes.models import Note, Chapter, ChapterTopic
        from ai_tools.models import AIToolUsage
        
        User = get_user_model()
        
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # User statistics
        users = User.objects.filter(is_active=True)
        stats = cls.objects.create(
            total_users=users.count(),
            active_users_today=users.filter(last_login_at__gte=today_start).count(),
            active_users_week=users.filter(last_login_at__gte=week_ago).count(),
            active_users_month=users.filter(last_login_at__gte=month_ago).count(),
            new_users_today=users.filter(created_at__gte=today_start).count(),
            new_users_week=users.filter(created_at__gte=week_ago).count(),
        )
        
        # Content statistics
        notes = Note.objects.all()
        stats.total_notes = notes.count()
        stats.published_notes = notes.filter(status='published').count()
        stats.draft_notes = notes.filter(status='draft').count()
        stats.total_chapters = Chapter.objects.count()
        stats.total_topics = ChapterTopic.objects.count()
        
        # AI statistics
        ai_usage = AIToolUsage.objects.all()
        ai_agg = ai_usage.aggregate(
            total=Count('id'),
            avg_time=Avg('response_time'),
            total_tokens=Sum('tokens_used')
        )
        
        stats.total_ai_requests = ai_agg['total'] or 0
        stats.ai_requests_today = ai_usage.filter(created_at__gte=today_start).count()
        stats.ai_requests_week = ai_usage.filter(created_at__gte=week_ago).count()
        stats.avg_response_time = ai_agg['avg_time'] or 0
        stats.total_tokens_used = ai_agg['total_tokens'] or 0
        
        # Performance metrics
        if stats.total_notes > 0:
            stats.avg_topics_per_note = stats.total_topics / stats.total_notes
            stats.avg_chapters_per_note = stats.total_chapters / stats.total_notes
        
        if stats.total_users > 0:
            stats.user_engagement_rate = (stats.active_users_week / stats.total_users) * 100
        
        stats.save()
        return stats
```

### 2. Admin Analytics Views

```python
# admin_analytics/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Avg, Q
from django.core.cache import cache

from .models import SystemStatistics
from notes.models import Note
from ai_tools.models import AIToolUsage

User = get_user_model()


class AdminAnalyticsViewSet(viewsets.ViewSet):
    """
    Admin-only analytics API
    
    GET /api/admin/overview/
    GET /api/admin/users/
    GET /api/admin/ai-analytics/
    GET /api/admin/performance/
    POST /api/admin/refresh/
    """
    
    permission_classes = [IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get system-wide overview"""
        
        cache_key = 'admin_overview'
        cached = cache.get(cache_key)
        
        if cached:
            return Response(cached)
        
        # Get latest stats or calculate
        try:
            stats = SystemStatistics.objects.latest()
            
            # Recalculate if older than 1 hour
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
        
        cache.set(cache_key, data, 600)  # 10 minutes
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def users(self, request):
        """Get user statistics"""
        
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
        """Get AI usage analytics"""
        
        # Usage by type
        by_type = AIToolUsage.objects.values('tool_type').annotate(
            count=Count('id'),
            avg_time=Avg('response_time')
        )
        
        return Response({
            'by_type': list(by_type),
        })
    
    @action(detail=False, methods=['post'])
    def refresh(self, request):
        """Force refresh statistics"""
        
        stats = SystemStatistics.calculate()
        cache.delete('admin_overview')
        
        return Response({
            'success': True,
            'calculated_at': stats.calculated_at
        })
```

---

## ✅ Integration Checklist

- [ ] Create dashboard app
- [ ] Create admin_analytics app
- [ ] Run migrations
- [ ] Add signal handlers
- [ ] Update URL configuration
- [ ] Set up Celery tasks
- [ ] Configure caching
- [ ] Test all endpoints
- [ ] Deploy to production

**Implementation Complete!** 🎉
