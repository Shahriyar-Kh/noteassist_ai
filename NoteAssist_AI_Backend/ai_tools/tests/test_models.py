from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from ai_tools.models import AIToolUsage, AIToolOutput, AIToolQuota

User = get_user_model()


class AIToolUsageTest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            terms_accepted=True
        )

    def test_create_usage(self):
        """Test creating AI tool usage"""
        usage = AIToolUsage.objects.create(
            user=self.user,
            tool_type='generate',
            input_text='Test input',
            output_text='Test output',
            response_time=1.5,
            tokens_used=100
        )

        self.assertEqual(usage.user, self.user)
        self.assertEqual(usage.tool_type, 'generate')
        self.assertIsNotNone(usage.created_at)

    def test_usage_indexes(self):
        """Test that database indexes are created"""
        for i in range(5):
            AIToolUsage.objects.create(
                user=self.user,
                tool_type='generate',
                input_text=f'Test {i}',
                output_text=f'Output {i}',
                response_time=1.0
            )

        with self.assertNumQueries(1):
            list(AIToolUsage.objects.filter(user=self.user).order_by('-created_at'))


class AIToolOutputTest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            terms_accepted=True
        )
        self.usage = AIToolUsage.objects.create(
            user=self.user,
            tool_type='generate',
            input_text='Test',
            output_text='Output',
            response_time=1.0
        )

    def test_output_auto_expiry(self):
        """Test that output expires in 30 days"""
        output = AIToolOutput.objects.create(
            user=self.user,
            usage=self.usage,
            title='Test Output',
            content='Test content'
        )

        self.assertIsNotNone(output.expires_at)
        expected_expiry = timezone.now() + timedelta(days=30)
        self.assertAlmostEqual(
            output.expires_at,
            expected_expiry,
            delta=timedelta(minutes=1)
        )

    def test_is_expired(self):
        """Test expiration check"""
        output = AIToolOutput.objects.create(
            user=self.user,
            usage=self.usage,
            title='Test',
            content='Content',
            expires_at=timezone.now() - timedelta(days=1)
        )

        self.assertTrue(output.is_expired)

    def test_download_tracking(self):
        """Test download count tracking"""
        output = AIToolOutput.objects.create(
            user=self.user,
            usage=self.usage,
            title='Test',
            content='Content'
        )

        self.assertEqual(output.download_count, 0)
        output.download_count += 1
        output.save()
        self.assertEqual(output.download_count, 1)


class AIToolQuotaTest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            terms_accepted=True
        )
        self.quota = AIToolQuota.objects.create(
            user=self.user,
            daily_limit=10,
            monthly_limit=100
        )

    def test_can_use_tool(self):
        """Test quota checking"""
        self.assertTrue(self.quota.can_use_tool())

        self.quota.daily_used = 10
        self.quota.save()

        self.assertFalse(self.quota.can_use_tool())

    def test_daily_reset(self):
        """Test daily quota reset"""
        self.quota.daily_used = 5
        self.quota.last_reset_date = timezone.now().date() - timedelta(days=1)
        self.quota.save()

        self.quota.reset_daily_quota()

        self.assertEqual(self.quota.daily_used, 0)
        self.assertEqual(self.quota.last_reset_date, timezone.now().date())

    def test_increment_usage(self):
        """Test usage increment"""
        initial_daily = self.quota.daily_used
        initial_monthly = self.quota.monthly_used

        self.quota.increment_usage(tokens=50)

        self.assertEqual(self.quota.daily_used, initial_daily + 1)
        self.assertEqual(self.quota.monthly_used, initial_monthly + 1)
        self.assertEqual(self.quota.total_tokens_used, 50)

    def test_monthly_limit_enforcement(self):
        """Test monthly limit enforcement"""
        self.quota.monthly_used = self.quota.monthly_limit
        self.quota.save()

        self.assertFalse(self.quota.can_use_tool())
