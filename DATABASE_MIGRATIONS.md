# Database Migration Scripts

## ⚙️ Step-by-Step Migration Guide

### Phase 1: Preparation & Backup


## 📝 Migration Scripts

### Migration 1: Remove Course Dependencies

```python
# notes/migrations/0002_remove_course_dependencies.py

from django.db import migrations, models

class Migration(migrations.Migration):
    
    dependencies = [
        ('notes', '0001_initial'),
    ]
    
    operations = [
        # 1. Make course field nullable first
        migrations.AlterField(
            model_name='note',
            name='course',
            field=models.ForeignKey(
                'courses.Course',
                on_delete=models.SET_NULL,
                null=True,
                blank=True,
                related_name='notes'
            ),
        ),
        
        # 2. Make roadmap field nullable
        migrations.AlterField(
            model_name='note',
            name='roadmap',
            field=models.ForeignKey(
                'roadmaps.Roadmap',
                on_delete=models.SET_NULL,
                null=True,
                blank=True,
                related_name='notes'
            ),
        ),
        
        # 3. Remove the constraints
        migrations.RemoveField(
            model_name='note',
            name='course',
        ),
        
        migrations.RemoveField(
            model_name='note',
            name='roadmap',
        ),
    ]
```

### Migration 2: Add Performance Indexes

```python
# notes/migrations/0003_add_performance_indexes.py

from django.db import migrations, models

class Migration(migrations.Migration):
    
    dependencies = [
        ('notes', '0002_remove_course_dependencies'),
    ]
    
    operations = [
        # Note indexes
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['user', '-updated_at'], name='note_user_updated_idx'),
        ),
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['user', 'status'], name='note_user_status_idx'),
        ),
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['status', '-created_at'], name='note_status_created_idx'),
        ),
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['-created_at'], name='note_created_idx'),
        ),
        
        # Chapter indexes
        migrations.AddIndex(
            model_name='chapter',
            index=models.Index(fields=['note', 'order'], name='chapter_note_order_idx'),
        ),
        
        # ChapterTopic indexes
        migrations.AddIndex(
            model_name='chaptertopic',
            index=models.Index(fields=['chapter', 'order'], name='topic_chapter_order_idx'),
        ),
        migrations.AddIndex(
            model_name='chaptertopic',
            index=models.Index(fields=['chapter', '-created_at'], name='topic_chapter_created_idx'),
        ),
    ]
```

### Migration 3: Add Slug Field

```python
# notes/migrations/0004_add_slug_field.py

from django.db import migrations, models
from django.utils.text import slugify

def generate_slugs(apps, schema_editor):
    """Generate slugs for existing notes"""
    Note = apps.get_model('notes', 'Note')
    
    for note in Note.objects.all():
        base_slug = slugify(note.title)
        slug = base_slug
        counter = 1
        
        while Note.objects.filter(slug=slug).exclude(pk=note.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        note.slug = slug
        note.save()

class Migration(migrations.Migration):
    
    dependencies = [
        ('notes', '0003_add_performance_indexes'),
    ]
    
    operations = [
        # Add slug field (nullable first)
        migrations.AddField(
            model_name='note',
            name='slug',
            field=models.SlugField(max_length=255, unique=True, null=True),
        ),
        
        # Generate slugs for existing notes
        migrations.RunPython(generate_slugs, migrations.RunPython.noop),
        
        # Make slug non-nullable
        migrations.AlterField(
            model_name='note',
            name='slug',
            field=models.SlugField(max_length=255, unique=True),
        ),
        
        # Add index on slug
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['slug'], name='note_slug_idx'),
        ),
    ]
```

### Migration 4: Create AI Tools Tables

