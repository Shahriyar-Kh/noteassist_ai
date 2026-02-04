from django.core.cache import cache
from django.db.models.signals import post_save
from django.dispatch import receiver

from dashboard.models import ActivityLog, DashboardCache
from .models import ChapterTopic, Note


@receiver(post_save, sender=Note)
def note_saved_handler(sender, instance, created, **kwargs):
    """Handle note save events."""
    if created:
        ActivityLog.log_activity(
            user=instance.user,
            activity_type='note_created',
            description=f"Created note '{instance.title}'",
            note=instance,
        )
    else:
        ActivityLog.log_activity(
            user=instance.user,
            activity_type='note_updated',
            description=f"Updated note '{instance.title}'",
            note=instance,
        )

    cache_key = f'dashboard_overview:{instance.user.id}'
    cache.delete(cache_key)

    try:
        dashboard = DashboardCache.objects.get(user=instance.user)
        dashboard.last_refreshed_at = None
        dashboard.save(update_fields=['last_refreshed_at'])
    except DashboardCache.DoesNotExist:
        pass


@receiver(post_save, sender=ChapterTopic)
def topic_created_handler(sender, instance, created, **kwargs):
    """Handle topic creation."""
    if created:
        ActivityLog.log_activity(
            user=instance.chapter.note.user,
            activity_type='topic_created',
            description=f"Created topic '{instance.name}'",
            note=instance.chapter.note,
        )

        cache_key = f'dashboard_overview:{instance.chapter.note.user.id}'
        cache.delete(cache_key)
