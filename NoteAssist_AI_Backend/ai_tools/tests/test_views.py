from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

from ai_tools.models import AIToolUsage, AIToolOutput, AIToolQuota

User = get_user_model()


class AIToolsAPITest(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            terms_accepted=True
        )
        self.client.force_authenticate(user=self.user)

        AIToolQuota.objects.create(
            user=self.user,
            daily_limit=10,
            monthly_limit=100
        )

    def test_generate_endpoint_unauthorized(self):
        """Test generation endpoint requires auth"""
        self.client.force_authenticate(user=None)

        data = {
            'topic': 'Python Functions',
            'level': 'beginner'
        }

        response = self.client.post('/api/ai-tools/generate/', data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_quota_enforcement(self):
        """Test that quota is enforced"""
        quota = self.user.ai_quota
        quota.daily_used = quota.daily_limit
        quota.save()

        data = {
            'topic': 'Test Topic',
            'level': 'beginner'
        }

        response = self.client.post('/api/ai-tools/generate/', data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data or response.content)

    def test_list_outputs(self):
        """Test listing user outputs"""
        for i in range(3):
            usage = AIToolUsage.objects.create(
                user=self.user,
                tool_type='generate',
                input_text=f'Input {i}',
                output_text=f'Output {i}',
                response_time=1.0
            )
            AIToolOutput.objects.create(
                user=self.user,
                usage=usage,
                title=f'Output {i}',
                content=f'Content {i}'
            )

        response = self.client.get('/api/ai-tools/outputs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_usage_history(self):
        """Test usage history endpoint"""
        usage = AIToolUsage.objects.create(
            user=self.user,
            tool_type='generate',
            input_text='Test',
            output_text='Output',
            response_time=1.0,
            tokens_used=100
        )

        response = self.client.get('/api/ai-tools/usage-history/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_quota_endpoint(self):
        """Test quota status endpoint"""
        response = self.client.get('/api/ai-tools/quota/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('quota', response.data)
        self.assertEqual(response.data['quota']['daily_limit'], 10)
        self.assertEqual(response.data['quota']['daily_used'], 0)
