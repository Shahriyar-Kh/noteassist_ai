from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase


class DashboardViewTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(email='test@example.com', password='pass1234')
        self.client.force_authenticate(user=self.user)

    def test_overview_endpoint(self):
        response = self.client.get('/api/dashboard/overview/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('total_notes', response.data)
