from django.contrib.auth import get_user_model
from django.test import TestCase

from dashboard.services import refresh_dashboard_for_user


class DashboardServiceTests(TestCase):
    def test_refresh_dashboard_for_user(self):
        user = get_user_model().objects.create_user(email='test@example.com', password='pass1234')
        cache = refresh_dashboard_for_user(user, force=True)
        self.assertEqual(cache.user, user)
