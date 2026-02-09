# NoteAssist AI - Backend Refactoring Plan

## Executive Summary
Build and refactor NoteAssist AI into a standalone, enterprise-grade AI-powered study notes platform with enhanced performance, security, and scalability.

---

## 1. Architecture Overview

### Current State Analysis
**Strengths:**
- ✅ Robust authentication system (accounts app)
- ✅ Complete notes module with chapters/topics structure
- ✅ Advanced AI integration (Groq API)
- ✅ Google Drive integration
- ✅ PDF export functionality
- ✅ Code execution service

**Areas for Improvement:**
- 🔧 Performance optimization (caching, database queries)
- 🔧 API response structure standardization
- 🔧 Enhanced monitoring and analytics
- 🔧 Scalability for 10,000+ concurrent users
- 🔧 Better separation of concerns

### Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER                        │
│  - Rate Limiting - Authentication - Request Validation       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐
│   Auth Module  │  │ Notes Module│  │  AI Tools Module│
│  - Users       │  │ - Notes     │  │  - Generate     │
│  - Profiles    │  │ - Chapters  │  │  - Improve      │
│  - Sessions    │  │ - Topics    │  │  - Summarize    │
└────────────────┘  └─────────────┘  └─────────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼────────┐                    ┌────────▼────────┐
│  Data Layer    │                    │  Cache Layer    │
│  - PostgreSQL  │                    │  - Redis        │
│  - Optimized   │                    │  - Query Cache  │
│    Queries     │                    │  - Session      │
└────────────────┘                    └─────────────────┘
```

---

## 2. Module Extraction & Refactoring

### 2.1 Core Modules to Keep (As-Is with Optimizations)

#### A. Authentication Module (`accounts/`)
**Status:** ✅ Keep with minor optimizations

**Files to Retain:**
- `models.py` - Custom User model
- `backends.py` - Email authentication
- `serializers.py` - JWT with custom claims
- `views.py` - Auth endpoints
- `permissions.py` - Custom permissions

**Optimizations:**
```python
# Add database indexing
class User(AbstractUser):
    class Meta:
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_active', 'email_verified']),
        ]

# Add query optimization
def get_active_users():
    return User.objects.filter(is_active=True).select_related('profile')
```

#### B. Notes Module (`notes/`)
**Status:** ✅ Keep core logic, enhance performance

**Files to Retain:**
- `models.py` - Note/Chapter/Topic models
- `serializers.py` - API serializers
- `views.py` - CRUD operations
- `services.py` - Business logic
- `ai_service.py` - AI integration
- `pdf_service.py` - PDF export
- `google_drive_service.py` - Google Drive integration

**Performance Enhancements:**
```python
# Add query optimization
class NoteViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Note.objects.filter(
            user=self.request.user
        ).select_related('user').prefetch_related(
            Prefetch('chapters__topics__explanation'),
            Prefetch('chapters__topics__code_snippet'),
        ).annotate(
            chapter_count=Count('chapters'),
            topic_count=Count('chapters__topics')
        )

# Add caching for AI requests
from django.core.cache import cache

def generate_ai_explanation(topic_name, cache_timeout=3600):
    cache_key = f"ai_explanation:{hash(topic_name)}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    
    result = _call_groq_api(topic_name)
    cache.set(cache_key, result, cache_timeout)
    return result
```

#### C. Profiles Module (`profiles/`)
**Status:** ✅ Keep and enhance

**Files to Retain:**
- `models.py` - Profile, NotificationSettings
- `serializers.py` - Profile serializers
- `views.py` - Profile endpoints

---

### 2.2 Modules to Remove/Refactor

#### A. Courses Module
**Action:** ❌ REMOVE (out of scope)
**Impact:** 
- Remove foreign key relationships from Note model
- Clean up database migrations

```python
# Before (in notes/models.py)
class Note(models.Model):
    course = models.ForeignKey(Course, ...)  # REMOVE
    course_topic = models.ForeignKey(CourseTopic, ...)  # REMOVE

