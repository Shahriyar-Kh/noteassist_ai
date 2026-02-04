"""Dashboard service helpers."""

from django.utils import timezone

from .models import DashboardCache


def refresh_dashboard_for_user(user, force=False):
    """Refresh dashboard cache for a user."""
    return DashboardCache.refresh_for_user(user, force=force)


def should_refresh_dashboard(user):
    """Check if dashboard should be refreshed for a user."""
    cache, _ = DashboardCache.objects.get_or_create(user=user)
    return cache.should_refresh()


def get_last_refresh_time(user):
    """Return the last refresh time for a user's dashboard."""
    cache, _ = DashboardCache.objects.get_or_create(user=user)
    return cache.last_refreshed_at or timezone.now()
