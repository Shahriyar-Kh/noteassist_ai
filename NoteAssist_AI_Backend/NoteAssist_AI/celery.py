import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'NoteAssist_AI.settings')

app = Celery('studynotes')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')


app.conf.beat_schedule = {
    'cleanup-expired-ai-outputs': {
        'task': 'ai_tools.tasks.cleanup_expired_outputs',
        'schedule': crontab(hour=3, minute=0),
    },
    'cleanup-activity-logs': {
        'task': 'dashboard.tasks.cleanup_old_activity_logs',
        'schedule': crontab(hour=4, minute=0, day_of_week=0),
    },
}

app.conf.update(
    result_expires=3600,
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    task_routes={
        'ai_tools.tasks.*': {'queue': 'ai'},
        'dashboard.tasks.*': {'queue': 'default'},
    },
)