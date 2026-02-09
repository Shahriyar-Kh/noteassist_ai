# Implementation Guide Part 3 - Performance, Testing & Deployment

## ⚡ Phase 4: Performance Optimization (Days 10-12)

### 1. Redis Configuration

```python
# settings/production.py (or settings.py)

# Redis Configuration
REDIS_URL = config('REDIS_URL', default='redis://127.0.0.1:6379')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'{REDIS_URL}/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'PARSER_CLASS': 'redis.connection.HiredisParser',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
        },
        'KEY_PREFIX': 'studynotes',
        'TIMEOUT': 3600,  # 1 hour default
    },
    'ai_cache': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'{REDIS_URL}/2',
        'TIMEOUT': 86400,  # 24 hours for AI responses
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
    },
    'session': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'{REDIS_URL}/3',
        'TIMEOUT': 1209600,  # 2 weeks
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
    },
}

# Use Redis for sessions
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'session'
```

### 2. Query Optimization Middleware

```python
# utils/middleware.py

import logging
from django.db import connection
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class QueryCountDebugMiddleware(MiddlewareMixin):
    """
    Middleware to log database query counts
    Use only in development/staging
    """
    
    def process_response(self, request, response):
        if settings.DEBUG:
            query_count = len(connection.queries)
            
            if query_count > 20:  # Alert if too many queries
                logger.warning(
                    f'High query count: {query_count} queries for {request.path}'
                )
                
                # Log the actual queries for debugging
                for i, query in enumerate(connection.queries, 1):
                    logger.debug(f"Query {i}: {query['sql'][:200]}")
        
        return response


class CacheHeadersMiddleware(MiddlewareMixin):
    """
    Add cache headers for static content
    """
    
    def process_response(self, request, response):
        # Cache static files for 1 year
        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            response['Cache-Control'] = 'public, max-age=31536000'
        
        # Don't cache API responses by default
        elif request.path.startswith('/api/'):
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
        
        return response
```

### 3. Database Connection Pooling

```python
# settings/production.py

# Database optimization for production
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT', default='5432'),
        
        # Connection pooling
        'CONN_MAX_AGE': 600,  # 10 minutes
        
        # Performance options
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000',  # 30 seconds
            
            # Connection pooling via PgBouncer (if available)
            'pool_pre_ping': True,
            'pool_size': 20,
            'max_overflow': 10,
        },
        
        # Disable persistent connections in development
        'DISABLE_SERVER_SIDE_CURSORS': True,
    }
}

# Install django-db-connection-pool for better connection pooling
# pip install django-db-connection-pool

# Alternative: Use pgbouncer or pgpool
```

### 4. API Response Compression

```python
# settings.py

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    
    # Add GZip compression
    'django.middleware.gzip.GZipMiddleware',  # ADD THIS
    
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    
    # Custom middleware
    'utils.middleware.CacheHeadersMiddleware',
]

# GZip settings
GZIP_COMPRESSION_LEVEL = 6
GZIP_MINIMUM_SIZE = 1024  # Only compress responses > 1KB
```

### 5. Optimized Serializers with select_related

