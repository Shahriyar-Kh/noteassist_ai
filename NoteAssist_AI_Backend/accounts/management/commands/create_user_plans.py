"""
Management command to create default UserPlan for all existing users
Usage: python manage.py create_user_plans
"""

from django.core.management.base import BaseCommand
from accounts.models import User, UserPlan


class Command(BaseCommand):
    help = 'Create default UserPlan for all existing users'

    def handle(self, *args, **options):
        users = User.objects.all()
        created_count = 0
        existing_count = 0
        
        self.stdout.write(f"Found {users.count()} total users")
        
        for user in users:
            plan, created = UserPlan.objects.get_or_create(
                user=user,
                defaults={
                    'plan_type': 'free',
                    'daily_ai_limit': 10,
                    'weekly_ai_limit': 50,
                    'monthly_ai_limit': 200,
                    'can_use_ai_tools': True,
                    'can_export_pdf': True,
                    'can_publish_notes': True,
                    'max_notes': 100,
                    'max_storage_mb': 500,
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"✓ Created plan for: {user.email}"))
            else:
                existing_count += 1
                self.stdout.write(f"- Plan already exists for: {user.email}")
        
        self.stdout.write("\n" + "="*50)
        self.stdout.write(self.style.SUCCESS(f"Created: {created_count} new plans"))
        self.stdout.write(f"Existing: {existing_count} plans")
        self.stdout.write(f"Total: {users.count()} users")
        self.stdout.write(self.style.SUCCESS("\n✅ All users now have plans!"))