```python
# ai_tools/migrations/0001_initial.py

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings

class Migration(migrations.Migration):
    
    initial = True
    
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('notes', '0004_add_slug_field'),
    ]
    
    operations = [
        # AIToolUsage model
        migrations.CreateModel(
            name='AIToolUsage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tool_type', models.CharField(
                    choices=[
                        ('generate', 'Generate'),
                        ('improve', 'Improve'),
                        ('summarize', 'Summarize'),
                        ('code', 'Code Generation'),
                    ],
                    max_length=20
                )),
                ('input_text', models.TextField()),
                ('output_text', models.TextField()),
                ('input_metadata', models.JSONField(default=dict, blank=True)),
                ('response_time', models.FloatField(default=0)),
                ('tokens_used', models.IntegerField(default=0)),
                ('model_used', models.CharField(max_length=100, default='claude-sonnet-4-20250514')),
                ('success', models.BooleanField(default=True)),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='ai_tool_usages',
                    to=settings.AUTH_USER_MODEL
                )),
                ('note', models.ForeignKey(
                    on_delete=django.db.models.deletion.SET_NULL,
                    null=True,
                    blank=True,
                    related_name='ai_tool_usages',
                    to='notes.note'
                )),
            ],
            options={
                'db_table': 'ai_tool_usage',
                'ordering': ['-created_at'],
            },
        ),
        
        # AIToolOutput model
        migrations.CreateModel(
            name='AIToolOutput',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=500)),
                ('content', models.TextField()),
                ('content_format', models.CharField(
                    max_length=20,
                    choices=[('markdown', 'Markdown'), ('html', 'HTML'), ('plain', 'Plain Text')],
                    default='markdown'
                )),
                ('saved_to_note', models.BooleanField(default=False)),
                ('download_count', models.IntegerField(default=0)),
                ('drive_file_id', models.CharField(max_length=255, blank=True)),
                ('expires_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='ai_tool_outputs',
                    to=settings.AUTH_USER_MODEL
                )),
                ('usage', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='output',
                    to='ai_tools.aitoolusage'
                )),
                ('saved_note', models.ForeignKey(
                    on_delete=django.db.models.deletion.SET_NULL,
                    null=True,
                    blank=True,
                    related_name='saved_ai_outputs',
                    to='notes.note'
                )),
            ],
            options={
                'db_table': 'ai_tool_outputs',
                'ordering': ['-created_at'],
            },
        ),
        
        # AIToolQuota model
        migrations.CreateModel(
            name='AIToolQuota',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('daily_limit', models.IntegerField(default=20)),
                ('monthly_limit', models.IntegerField(default=100)),
                ('daily_used', models.IntegerField(default=0)),
                ('monthly_used', models.IntegerField(default=0)),
                ('total_tokens_used', models.BigIntegerField(default=0)),
                ('last_reset_date', models.DateField(auto_now_add=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='ai_quota',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'db_table': 'ai_tool_quotas',
            },
        ),
        
        # Add indexes
        migrations.AddIndex(
            model_name='aitoolusage',
            index=models.Index(fields=['user', '-created_at'], name='ai_usage_user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='aitoolusage',
            index=models.Index(fields=['tool_type', '-created_at'], name='ai_usage_type_created_idx'),
        ),
        migrations.AddIndex(
            model_name='aitoolusage',
            index=models.Index(fields=['user', 'tool_type'], name='ai_usage_user_type_idx'),
        ),
        migrations.AddIndex(
            model_name='aitooloutput',
            index=models.Index(fields=['user', '-created_at'], name='ai_output_user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='aitooloutput',
            index=models.Index(fields=['expires_at'], name='ai_output_expires_idx'),
        ),
    ]
```

### Migration 5: Create Dashboard Tables