```python
# notes/serializers.py - OPTIMIZED VERSION

class NoteDetailSerializer(serializers.ModelSerializer):
    """Optimized note detail serializer"""
    
    chapters = serializers.SerializerMethodField()
    
    class Meta:
        model = Note
        fields = [
            'id', 'title', 'slug', 'tags', 'status',
            'chapters', 'created_at', 'updated_at'
        ]
    
    def get_chapters(self, obj):
        """
        Use prefetched data to avoid N+1 queries
        """
        # This assumes chapters are already prefetched in the view
        chapters = obj.chapters.all()
        
        # Serialize without triggering additional queries
        return [
            {
                'id': chapter.id,
                'title': chapter.title,
                'order': chapter.order,
                'topics': [
                    {
                        'id': topic.id,
                        'name': topic.name,
                        'order': topic.order,
                        'has_explanation': topic.explanation_id is not None,
                        'has_code': topic.code_snippet_id is not None,
                        'has_source': topic.source_id is not None,
                    }
                    for topic in chapter.topics.all()
                ]
            }
            for chapter in chapters
        ]


# notes/views.py - OPTIMIZED QUERYSET

class NoteViewSet(viewsets.ModelViewSet):
    
    def get_queryset(self):
        """
        Optimized queryset with minimal queries
        """
        return Note.objects.filter(
            user=self.request.user
        ).select_related(
            'user'
        ).prefetch_related(
            Prefetch(
                'chapters',
                queryset=Chapter.objects.order_by('order').prefetch_related(
                    Prefetch(
                        'topics',
                        queryset=ChapterTopic.objects.select_related(
                            'explanation',
                            'code_snippet',
                            'source'
                        ).order_by('order')
                    )
                )
            )
        ).annotate(
            chapter_count=Count('chapters', distinct=True),
            topic_count=Count('chapters__topics', distinct=True)
        )
```

### 6. API Rate Limiting

```python
# utils/throttling.py

from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

class BurstRateThrottle(UserRateThrottle):
    """Allow burst of requests"""
    rate = '60/min'

class SustainedRateThrottle(UserRateThrottle):
    """Sustained rate limit"""
    rate = '1000/day'

class AIToolRateThrottle(UserRateThrottle):
    """Strict rate limit for AI tools"""
    rate = '20/hour'


# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'utils.throttling.BurstRateThrottle',
        'utils.throttling.SustainedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'burst': '60/min',
        'sustained': '1000/day',
        'ai_tools': '20/hour',
    }
}


# ai_tools/views.py - Apply throttling
from utils.throttling import AIToolRateThrottle

class AIToolsViewSet(viewsets.ViewSet):
    throttle_classes = [AIToolRateThrottle]
    # ... rest of the code
```

### 7. Background Task Processing

```python
# celery.py - Enhanced configuration

from celery import Celery
from celery.schedules import crontab
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'NoteAssist_AI.settings')

app = Celery('studynotes')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Task discovery
app.autodiscover_tasks()

# Celery Beat Schedule
app.conf.beat_schedule = {
    # Refresh all dashboard caches daily at 2 AM
    'refresh-dashboards': {
        'task': 'dashboard.tasks.refresh_all_dashboards',
        'schedule': crontab(hour=2, minute=0),
    },
    
    # Calculate system stats hourly
    'calculate-system-stats': {
        'task': 'admin_dashboard.tasks.calculate_system_stats',
        'schedule': crontab(minute=0),  # Every hour
    },
    
    # Cleanup expired AI outputs daily at 3 AM
    'cleanup-expired-ai-outputs': {
        'task': 'ai_tools.tasks.cleanup_expired_outputs',
        'schedule': crontab(hour=3, minute=0),
    },
    
    # Weekly activity log cleanup
    'cleanup-activity-logs': {
        'task': 'dashboard.tasks.cleanup_old_activity_logs',
        'schedule': crontab(hour=4, minute=0, day_of_week=0),  # Sunday 4 AM
    },
}

# Celery configuration
app.conf.update(
    result_expires=3600,
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Performance settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    
    # Task routing
    task_routes={
        'ai_tools.tasks.*': {'queue': 'ai'},
        'dashboard.tasks.*': {'queue': 'default'},
    },
)


# ai_tools/tasks.py
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task
def cleanup_expired_outputs():
    """
    Delete expired AI outputs
    Run daily
    """
    from .models import AIToolOutput
    
    now = timezone.now()
    expired = AIToolOutput.objects.filter(expires_at__lt=now)
    
    count = expired.count()
    expired.delete()
    
    logger.info(f"Cleaned up {count} expired AI outputs")
    return count


@shared_task
def process_ai_request_async(user_id, tool_type, **kwargs):
    """
    Process AI request asynchronously
    For long-running AI operations
    """
    from django.contrib.auth import get_user_model
    from .services import AIToolsService
    
    User = get_user_model()
    user = User.objects.get(id=user_id)
    
    service = AIToolsService()
    result = service.process_tool(user, tool_type, **kwargs)
    
    return result


# admin_dashboard/tasks.py
@shared_task
def calculate_system_stats():
    """
    Calculate system statistics
    Run hourly
    """
    from .models import SystemStats
    
    stats = SystemStats.calculate_stats()
    logger.info(f"System stats calculated: {stats.total_users} users, {stats.total_notes} notes")
    
    return {
        'total_users': stats.total_users,
        'total_notes': stats.total_notes,
        'calculated_at': stats.calculated_at.isoformat()
    }
```

