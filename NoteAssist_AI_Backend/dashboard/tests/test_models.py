from django.contrib.auth import get_user_model
from django.test import TestCase

from dashboard.models import DashboardCache


class DashboardCacheModelTests(TestCase):
    def test_refresh_for_user_creates_cache(self):
        user = get_user_model().objects.create_user(email='test@example.com', password='pass1234')
        cache = DashboardCache.refresh_for_user(user, force=True)
        self.assertEqual(cache.user, user)
        self.assertIsNotNone(cache.last_refreshed_at)
