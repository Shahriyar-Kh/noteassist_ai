from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DashboardCache',
            fields=[
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name='dashboard_cache', serialize=False, to=settings.AUTH_USER_MODEL)),
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
                ('last_activity_at', models.DateTimeField(blank=True, null=True)),
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
        migrations.CreateModel(
            name='ActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity_type', models.CharField(choices=[('note_created', 'Note Created'), ('note_updated', 'Note Updated'), ('note_published', 'Note Published'), ('topic_created', 'Topic Created'), ('ai_generated', 'AI Content Generated'), ('ai_improved', 'Content Improved with AI'), ('drive_uploaded', 'Uploaded to Drive'), ('pdf_exported', 'PDF Exported')], max_length=30)),
                ('description', models.CharField(max_length=500)),
                ('note_id', models.IntegerField(blank=True, null=True)),
                ('note_title', models.CharField(blank=True, max_length=500)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activity_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'activity_logs',
                'ordering': ['-created_at'],
            },
        ),
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