```python
# dashboard/migrations/0001_initial.py

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings

class Migration(migrations.Migration):
    
    initial = True
    
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    
    operations = [
        # DashboardCache model
        migrations.CreateModel(
            name='DashboardCache',
            fields=[
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    primary_key=True,
                    related_name='dashboard_cache',
                    to=settings.AUTH_USER_MODEL
                )),
                ('total_notes', models.IntegerField(default=0)),
                ('total_chapters', models.IntegerField(default=0)),
                ('total_topics', models.IntegerField(default=0)),
                ('published_notes', models.IntegerField(default=0)),
                ('draft_notes', models.IntegerField(default=0)),
                ('ai_generations', models.IntegerField(default=0)),
                ('ai_improvements', models.IntegerField(default=0)),
                ('ai_summarizations', models.IntegerField(default=0)),
                ('ai_code_generations', models.IntegerField(default=0)),
                ('total_ai_requests', models.IntegerField(default=0)),
                ('total_tokens_used', models.BigIntegerField(default=0)),
                ('notes_this_week', models.IntegerField(default=0)),
                ('topics_this_week', models.IntegerField(default=0)),
                ('ai_requests_this_week', models.IntegerField(default=0)),
                ('last_activity_at', models.DateTimeField(null=True, blank=True)),
                ('streak_days', models.IntegerField(default=0)),
                ('total_active_days', models.IntegerField(default=0)),
                ('drive_connected', models.BooleanField(default=False)),
                ('total_drive_uploads', models.IntegerField(default=0)),
                ('last_refreshed_at', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'dashboard_cache',
            },
        ),
        
        # ActivityLog model
        migrations.CreateModel(
            name='ActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity_type', models.CharField(
                    max_length=30,
                    choices=[
                        ('note_created', 'Note Created'),
                        ('note_updated', 'Note Updated'),
                        ('note_published', 'Note Published'),
                        ('topic_created', 'Topic Created'),
                        ('ai_generated', 'AI Content Generated'),
                        ('ai_improved', 'Content Improved with AI'),
                        ('drive_uploaded', 'Uploaded to Drive'),
                        ('pdf_exported', 'PDF Exported'),
                    ]
                )),
                ('description', models.CharField(max_length=500)),
                ('note_id', models.IntegerField(null=True, blank=True)),
                ('note_title', models.CharField(max_length=500, blank=True)),
                ('metadata', models.JSONField(default=dict, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='activity_logs',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'db_table': 'activity_logs',
                'ordering': ['-created_at'],
            },
        ),
        
        # Add indexes
        migrations.AddIndex(
            model_name='dashboardcache',
            index=models.Index(fields=['last_refreshed_at'], name='dash_refreshed_idx'),
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['user', '-created_at'], name='activity_user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['activity_type', '-created_at'], name='activity_type_created_idx'),
        ),
    ]
```

### Migration 6: Update Accounts Indexes

```python
# accounts/migrations/0002_add_performance_indexes.py

from django.db import migrations, models

class Migration(migrations.Migration):
    
    dependencies = [
        ('accounts', '0001_initial'),
    ]
    
    operations = [
        # User indexes
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['email'], name='user_email_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['-created_at'], name='user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['is_active', '-last_login_at'], name='user_active_login_idx'),
        ),
    ]
```

---

## 🔄 Data Migration Scripts

### Script 1: Migrate Existing Notes (Remove Course Data)

```python
# scripts/migrate_notes.py

from django.core.management.base import BaseCommand
from notes.models import Note
from django.utils.text import slugify

class Command(BaseCommand):
    help = 'Migrate existing notes to new schema'
    
    def handle(self, *args, **kwargs):
        self.stdout.write('Starting note migration...')
        
        notes = Note.objects.all()
        total = notes.count()
        migrated = 0
        errors = 0
        
        for note in notes:
            try:
                # Generate slug if missing
                if not note.slug:
                    base_slug = slugify(note.title)
                    slug = base_slug
                    counter = 1
                    
                    while Note.objects.filter(slug=slug).exclude(pk=note.pk).exists():
                        slug = f"{base_slug}-{counter}"
                        counter += 1
                    
                    note.slug = slug
                    note.save()
                
                migrated += 1
                
                if migrated % 100 == 0:
                    self.stdout.write(f'Migrated {migrated}/{total} notes...')
            
            except Exception as e:
                errors += 1
                self.stdout.write(self.style.ERROR(f'Error migrating note {note.id}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(
            f'Migration complete! {migrated} migrated, {errors} errors'
        ))
```

### Script 2: Initialize AI Quotas

```python
# scripts/initialize_quotas.py

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from ai_tools.models import AIToolQuota

User = get_user_model()

class Command(BaseCommand):
    help = 'Initialize AI quotas for all users'
    
    def handle(self, *args, **kwargs):
        self.stdout.write('Creating AI quotas...')
        
        users = User.objects.filter(is_active=True)
        created = 0
        
        for user in users:
            quota, is_new = AIToolQuota.objects.get_or_create(
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
```

### Script 3: Initialize Dashboard Caches