# After
class Note(models.Model):
    # Remove course-related fields
    # Keep only: user, title, slug, tags, status, chapters
```

#### B. Roadmaps Module
**Action:** ❌ REMOVE
**Reason:** Not part of core StudyNotes functionality

#### C. Analytics Module
**Action:** 🔄 REFACTOR into Dashboard
**New Structure:**
```
dashboard/
├── __init__.py
├── models.py          # DashboardCache model
├── serializers.py     # Stats serializers
├── views.py           # Dashboard API endpoints
├── services.py        # Stats calculation logic
└── tasks.py           # Background stats updates
```

---

## 3. New Module: Standalone AI Tools

### 3.1 AI Tools Service Architecture

```python
# ai_tools/
# ├── __init__.py
# ├── models.py
# ├── serializers.py
# ├── views.py
# ├── services.py
# └── tasks.py

# ai_tools/models.py
class AIToolUsage(models.Model):
    """Track all AI tool usage"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    tool_type = models.CharField(choices=[
        ('generate', 'Generate Topic'),
        ('improve', 'Improve Content'),
        ('summarize', 'Summarize'),
        ('code', 'Generate Code'),
    ])
    input_text = models.TextField()
    output_text = models.TextField()
    tokens_used = models.IntegerField(default=0)
    response_time = models.FloatField()  # in seconds
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Optional: Link to note if saved
    note = models.ForeignKey('notes.Note', null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['tool_type', '-created_at']),
        ]

class AIToolOutput(models.Model):
    """Standalone AI tool outputs (not saved to notes)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    tool_usage = models.OneToOneField(AIToolUsage)
    title = models.CharField(max_length=500)
    content = models.TextField()
    language = models.CharField(max_length=50, blank=True)  # for code
    
    # Google Drive integration
    drive_file_id = models.CharField(max_length=255, blank=True)
    
    # Download tracking
    download_count = models.IntegerField(default=0)
    last_downloaded_at = models.DateTimeField(null=True)
    
    expires_at = models.DateTimeField()  # Auto-delete after 30 days
    
    class Meta:
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]
```

### 3.2 AI Tools API Endpoints

```python
# ai_tools/views.py
class AIToolsViewSet(viewsets.ViewSet):
    """
    Standalone AI Tools API
    
    POST /api/ai-tools/generate/
    POST /api/ai-tools/improve/
    POST /api/ai-tools/summarize/
    POST /api/ai-tools/code/
    GET  /api/ai-tools/history/
    POST /api/ai-tools/{id}/save-to-note/
    POST /api/ai-tools/{id}/download/
    POST /api/ai-tools/{id}/upload-to-drive/
    DELETE /api/ai-tools/{id}/
    """
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate topic explanation"""
        serializer = AIGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Call AI service with timing
        start_time = time.time()
        output = ai_service.generate_explanation(
            topic_name=serializer.validated_data['topic'],
            level=serializer.validated_data.get('level', 'beginner')
        )
        response_time = time.time() - start_time
        
        # Create usage record
        usage = AIToolUsage.objects.create(
            user=request.user,
            tool_type='generate',
            input_text=serializer.validated_data['topic'],
            output_text=output,
            response_time=response_time,
        )
        
        # Create standalone output
        ai_output = AIToolOutput.objects.create(
            user=request.user,
            tool_usage=usage,
            title=serializer.validated_data['topic'],
            content=output,
            expires_at=timezone.now() + timedelta(days=30)
        )
        
        return Response({
            'id': ai_output.id,
            'title': ai_output.title,
            'content': ai_output.content,
            'created_at': ai_output.created_at,
            'expires_at': ai_output.expires_at,
            'actions': {
                'save_to_note': f'/api/ai-tools/{ai_output.id}/save-to-note/',
                'download': f'/api/ai-tools/{ai_output.id}/download/',
                'upload_to_drive': f'/api/ai-tools/{ai_output.id}/upload-to-drive/',
            }
        })
    
    @action(detail=True, methods=['post'])
    def save_to_note(self, request, pk=None):
        """Save AI output to a note"""
        ai_output = self.get_object()
        
        # Create note with AI content
        note = Note.objects.create(
            user=request.user,
            title=ai_output.title,
            status='draft'
        )
        
        chapter = Chapter.objects.create(
            note=note,
            title=ai_output.title,
            order=0
        )
        
        topic = ChapterTopic.objects.create(
            chapter=chapter,
            name=ai_output.title,
            order=0
        )
        
        explanation = TopicExplanation.objects.create(
            content=ai_output.content
        )
        topic.explanation = explanation
        topic.save()
        
        # Link usage to note
        ai_output.tool_usage.note = note
        ai_output.tool_usage.save()
        
        return Response({
            'note_id': note.id,
            'message': 'Content saved to note successfully'
        })
```

---

## 4. Performance Optimization Strategy

### 4.1 Database Optimization

```python
# Add comprehensive indexing
class Meta:
    indexes = [
        # Frequently queried fields
        models.Index(fields=['user', '-created_at']),
        models.Index(fields=['user', 'status']),
        
        # Composite indexes for complex queries
        models.Index(fields=['user', 'status', '-updated_at']),
    ]

# Query optimization examples
def get_user_notes_optimized(user):
    """Optimized query with prefetch"""
    return Note.objects.filter(user=user).select_related(
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

### 4.2 Caching Strategy

```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'PARSER_CLASS': 'redis.connection.HiredisParser',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
        },
        'KEY_PREFIX': 'studynotes',
        'TIMEOUT': 3600,  # 1 hour default
    },
    'ai_cache': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://127.0.0.1:6379/2'),
        'TIMEOUT': 86400,  # 24 hours for AI responses
    },
    'session': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://127.0.0.1:6379/3'),
        'TIMEOUT': 1209600,  # 2 weeks
    },
}

SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'session'

# Cache implementation
from django.core.cache import caches
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

ai_cache = caches['ai_cache']

class NoteViewSet(viewsets.ModelViewSet):
    @method_decorator(cache_page(300, cache='default', key_prefix='note_list'))
    def list(self, request):
        # List endpoint cached for 5 minutes
        return super().list(request)
    
    def retrieve(self, request, pk=None):
        cache_key = f'note_detail:{pk}:{request.user.id}'
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        response = super().retrieve(request, pk)
        cache.set(cache_key, response.data, timeout=600)  # 10 minutes
        return response
```

### 4.3 API Response Optimization

```python
# utils/pagination.py
from rest_framework.pagination import CursorPagination

class OptimizedCursorPagination(CursorPagination):
    """
    More efficient than PageNumberPagination for large datasets
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    ordering = '-created_at'

