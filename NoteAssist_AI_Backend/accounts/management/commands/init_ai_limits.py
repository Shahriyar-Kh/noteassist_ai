# FILE: accounts/management/commands/init_ai_limits.py
# Management command to initialize AI limits for existing users
# ============================================================================

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.ai_usage_service import AIUsageService
from ai_tools.models import AIToolUsage
from django.db.models import Count
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Initialize AI limits and usage counters for existing users'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--recalculate',
            action='store_true',
            help='Recalculate usage counters from existing AIToolUsage records',
        )
        parser.add_argument(
            '--plan',
            type=str,
            help='Set all users to specific plan (free/pro/enterprise)',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('INITIALIZING AI LIMITS FOR ALL USERS'))
        self.stdout.write(self.style.SUCCESS('='*60 + '\n'))
        
        users = User.objects.all()
        total_users = users.count()
        
        self.stdout.write(f'Found {total_users} users to process\n')
        
        for idx, user in enumerate(users, 1):
            self.stdout.write(f'\n[{idx}/{total_users}] Processing: {user.email}')
            
            # Skip if fields already initialized (unless recalculate flag is set)
            if (not options['recalculate'] and 
                hasattr(user, 'plan_type') and 
                user.plan_type and
                hasattr(user, 'daily_ai_limit') and 
                user.daily_ai_limit is not None):
                self.stdout.write(self.style.WARNING(f'  ⏭️  Already initialized, skipping'))
                continue
            
            # Set plan type
            if options['plan']:
                user.plan_type = options['plan']
                self.stdout.write(f'  📋 Setting plan: {options["plan"]}')
            elif not hasattr(user, 'plan_type') or not user.plan_type:
                user.plan_type = 'free'
                self.stdout.write(f'  📋 Setting default plan: free')
            
            # Apply plan limits
            AIUsageService.apply_plan_limits(user, user.plan_type)
            self.stdout.write(f'  ✅ Applied {user.plan_type} limits: {user.daily_ai_limit}/day, {user.monthly_ai_limit}/month')
            
            # Enable all features by default
            user.can_generate_topic = True
            user.can_improve = True
            user.can_summarize = True
            user.can_generate_code = True
            user.can_export_pdf = True
            user.can_use_google_drive = True
            self.stdout.write(f'  🔓 Enabled all features')
            
            # Recalculate usage counters if requested
            if options['recalculate']:
                self._recalculate_usage_counters(user)
            
            user.save()
            self.stdout.write(self.style.SUCCESS(f'  ✅ User initialized successfully'))
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS(f'✅ INITIALIZATION COMPLETE'))
        self.stdout.write(self.style.SUCCESS(f'   Processed: {total_users} users'))
        self.stdout.write(self.style.SUCCESS('='*60 + '\n'))
    
    def _recalculate_usage_counters(self, user):
        """Recalculate usage counters from existing AIToolUsage records"""
        self.stdout.write(f'  🔄 Recalculating usage counters...')
        
        # Get usage counts by tool type
        usage_counts = AIToolUsage.objects.filter(user=user).values('tool_type').annotate(
            count=Count('id')
        )
        
        # Reset counters
        user.generate_topic_count = 0
        user.improve_count = 0
        user.summarize_count = 0
        user.generate_code_count = 0
        
        # Update counters
        for item in usage_counts:
            tool_type = item['tool_type']
            count = item['count']
            
            if tool_type == 'generate':
                user.generate_topic_count = count
            elif tool_type == 'improve':
                user.improve_count = count
            elif tool_type == 'summarize':
                user.summarize_count = count
            elif tool_type == 'code':
                user.generate_code_count = count
        
        # Total usage
        user.total_ai_requests = sum([
            user.generate_topic_count,
            user.improve_count,
            user.summarize_count,
            user.generate_code_count,
        ])
        
        self.stdout.write(
            f'     Generate: {user.generate_topic_count} | '
            f'Improve: {user.improve_count} | '
            f'Summarize: {user.summarize_count} | '
            f'Code: {user.generate_code_count} | '
            f'Total: {user.total_ai_requests}'
        )