---

## 🧪 Phase 5: Testing Strategy (Days 13-14)

### 1. Unit Tests for AI Tools

```python
# ai_tools/tests/test_models.py

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
            full_name='Test User',
            country='USA',
            education_level='undergraduate',
            field_of_study='Computer Science',
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
        # Create multiple usages
        for i in range(5):
            AIToolUsage.objects.create(
                user=self.user,
                tool_type='generate',
                input_text=f'Test {i}',
                output_text=f'Output {i}',
                response_time=1.0
            )
        
        # Query should be efficient with indexes
        with self.assertNumQueries(1):
            list(AIToolUsage.objects.filter(user=self.user).order_by('-created_at'))


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
        
        # Use up daily quota
        self.quota.daily_used = 10
        self.quota.save()
        
        self.assertFalse(self.quota.can_use_tool())
    
    def test_daily_reset(self):
        """Test daily quota reset"""
        self.quota.daily_used = 5
        self.quota.last_reset_date = timezone.now().date() - timedelta(days=1)
        self.quota.save()
        
        # Reset should happen
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


# ai_tools/tests/test_views.py

from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from ai_tools.models import AIToolOutput, AIToolQuota

User = get_user_model()


class AIToolsAPITest(APITestCase):
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            terms_accepted=True
        )
        self.client.force_authenticate(user=self.user)
        
        # Create quota
        AIToolQuota.objects.create(
            user=self.user,
            daily_limit=10,
            monthly_limit=100
        )
    
    def test_generate_endpoint(self):
        """Test AI generation endpoint"""
        data = {
            'topic': 'Python Functions',
            'level': 'beginner',
            'subject_area': 'programming'
        }
        
        response = self.client.post('/api/ai-tools/generate/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('output', response.data)
        self.assertIn('success', response.data)
        self.assertTrue(response.data['success'])
    
    def test_quota_enforcement(self):
        """Test that quota is enforced"""
        # Use up quota
        quota = self.user.ai_quota
        quota.daily_used = quota.daily_limit
        quota.save()
        
        data = {
            'topic': 'Test Topic',
            'level': 'beginner'
        }
        
        response = self.client.post('/api/ai-tools/generate/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quota_exceeded', response.data)
    
    def test_list_outputs(self):
        """Test listing user outputs"""
        # Create some outputs
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
        self.assertEqual(len(response.data['results']), 3)
```

### 2. Integration Tests