# Apply to settings
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'utils.pagination.OptimizedCursorPagination',
    'PAGE_SIZE': 20,
    
    # Response optimization
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    
    # Only include BrowsableAPIRenderer in debug mode
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ) if not DEBUG else (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
}
```

---

## 5. Enhanced Dashboard API

### 5.1 Dashboard Models

```python
# dashboard/models.py
class DashboardCache(models.Model):
    """Cache dashboard statistics"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    
    # Counts
    total_notes = models.IntegerField(default=0)
    total_chapters = models.IntegerField(default=0)
    total_topics = models.IntegerField(default=0)
    
    # AI Usage
    ai_generations = models.IntegerField(default=0)
    ai_improvements = models.IntegerField(default=0)
    ai_summarizations = models.IntegerField(default=0)
    ai_code_generations = models.IntegerField(default=0)
    
    # Activity
    notes_this_week = models.IntegerField(default=0)
    topics_this_week = models.IntegerField(default=0)
    last_activity = models.DateTimeField(null=True)
    
    # Timestamps
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'dashboard_cache'
        indexes = [
            models.Index(fields=['user', 'last_updated']),
        ]
    
    @classmethod
    def refresh_for_user(cls, user):
        """Refresh dashboard stats for a user"""
        from django.db.models import Count, Q
        from datetime import timedelta
        
        week_ago = timezone.now() - timedelta(days=7)
        
        stats = {
            'total_notes': user.notes.count(),
            'total_chapters': Chapter.objects.filter(note__user=user).count(),
            'total_topics': ChapterTopic.objects.filter(chapter__note__user=user).count(),
            'ai_generations': AIToolUsage.objects.filter(user=user, tool_type='generate').count(),
            'ai_improvements': AIToolUsage.objects.filter(user=user, tool_type='improve').count(),
            'ai_summarizations': AIToolUsage.objects.filter(user=user, tool_type='summarize').count(),
            'ai_code_generations': AIToolUsage.objects.filter(user=user, tool_type='code').count(),
            'notes_this_week': user.notes.filter(created_at__gte=week_ago).count(),
            'topics_this_week': ChapterTopic.objects.filter(
                chapter__note__user=user,
                created_at__gte=week_ago
            ).count(),
            'last_activity': user.notes.aggregate(
                last=Max('updated_at')
            )['last'] or user.created_at,
        }
        
        cache, created = cls.objects.update_or_create(
            user=user,
            defaults=stats
        )
        
        return cache
```

### 5.2 Dashboard API Endpoints

```python
# dashboard/views.py
class DashboardViewSet(viewsets.ViewSet):
    """
    GET /api/dashboard/overview/
    GET /api/dashboard/recent-activity/
    GET /api/dashboard/ai-usage-stats/
    GET /api/dashboard/weekly-progress/
    """
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get dashboard overview with caching"""
        cache_key = f'dashboard_overview:{request.user.id}'
        cached = cache.get(cache_key)
        
        if cached:
            return Response(cached)
        
        # Refresh dashboard cache
        dashboard = DashboardCache.refresh_for_user(request.user)
        
        data = {
            'statistics': {
                'total_notes': dashboard.total_notes,
                'total_chapters': dashboard.total_chapters,
                'total_topics': dashboard.total_topics,
                'notes_this_week': dashboard.notes_this_week,
                'topics_this_week': dashboard.topics_this_week,
            },
            'ai_usage': {
                'total': sum([
                    dashboard.ai_generations,
                    dashboard.ai_improvements,
                    dashboard.ai_summarizations,
                    dashboard.ai_code_generations,
                ]),
                'generate': dashboard.ai_generations,
                'improve': dashboard.ai_improvements,
                'summarize': dashboard.ai_summarizations,
                'code': dashboard.ai_code_generations,
            },
            'last_activity': dashboard.last_activity,
        }
        
        cache.set(cache_key, data, timeout=300)  # 5 minutes
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def weekly_progress(self, request):
        """Get weekly progress chart data"""
        from datetime import timedelta
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=7)
        
        daily_stats = []
        for i in range(7):
            day = start_date + timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0)
            day_end = day_start + timedelta(days=1)
            
            notes = request.user.notes.filter(
                created_at__gte=day_start,
                created_at__lt=day_end
            ).count()
            
            topics = ChapterTopic.objects.filter(
                chapter__note__user=request.user,
                created_at__gte=day_start,
                created_at__lt=day_end
            ).count()
            
            daily_stats.append({
                'date': day.strftime('%Y-%m-%d'),
                'notes': notes,
                'topics': topics,
            })
        
        return Response({
            'period': '7_days',
            'data': daily_stats
        })