```python
# scripts/initialize_dashboards.py

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from dashboard.models import DashboardCache

User = get_user_model()

class Command(BaseCommand):
    help = 'Initialize dashboard caches for all users'
    
    def handle(self, *args, **kwargs):
        self.stdout.write('Initializing dashboard caches...')
        
        users = User.objects.filter(is_active=True)
        total = users.count()
        processed = 0
        
        for user in users:
            try:
                DashboardCache.refresh_for_user(user, force=True)
                processed += 1
                
                if processed % 50 == 0:
                    self.stdout.write(f'Processed {processed}/{total} users...')
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f'Error for user {user.id}: {str(e)}'
                ))
        
        self.stdout.write(self.style.SUCCESS(
            f'Initialized {processed} dashboard caches'
        ))
```

---

## 🚀 Deployment Steps

### 1. Pre-Migration Checklist

```bash
# Create backup
pg_dump noteassist_ai_db > backup_pre_migration.sql

# Put site in maintenance mode
echo "MAINTENANCE_MODE=True" >> .env

# Stop all services
sudo systemctl stop gunicorn
sudo systemctl stop celery
sudo systemctl stop celery-beat
```

### 2. Run Migrations

```bash
# Run all migrations in order
python manage.py migrate notes 0002_remove_course_dependencies
python manage.py migrate notes 0003_add_performance_indexes
python manage.py migrate notes 0004_add_slug_field
python manage.py migrate ai_tools 0001_initial
python manage.py migrate dashboard 0001_initial
python manage.py migrate accounts 0002_add_performance_indexes

# Or run all at once
python manage.py migrate
```

### 3. Run Data Migrations

```bash
# Migrate existing notes
python manage.py migrate_notes

# Initialize AI quotas
python manage.py initialize_quotas

# Initialize dashboard caches
python manage.py initialize_dashboards
```

### 4. Verify Migration

```bash
# Check database integrity
python manage.py check

# Test queries
python manage.py shell
>>> from notes.models import Note
>>> Note.objects.first()
>>> Note.objects.first().chapters.all()

# Verify indexes
python manage.py dbshell
\d+ notes_note
\d+ ai_tool_usage
\d+ dashboard_cache
```

### 5. Post-Migration

```bash
# Collect static files
python manage.py collectstatic --noinput

# Clear cache
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()

# Start services
sudo systemctl start gunicorn
sudo systemctl start celery
sudo systemctl start celery-beat

# Remove maintenance mode
echo "MAINTENANCE_MODE=False" >> .env

# Monitor logs
tail -f /var/log/noteassist-ai/django.log
```

---

## 🔍 Verification Queries

```sql
-- Check note migration
SELECT COUNT(*) FROM notes_note;
SELECT COUNT(*) FROM notes_note WHERE slug IS NOT NULL;

-- Check AI tools tables
SELECT COUNT(*) FROM ai_tool_usage;
SELECT COUNT(*) FROM ai_tool_quotas;
SELECT COUNT(*) FROM ai_tool_outputs;

-- Check dashboard tables
SELECT COUNT(*) FROM dashboard_cache;
SELECT COUNT(*) FROM activity_logs;

-- Check indexes
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('notes_note', 'ai_tool_usage', 'dashboard_cache');

-- Performance test
EXPLAIN ANALYZE 
SELECT * FROM notes_note 
WHERE user_id = 1 
ORDER BY updated_at DESC 
LIMIT 10;
```

---

## ⚠️ Rollback Plan

If migration fails:

```bash
# 1. Restore database from backup
psql noteassist_ai_db < backup_pre_migration.sql

# 2. Restore media files
tar -xzf media_backup_*.tar.gz

# 3. Revert code changes
git checkout main

# 4. Restart services
sudo systemctl restart gunicorn
sudo systemctl restart celery
```

---

## ✅ Success Criteria

Migration is successful when:

- [ ] All migrations applied without errors
- [ ] All notes have valid slugs
- [ ] All users have AI quotas
- [ ] All users have dashboard caches
- [ ] All database indexes created
- [ ] No foreign key errors in logs
- [ ] API endpoints responding correctly
- [ ] Frontend displaying data properly
- [ ] Background tasks running
- [ ] Performance metrics within targets

**Migration Complete!** 🎉
