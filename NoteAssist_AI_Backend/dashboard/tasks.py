from datetime import timedelta
import logging

from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import ActivityLog, DashboardCache

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task
def refresh_all_dashboards():
    """Refresh dashboard cache for all active users (daily)."""
    active_users = User.objects.filter(is_active=True)

    refreshed = 0
    errors = 0

    for user in active_users:
        try:
            DashboardCache.refresh_for_user(user, force=True)
            refreshed += 1
        except Exception as e:
            logger.error("Error refreshing dashboard for user %s: %s", user.id, str(e))
            errors += 1

    logger.info("Dashboard refresh complete: %s successful, %s errors", refreshed, errors)
    return {
        'refreshed': refreshed,
        'errors': errors,
    }


@shared_task
def cleanup_old_activity_logs():
    """Delete activity logs older than 90 days (weekly)."""
    cutoff_date = timezone.now() - timedelta(days=90)
    deleted, _ = ActivityLog.objects.filter(created_at__lt=cutoff_date).delete()
    logger.info("Cleaned up %s old activity logs", deleted)
    return deleted


@shared_task
def update_user_streaks():
    """Update streak calculations for all users (daily)."""
    users = User.objects.filter(is_active=True)
    updated = 0

    for user in users:
        try:
            cache = DashboardCache.objects.get(user=user)
            cache.streak_days = DashboardCache._calculate_streak(user)
            cache.save(update_fields=['streak_days'])
            updated += 1
        except DashboardCache.DoesNotExist:
            continue

    logger.info("Updated streaks for %s users", updated)
    return updated
