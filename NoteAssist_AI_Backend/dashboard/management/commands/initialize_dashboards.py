from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from dashboard.models import DashboardCache


class Command(BaseCommand):
    help = 'Initialize dashboard caches for all active users'

    def handle(self, *args, **kwargs):
        self.stdout.write('Initializing dashboard caches...')

        User = get_user_model()
        users = User.objects.filter(is_active=True)
        total = users.count()
        processed = 0

        for user in users:
            try:
                DashboardCache.refresh_for_user(user, force=True)
                processed += 1

                if processed % 50 == 0:
                    self.stdout.write(f'Processed {processed}/{total} users...')

            except Exception as exc:
                self.stdout.write(self.style.ERROR(
                    f'Error for user {user.id}: {exc}'
                ))

        self.stdout.write(self.style.SUCCESS(
            f'Initialized {processed} dashboard caches'
        ))