```python
# tests/integration/test_note_workflow.py

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from notes.models import Note, Chapter, ChapterTopic
from ai_tools.models import AIToolUsage, AIToolOutput

User = get_user_model()


class NoteCreationWorkflowTest(TestCase):
    """
    Test complete workflow: AI generation → Save to note → Export
    """
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            terms_accepted=True
        )
        self.client.force_authenticate(user=self.user)
    
    def test_complete_workflow(self):
        """Test: Generate AI content → Save to note → Export PDF"""
        
        # Step 1: Generate AI content
        response = self.client.post('/api/ai-tools/generate/', {
            'topic': 'Python Decorators',
            'level': 'intermediate'
        })
        
        self.assertEqual(response.status_code, 201)
        output_id = response.data['output']['id']
        
        # Step 2: Save to note
        response = self.client.post(f'/api/ai-tools/outputs/{output_id}/save/', {
            'note_title': 'My Python Notes',
            'chapter_title': 'Advanced Concepts'
        })
        
        self.assertEqual(response.status_code, 200)
        note_id = response.data['note_id']
        
        # Step 3: Verify note structure
        note = Note.objects.get(id=note_id)
        self.assertEqual(note.title, 'My Python Notes')
        self.assertEqual(note.chapters.count(), 1)
        
        chapter = note.chapters.first()
        self.assertEqual(chapter.title, 'Advanced Concepts')
        self.assertEqual(chapter.topics.count(), 1)
        
        # Step 4: Export PDF
        response = self.client.post(f'/api/notes/{note_id}/export_pdf/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
```

### 3. Performance Tests

```python
# tests/performance/test_query_optimization.py

from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.db import connection
from rest_framework.test import APIClient

from notes.models import Note, Chapter, ChapterTopic
from django.contrib.auth import get_user_model

User = get_user_model()


class QueryOptimizationTest(TestCase):
    """Test that views use optimal number of queries"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            terms_accepted=True
        )
        self.client.force_authenticate(user=self.user)
        
        # Create test data
        self._create_test_data(num_notes=10, topics_per_note=5)
    
    def _create_test_data(self, num_notes, topics_per_note):
        """Create test notes with chapters and topics"""
        for i in range(num_notes):
            note = Note.objects.create(
                user=self.user,
                title=f'Note {i}'
            )
            
            chapter = Chapter.objects.create(
                note=note,
                title=f'Chapter {i}',
                order=0
            )
            
            for j in range(topics_per_note):
                ChapterTopic.objects.create(
                    chapter=chapter,
                    name=f'Topic {j}',
                    order=j
                )
    
    def test_note_list_query_count(self):
        """Test note list uses minimal queries"""
        with CaptureQueriesContext(connection) as context:
            response = self.client.get('/api/notes/')
            
            # Should use ≤ 5 queries regardless of data size
            self.assertLessEqual(
                len(context.captured_queries), 
                5,
                f"Too many queries: {len(context.captured_queries)}"
            )
            
            self.assertEqual(response.status_code, 200)
    
    def test_note_detail_query_count(self):
        """Test note detail uses prefetch efficiently"""
        note = Note.objects.first()
        
        with CaptureQueriesContext(connection) as context:
            response = self.client.get(f'/api/notes/{note.id}/')
            
            # Should use ≤ 3 queries with proper prefetch
            self.assertLessEqual(
                len(context.captured_queries),
                3,
                f"Too many queries: {len(context.captured_queries)}"
            )
            
            self.assertEqual(response.status_code, 200)
    
    def test_dashboard_query_efficiency(self):
        """Test dashboard doesn't do N+1 queries"""
        with CaptureQueriesContext(connection) as context:
            response = self.client.get('/api/dashboard/overview/')
            
            # Should use minimal queries
            self.assertLessEqual(len(context.captured_queries), 10)
            self.assertEqual(response.status_code, 200)
```

### 4. Load Testing with Locust

