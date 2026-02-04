from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from ai_tools.models import AIToolQuota


class Command(BaseCommand):
    help = 'Initialize AI quotas for all active users'

    def handle(self, *args, **kwargs):
        self.stdout.write('Creating AI quotas...')

        User = get_user_model()
        users = User.objects.filter(is_active=True)
        created = 0

        for user in users:
            _, is_new = AIToolQuota.objects.get_or_create(
                user=user,
                defaults={
                    'daily_limit': 20,
                    'monthly_limit': 100,
                }
            )

            if is_new:
                created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Created {created} quotas for {users.count()} users'
        ))