```

---

## 6. Admin Backend Enhancements

### 6.1 Admin Dashboard API

```python
# admin_dashboard/views.py
class AdminDashboardViewSet(viewsets.ViewSet):
    """
    Admin-only analytics and management
    
    GET /api/admin/overview/
    GET /api/admin/users/
    GET /api/admin/ai-usage/
    GET /api/admin/system-stats/
    """
    
    permission_classes = [IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """System-wide overview"""
        from django.db.models import Count, Avg, Sum
        
        cache_key = 'admin_dashboard_overview'
        cached = cache.get(cache_key)
        
        if cached:
            return Response(cached)
        
        # Calculate stats
        total_users = User.objects.filter(is_active=True).count()
        active_users_week = User.objects.filter(
            last_login_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        total_notes = Note.objects.count()
        total_topics = ChapterTopic.objects.count()
        
        ai_usage = AIToolUsage.objects.aggregate(
            total=Count('id'),
            avg_response_time=Avg('response_time'),
            total_tokens=Sum('tokens_used'),
        )
        
        data = {
            'users': {
                'total': total_users,
                'active_this_week': active_users_week,
                'activity_rate': round(active_users_week / total_users * 100, 2) if total_users > 0 else 0,
            },
            'content': {
                'total_notes': total_notes,
                'total_topics': total_topics,
                'avg_topics_per_note': round(total_topics / total_notes, 2) if total_notes > 0 else 0,
            },
            'ai_usage': {
                'total_requests': ai_usage['total'] or 0,
                'avg_response_time': round(ai_usage['avg_response_time'] or 0, 3),
                'total_tokens': ai_usage['total_tokens'] or 0,
            },
        }
        
        cache.set(cache_key, data, timeout=600)  # 10 minutes
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def ai_usage(self, request):
        """AI usage breakdown"""
        from django.db.models.functions import TruncDate
        
        # Group by tool type
        usage_by_type = AIToolUsage.objects.values('tool_type').annotate(
            count=Count('id'),
            avg_time=Avg('response_time'),
            total_tokens=Sum('tokens_used'),
        ).order_by('-count')
        
        # Daily usage for chart
        daily_usage = AIToolUsage.objects.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('-date')[:30]
        
        return Response({
            'by_type': list(usage_by_type),
            'daily': list(daily_usage),
        })
```

---

## 7. Security Enhancements

### 7.1 Rate Limiting

```python
# Install django-ratelimit
# pip install django-ratelimit

from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator

class AIToolsViewSet(viewsets.ViewSet):
    
    @method_decorator(ratelimit(key='user', rate='10/h', method='POST'))
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Rate limit: 10 requests per hour per user"""
        # ... implementation
```

### 7.2 API Key Authentication (for future integrations)

```python
# api_keys/models.py
class APIKey(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    key = models.CharField(max_length=64, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(null=True)
    
    # Rate limiting
    requests_per_hour = models.IntegerField(default=100)
    requests_per_day = models.IntegerField(default=1000)
    
    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_urlsafe(48)
        super().save(*args, **kwargs)

# api_keys/authentication.py
from rest_framework.authentication import BaseAuthentication

class APIKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return None
        
        try:
            key_obj = APIKey.objects.select_related('user').get(
                key=api_key,
                is_active=True
            )
            key_obj.last_used = timezone.now()
            key_obj.save(update_fields=['last_used'])
            return (key_obj.user, None)
        except APIKey.DoesNotExist:
            return None
```

---

## 8. Testing Strategy

### 8.1 Performance Testing

```python
# tests/performance/test_note_queries.py
from django.test import TestCase
from django.test.utils import override_settings
from django.db import connection
from django.test.utils import CaptureQueriesContext

class NoteQueryPerformanceTest(TestCase):
    
    def test_note_list_query_count(self):
        """Ensure note list uses optimized queries"""
        with CaptureQueriesContext(connection) as context:
            response = self.client.get('/api/notes/')
            
            # Should use ≤ 5 queries regardless of data size
            self.assertLessEqual(len(context.captured_queries), 5)
    
    def test_note_detail_query_count(self):
        """Ensure note detail uses prefetch"""
        note = self.create_test_note_with_structure()
        
        with CaptureQueriesContext(connection) as context:
            response = self.client.get(f'/api/notes/{note.id}/')
            
            # Should use ≤ 3 queries with proper prefetch
            self.assertLessEqual(len(context.captured_queries), 3)
```

### 8.2 Load Testing

```python
# Use locust for load testing
# tests/load/locustfile.py

from locust import HttpUser, task, between

class StudyNotesUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login on start"""
        response = self.client.post("/api/token/", json={
            "email": "test@example.com",
            "password": "testpass123"
        })
        self.token = response.json()['access']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def list_notes(self):
        self.client.get("/api/notes/", headers=self.headers)
    
    @task(2)
    def view_note(self):
        self.client.get("/api/notes/1/", headers=self.headers)
    
    @task(1)
    def generate_ai(self):
        self.client.post("/api/ai-tools/generate/", 
            json={"topic": "Python Basics"},
            headers=self.headers
        )

# Run: locust -f tests/load/locustfile.py --host=http://localhost:8000
# Target: 10,000+ concurrent users
```

---

## 9. Deployment Optimization

### 9.1 Production Settings

```python
# settings/production.py
import os
from .base import *

DEBUG = False

# Database connection pooling
DATABASES['default']['CONN_MAX_AGE'] = 600
DATABASES['default']['OPTIONS'] = {
    'connect_timeout': 10,
    'options': '-c statement_timeout=30000'  # 30 seconds
}

# Security
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# Static files
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

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
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
```

### 9.2 Gunicorn Configuration

```python
# gunicorn.conf.py
import multiprocessing

workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'gthread'
threads = 4
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 120
keepalive = 5

accesslog = '/var/log/studynotes/gunicorn-access.log'
errorlog = '/var/log/studynotes/gunicorn-error.log'
loglevel = 'info'

# Performance
worker_tmp_dir = '/dev/shm'  # Use RAM for better performance
```

---

## 10. Migration Plan

### Phase 1: Code Refactoring (Week 1)
1. ✅ Remove course/roadmap dependencies
2. ✅ Extract and enhance notes module
3. ✅ Create standalone AI tools module
4. ✅ Refactor analytics into dashboard
5. ✅ Add comprehensive indexing

### Phase 2: Performance Optimization (Week 2)
1. ✅ Implement Redis caching
2. ✅ Optimize database queries
3. ✅ Add query monitoring
4. ✅ Implement rate limiting
5. ✅ Load testing and optimization

### Phase 3: Testing & Documentation (Week 3)
1. ✅ Unit tests (80%+ coverage)
2. ✅ Integration tests
3. ✅ Load testing (10k concurrent)
4. ✅ API documentation (OpenAPI)
5. ✅ Deployment documentation

### Phase 4: Deployment (Week 4)
1. ✅ Production environment setup
2. ✅ Database migration
3. ✅ Monitoring setup
4. ✅ CI/CD pipeline
5. ✅ Go-live

---

## 11. Success Metrics

### Performance Targets
- ✅ API Response Time: < 200ms (p95)
- ✅ Database Query Time: < 50ms (p95)
- ✅ AI Generation Time: < 3s (p95)
- ✅ Concurrent Users: 10,000+
- ✅ Uptime: 99.9%

### Code Quality
- ✅ Test Coverage: > 80%
- ✅ Code Complexity: < 10 (cyclomatic)
- ✅ Zero Critical Security Issues
- ✅ API Documentation: 100%

---

## Next Steps

1. Review and approve this plan
2. Set up development environment with Redis
3. Begin Phase 1 refactoring
4. Establish monitoring and metrics collection
5. Create CI/CD pipeline

**Estimated Timeline:** 4 weeks
**Team Required:** 1 Senior Backend Engineer (full-time)
**Infrastructure:** PostgreSQL, Redis, Docker, CI/CD

---

*This document serves as the comprehensive blueprint for developing NoteAssist AI into a standalone, enterprise-grade AI-powered study notes platform.*
