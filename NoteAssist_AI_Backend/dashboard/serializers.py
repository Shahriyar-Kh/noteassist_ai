from rest_framework import serializers

from .models import ActivityLog, DashboardCache


class DashboardOverviewSerializer(serializers.ModelSerializer):
    """Main dashboard overview statistics"""

    total_content_items = serializers.SerializerMethodField()
    ai_usage_percentage = serializers.SerializerMethodField()
    week_over_week_growth = serializers.SerializerMethodField()

    class Meta:
        model = DashboardCache
        fields = [
            'total_notes', 'total_chapters', 'total_topics',
            'published_notes', 'draft_notes', 'total_content_items',
            'ai_generations', 'ai_improvements', 'ai_summarizations',
            'ai_code_generations', 'total_ai_requests', 'total_tokens_used',
            'ai_usage_percentage',
            'notes_this_week', 'topics_this_week', 'ai_requests_this_week',
            'week_over_week_growth',
            'last_activity_at', 'streak_days', 'total_active_days',
            'drive_connected', 'total_drive_uploads',
            'last_refreshed_at',
        ]

    def get_total_content_items(self, obj):
        return obj.total_notes + obj.total_chapters + obj.total_topics

    def get_ai_usage_percentage(self, obj):
        if obj.total_topics == 0:
            return 0
        return min(100, round((obj.total_ai_requests / obj.total_topics) * 100, 1))

    def get_week_over_week_growth(self, obj):
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
            'metadata', 'created_at', 'time_ago',
        ]

    def get_time_ago(self, obj):
        from django.utils import timezone

        now = timezone.now()
        diff = now - obj.created_at

        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
        if diff.seconds // 3600 > 0:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        if diff.seconds // 60 > 0:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        return "Just now"


class QuickStatsSerializer(serializers.Serializer):
    """Quick stats for dashboard cards"""

    label = serializers.CharField()
    value = serializers.IntegerField()
    change = serializers.IntegerField(required=False)
    change_type = serializers.ChoiceField(
        choices=['increase', 'decrease', 'neutral'],
        required=False,
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
