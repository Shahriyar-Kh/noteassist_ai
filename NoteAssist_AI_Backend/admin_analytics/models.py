from datetime import timedelta

from django.db import models
from django.db.models import Avg, Count, Sum
from django.utils import timezone


class SystemStatistics(models.Model):
    """System-wide statistics cache refreshed hourly"""

    total_users = models.IntegerField(default=0)
    active_users_today = models.IntegerField(default=0)
    active_users_week = models.IntegerField(default=0)
    active_users_month = models.IntegerField(default=0)
    new_users_today = models.IntegerField(default=0)
    new_users_week = models.IntegerField(default=0)

    total_notes = models.IntegerField(default=0)
    total_chapters = models.IntegerField(default=0)
    total_topics = models.IntegerField(default=0)
    published_notes = models.IntegerField(default=0)
    draft_notes = models.IntegerField(default=0)

    total_ai_requests = models.IntegerField(default=0)
    ai_requests_today = models.IntegerField(default=0)
    ai_requests_week = models.IntegerField(default=0)
    avg_response_time = models.FloatField(default=0)
    total_tokens_used = models.BigIntegerField(default=0)

    avg_topics_per_note = models.FloatField(default=0)
    avg_chapters_per_note = models.FloatField(default=0)
    user_engagement_rate = models.FloatField(default=0)

    calculated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'system_statistics'
        get_latest_by = 'calculated_at'

    @classmethod
    def calculate(cls):
        from django.contrib.auth import get_user_model
        from notes.models import Chapter, ChapterTopic, Note
        from ai_tools.models import AIToolUsage

        User = get_user_model()

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        users = User.objects.filter(is_active=True)
        stats = cls.objects.create(
            total_users=users.count(),
            active_users_today=users.filter(last_login_at__gte=today_start).count(),
            active_users_week=users.filter(last_login_at__gte=week_ago).count(),
            active_users_month=users.filter(last_login_at__gte=month_ago).count(),
            new_users_today=users.filter(created_at__gte=today_start).count(),
            new_users_week=users.filter(created_at__gte=week_ago).count(),
        )

        notes = Note.objects.all()
        stats.total_notes = notes.count()
        stats.published_notes = notes.filter(status='published').count()
        stats.draft_notes = notes.filter(status='draft').count()
        stats.total_chapters = Chapter.objects.count()
        stats.total_topics = ChapterTopic.objects.count()

        ai_usage = AIToolUsage.objects.all()
        ai_agg = ai_usage.aggregate(
            total=Count('id'),
            avg_time=Avg('response_time'),
            total_tokens=Sum('tokens_used'),
        )

        stats.total_ai_requests = ai_agg['total'] or 0
        stats.ai_requests_today = ai_usage.filter(created_at__gte=today_start).count()
        stats.ai_requests_week = ai_usage.filter(created_at__gte=week_ago).count()
        stats.avg_response_time = ai_agg['avg_time'] or 0
        stats.total_tokens_used = ai_agg['total_tokens'] or 0

        if stats.total_notes > 0:
            stats.avg_topics_per_note = stats.total_topics / stats.total_notes
            stats.avg_chapters_per_note = stats.total_chapters / stats.total_notes

        if stats.total_users > 0:
            stats.user_engagement_rate = (stats.active_users_week / stats.total_users) * 100

        stats.save()
        return stats
