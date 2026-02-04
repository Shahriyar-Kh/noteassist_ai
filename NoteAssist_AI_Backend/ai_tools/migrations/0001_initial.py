from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('notes', '0004_add_performance_indexes'),
    ]

    operations = [
        migrations.CreateModel(
            name='AIToolUsage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tool_type', models.CharField(choices=[('generate', 'Generate Topic'), ('improve', 'Improve Content'), ('summarize', 'Summarize'), ('code', 'Generate Code')], db_index=True, max_length=20)),
                ('input_text', models.TextField()),
                ('output_text', models.TextField()),
                ('tokens_used', models.IntegerField(default=0)),
                ('response_time', models.FloatField(help_text='Response time in seconds')),
                ('model_used', models.CharField(default='llama-3.3-70b-versatile', max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('note', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ai_generations', to='notes.note')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ai_tool_usages', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'ai_tool_usages',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AIToolQuota',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('monthly_limit', models.IntegerField(default=100)),
                ('monthly_used', models.IntegerField(default=0)),
                ('daily_limit', models.IntegerField(default=20)),
                ('daily_used', models.IntegerField(default=0)),
                ('last_reset_date', models.DateField(auto_now_add=True)),
                ('total_tokens_used', models.BigIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='ai_quota', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'ai_tool_quotas',
            },
        ),
        migrations.CreateModel(
            name='AIToolOutput',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=500)),
                ('content', models.TextField()),
                ('language', models.CharField(blank=True, max_length=50)),
                ('drive_file_id', models.CharField(blank=True, max_length=255, null=True)),
                ('drive_url', models.URLField(blank=True, null=True)),
                ('download_count', models.IntegerField(default=0)),
                ('last_downloaded_at', models.DateTimeField(blank=True, null=True)),
                ('expires_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('usage', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='output', to='ai_tools.aitoolusage')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ai_tool_outputs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'ai_tool_outputs',
                'ordering': ['-created_at'],
            },
        ),
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