```python
# tests/load/locustfile.py

from locust import HttpUser, task, between, SequentialTaskSet
import random


class UserBehavior(SequentialTaskSet):
    """Simulate realistic user behavior"""
    
    def on_start(self):
        """Login on start"""
        response = self.client.post("/api/token/", json={
            "email": "loadtest@example.com",
            "password": "loadtest123"
        })
        
        if response.status_code == 200:
            self.token = response.json()['access']
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task
    def view_dashboard(self):
        """View dashboard"""
        if self.token:
            self.client.get("/api/dashboard/overview/", headers=self.headers)
    
    @task(3)
    def list_notes(self):
        """List notes (weighted higher - common action)"""
        if self.token:
            self.client.get("/api/notes/", headers=self.headers)
    
    @task(2)
    def view_note(self):
        """View random note"""
        if self.token:
            note_id = random.randint(1, 100)
            self.client.get(f"/api/notes/{note_id}/", headers=self.headers)
    
    @task
    def generate_ai(self):
        """Generate AI content"""
        if self.token:
            topics = [
                "Python Functions",
                "JavaScript Closures",
                "SQL Joins",
                "React Hooks",
                "Django ORM"
            ]
            
            self.client.post("/api/ai-tools/generate/", 
                json={
                    "topic": random.choice(topics),
                    "level": random.choice(['beginner', 'intermediate', 'advanced'])
                },
                headers=self.headers
            )


class WebsiteUser(HttpUser):
    """Load test user"""
    tasks = [UserBehavior]
    wait_time = between(1, 5)  # Wait 1-5 seconds between tasks
    host = "http://localhost:8000"


# Run with:
# locust -f tests/load/locustfile.py --host=http://localhost:8000
# Then open http://localhost:8089

# Target: 10,000 concurrent users
# Expected: p95 response time < 200ms
```

---

## 🚀 Phase 6: Production Deployment (Days 15-16)

### 1. Production Settings

```python
# settings/production.py

import os
from .base import *
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

DEBUG = False

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

# Security
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Static files
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Database - Production
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT', default='5432'),
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000',
        },
    }
}

# Sentry Error Tracking
sentry_sdk.init(
    dsn=config('SENTRY_DSN', default=''),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,  # 10% of transactions
    send_default_pii=False,
    environment='production',
)

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/studynotes/django.log',
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'sentry': {
            'level': 'ERROR',
            'class': 'sentry_sdk.integrations.logging.EventHandler',
        },
    },
    'root': {
        'handlers': ['console', 'file', 'sentry'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'ai_tools': {
            'handlers': ['console', 'file', 'sentry'],
            'level': 'INFO',
        },
    },
}
```

### 2. Gunicorn Configuration

```python
# gunicorn.conf.py

import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'gthread'
threads = 4
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 120
keepalive = 5
graceful_timeout = 30

# Logging
accesslog = '/var/log/studynotes/gunicorn-access.log'
errorlog = '/var/log/studynotes/gunicorn-error.log'
loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'studynotes_gunicorn'

# Server mechanics
daemon = False
pidfile = '/var/run/studynotes/gunicorn.pid'
user = 'www-data'
group = 'www-data'
tmp_upload_dir = None

# Performance
worker_tmp_dir = '/dev/shm'  # Use RAM for better performance

# SSL (if needed)
# keyfile = '/path/to/key.pem'
# certfile = '/path/to/cert.pem'


def on_starting(server):
    """Called before master process is initialized"""
    print("Gunicorn master starting")


def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP"""
    print("Gunicorn reloading")


def when_ready(server):
    """Called after workers are started"""
    print("Gunicorn ready. Workers spawned")


def on_exit(server):
    """Called before master process exits"""
    print("Gunicorn master exiting")
```



## 📋 Final Checklist

### Pre-Deployment
- [ ] All tests passing (unit, integration, performance)
- [ ] Database migrations created and tested
- [ ] Environment variables configured
- [ ] Redis configured and tested
- [ ] Celery tasks scheduled
- [ ] Static files collected
- [ ] SSL certificates installed
- [ ] Backup strategy implemented
- [ ] Monitoring configured (Sentry, logs)
- [ ] Load testing completed (10k users)

### Post-Deployment
- [ ] Health checks passing
- [ ] API endpoints responding
- [ ] Background tasks running
- [ ] Cache working correctly
- [ ] Database queries optimized
- [ ] Error tracking active
- [ ] Performance metrics within targets
- [ ] Documentation updated

### Performance Targets ✅
- API Response Time: < 200ms (p95)
- Database Queries: < 5 per request
- Concurrent Users: 10,000+
- Uptime: 99.9%
- Test Coverage: > 80%

**Implementation Complete!** 🎉
