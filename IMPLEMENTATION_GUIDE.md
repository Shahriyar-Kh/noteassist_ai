# Implementation Guide - AI-Powered StudyNotes Platform

## Quick Start Implementation Checklist

### ✅ Phase 1A: Database Cleanup & Optimization (Days 1-2)

#### 1. Remove Course Dependencies

```python
# Step 1: Create migration to remove course fields from Note model
# notes/migrations/XXXX_remove_course_dependencies.py

from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('notes', '0004_delete_profile'),  # Your latest migration
    ]

    operations = [
        migrations.RemoveField(
            model_name='note',
            name='course',
        ),
        migrations.RemoveField(
            model_name='note',
            name='course_topic',
        ),
        migrations.RemoveField(
            model_name='note',
            name='course_subtopic',
        ),
    ]
```

```python
# Step 2: Update Note model - notes/models.py
class Note(models.Model):
    """Main Note container - CLEANED VERSION"""
    
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    title = models.CharField(max_length=500)
    slug = models.SlugField(max_length=550, blank=True)
    tags = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Google Drive Integration
    drive_file_id = models.CharField(max_length=255, blank=True, null=True)
    last_drive_sync_at = models.DateTimeField(null=True, blank=True)
    upload_type = models.CharField(
        max_length=20,
        choices=(('manual', 'Manual'), ('auto', 'Automatic')),
        default='manual'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    session_date = models.DateField(null=True, blank=True)
    
    objects = CaseInsensitiveManager()
    
    class Meta:
        db_table = 'notes'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at'], name='note_user_updated_idx'),
            models.Index(fields=['user', 'status'], name='note_user_status_idx'),
            models.Index(fields=['status', '-created_at'], name='note_status_created_idx'),
            models.Index(fields=['-created_at'], name='note_created_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'title'], 
                name='unique_user_note_title'
            )
        ]
```

#### 2. Add Database Indexes for Performance

```python
# notes/migrations/XXXX_add_performance_indexes.py

from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('notes', 'XXXX_remove_course_dependencies'),
    ]

    operations = [
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
        
        # AIHistory indexes
        migrations.AddIndex(
            model_name='aihistory',
            index=models.Index(fields=['user', 'feature_type', '-created_at'], name='ai_user_type_created_idx'),
        ),
    ]
```

---

### ✅ Phase 1B: Create Standalone AI Tools Module (Days 3-4)

#### 1. Create AI Tools App Structure

```bash
# Create new app
python manage.py startapp ai_tools

# Directory structure
ai_tools/
├── __init__.py
├── admin.py
├── apps.py
├── models.py
├── serializers.py
├── views.py
├── services.py
├── urls.py
├── tasks.py
└── migrations/
    └── __init__.py
```

#### 2. AI Tools Models

```python
# ai_tools/models.py

from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class AIToolUsage(models.Model):
    """Track all AI tool usage for analytics"""
    
    TOOL_TYPES = (
        ('generate', 'Generate Topic'),
        ('improve', 'Improve Content'),
        ('summarize', 'Summarize'),
        ('code', 'Generate Code'),
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_tool_usages'
    )
    tool_type = models.CharField(max_length=20, choices=TOOL_TYPES, db_index=True)
    
    # Input/Output
    input_text = models.TextField()
    output_text = models.TextField()
    
    # Metadata
    tokens_used = models.IntegerField(default=0)
    response_time = models.FloatField(help_text='Response time in seconds')
    model_used = models.CharField(max_length=100, default='llama-3.3-70b-versatile')
    
    # Optional: Link to note if saved
    note = models.ForeignKey(
        'notes.Note',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_generations'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'ai_tool_usages'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='ai_usage_user_created_idx'),
            models.Index(fields=['tool_type', '-created_at'], name='ai_usage_type_created_idx'),
            models.Index(fields=['user', 'tool_type'], name='ai_usage_user_type_idx'),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.get_tool_type_display()} - {self.created_at}"


class AIToolOutput(models.Model):
    """
    Standalone AI tool outputs (not immediately saved to notes)
    Allows users to generate content and decide later whether to save
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_tool_outputs'
    )
    usage = models.OneToOneField(
        AIToolUsage,
        on_delete=models.CASCADE,
        related_name='output'
    )
    
    title = models.CharField(max_length=500)
    content = models.TextField()
    language = models.CharField(max_length=50, blank=True)  # For code generation
    
    # Google Drive integration
    drive_file_id = models.CharField(max_length=255, blank=True, null=True)
    drive_url = models.URLField(blank=True, null=True)
    
    # Download tracking
    download_count = models.IntegerField(default=0)
    last_downloaded_at = models.DateTimeField(null=True, blank=True)
    
    # Auto-cleanup
    expires_at = models.DateTimeField()
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ai_tool_outputs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='ai_output_user_created_idx'),
            models.Index(fields=['expires_at'], name='ai_output_expires_idx'),
        ]
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Auto-expire after 30 days
            self.expires_at = timezone.now() + timedelta(days=30)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def __str__(self):
        return f"{self.title} - {self.user.email}"


class AIToolQuota(models.Model):
    """
    Track AI tool usage quotas per user
    Can be used for rate limiting or billing
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_quota'
    )
    
    # Monthly quotas
    monthly_limit = models.IntegerField(default=100)
    monthly_used = models.IntegerField(default=0)
    
    # Daily quotas
    daily_limit = models.IntegerField(default=20)
    daily_used = models.IntegerField(default=0)
    last_reset_date = models.DateField(auto_now_add=True)
    
    # Tokens
    total_tokens_used = models.BigIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ai_tool_quotas'
    
    def reset_daily_quota(self):
        """Reset daily quota if it's a new day"""
        today = timezone.now().date()
        if self.last_reset_date < today:
            self.daily_used = 0
            self.last_reset_date = today
            self.save()
    
    def can_use_tool(self):
        """Check if user has quota available"""
        self.reset_daily_quota()
        return (
            self.daily_used < self.daily_limit and
            self.monthly_used < self.monthly_limit
        )
    
    def increment_usage(self, tokens=0):
        """Increment usage counters"""
        self.daily_used += 1
        self.monthly_used += 1
        self.total_tokens_used += tokens
        self.save()
    
    def __str__(self):
        return f"{self.user.email} - Daily: {self.daily_used}/{self.daily_limit}"
```

#### 3. AI Tools Serializers

```python
# ai_tools/serializers.py

from rest_framework import serializers
from .models import AIToolUsage, AIToolOutput, AIToolQuota
from notes.models import Note, Chapter, ChapterTopic, TopicExplanation, TopicCodeSnippet

class AIToolUsageSerializer(serializers.ModelSerializer):
    """Serializer for AI tool usage records"""
    
    tool_type_display = serializers.CharField(source='get_tool_type_display', read_only=True)
    
    class Meta:
        model = AIToolUsage
        fields = [
            'id', 'tool_type', 'tool_type_display', 
            'tokens_used', 'response_time', 'model_used',
            'created_at', 'note'
        ]
        read_only_fields = ['created_at', 'tokens_used', 'response_time']


class AIToolOutputSerializer(serializers.ModelSerializer):
    """Serializer for AI tool outputs"""
    
    usage = AIToolUsageSerializer(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = AIToolOutput
        fields = [
            'id', 'title', 'content', 'language',
            'usage', 'download_count', 'last_downloaded_at',
            'expires_at', 'is_expired', 'days_until_expiry',
            'drive_file_id', 'drive_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'download_count']
    
    def get_days_until_expiry(self, obj):
        """Calculate days until expiration"""
        from django.utils import timezone
        delta = obj.expires_at - timezone.now()
        return max(0, delta.days)


class AIGenerateRequestSerializer(serializers.Serializer):
    """Request serializer for AI generation"""
    
    topic = serializers.CharField(max_length=500, required=True)
    level = serializers.ChoiceField(
        choices=['beginner', 'intermediate', 'advanced', 'expert'],
        default='beginner'
    )
    subject_area = serializers.CharField(max_length=100, default='programming')
    save_immediately = serializers.BooleanField(default=False)
    note_title = serializers.CharField(max_length=500, required=False)


class AIImproveRequestSerializer(serializers.Serializer):
    """Request serializer for content improvement"""
    
    content = serializers.CharField(required=True)
    focus = serializers.ChoiceField(
        choices=['clarity', 'depth', 'examples', 'structure'],
        required=False
    )
    save_immediately = serializers.BooleanField(default=False)


class AISummarizeRequestSerializer(serializers.Serializer):
    """Request serializer for content summarization"""
    
    content = serializers.CharField(required=True)
    max_length = serializers.ChoiceField(
        choices=['short', 'medium', 'long'],
        default='medium'
    )


class AICodeRequestSerializer(serializers.Serializer):
    """Request serializer for code generation"""
    
    topic = serializers.CharField(max_length=500, required=True)
    language = serializers.ChoiceField(
        choices=['python', 'javascript', 'java', 'cpp', 'go', 'rust'],
        default='python'
    )
    level = serializers.ChoiceField(
        choices=['beginner', 'intermediate', 'advanced', 'expert'],
        default='beginner'
    )
    include_tests = serializers.BooleanField(default=False)


class SaveToNoteSerializer(serializers.Serializer):
    """Serializer for saving AI output to a note"""
    
    note_id = serializers.IntegerField(required=False)
    note_title = serializers.CharField(max_length=500, required=False)
    chapter_title = serializers.CharField(max_length=500, default='AI Generated')
    
    def validate(self, data):
        """Ensure either note_id or note_title is provided"""
        if not data.get('note_id') and not data.get('note_title'):
            raise serializers.ValidationError(
                'Either note_id or note_title must be provided'
            )
        return data


class AIToolQuotaSerializer(serializers.ModelSerializer):
    """Serializer for AI tool quota"""
    
    daily_remaining = serializers.SerializerMethodField()
    monthly_remaining = serializers.SerializerMethodField()
    can_use = serializers.SerializerMethodField()
    
    class Meta:
        model = AIToolQuota
        fields = [
            'daily_limit', 'daily_used', 'daily_remaining',
            'monthly_limit', 'monthly_used', 'monthly_remaining',
            'total_tokens_used', 'can_use', 'last_reset_date'
        ]
    
    def get_daily_remaining(self, obj):
        return max(0, obj.daily_limit - obj.daily_used)
    
    def get_monthly_remaining(self, obj):
        return max(0, obj.monthly_limit - obj.monthly_used)
    
    def get_can_use(self, obj):
        return obj.can_use_tool()
```

#### 4. AI Tools Views

```python
# ai_tools/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.http import HttpResponse
import time
import logging

from .models import AIToolUsage, AIToolOutput, AIToolQuota
from .serializers import (
    AIToolUsageSerializer, AIToolOutputSerializer,
    AIGenerateRequestSerializer, AIImproveRequestSerializer,
    AISummarizeRequestSerializer, AICodeRequestSerializer,
    SaveToNoteSerializer, AIToolQuotaSerializer
)
from notes.ai_service import AIService
from notes.models import Note, Chapter, ChapterTopic, TopicExplanation, TopicCodeSnippet

logger = logging.getLogger(__name__)


class AIToolsViewSet(viewsets.ViewSet):
    """
    Standalone AI Tools API
    
    Endpoints:
    - POST /api/ai-tools/generate/          - Generate topic explanation
    - POST /api/ai-tools/improve/           - Improve existing content
    - POST /api/ai-tools/summarize/         - Summarize content
    - POST /api/ai-tools/code/              - Generate code
    - GET  /api/ai-tools/outputs/           - List user's AI outputs
    - GET  /api/ai-tools/outputs/{id}/      - Get specific output
    - POST /api/ai-tools/outputs/{id}/save/ - Save output to note
    - GET  /api/ai-tools/outputs/{id}/download/ - Download as file
    - POST /api/ai-tools/outputs/{id}/drive/ - Upload to Google Drive
    - DELETE /api/ai-tools/outputs/{id}/    - Delete output
    - GET  /api/ai-tools/usage-history/     - Get usage history
    - GET  /api/ai-tools/quota/             - Get user's quota status
    """
    
    permission_classes = [IsAuthenticated]
    
    def _check_quota(self, user):
        """Check if user has available quota"""
        quota, created = AIToolQuota.objects.get_or_create(user=user)
        
        if not quota.can_use_tool():
            raise serializers.ValidationError({
                'quota_exceeded': True,
                'message': 'Daily or monthly quota exceeded',
                'daily_used': quota.daily_used,
                'daily_limit': quota.daily_limit,
                'monthly_used': quota.monthly_used,
                'monthly_limit': quota.monthly_limit,
            })
        
        return quota
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        Generate topic explanation using AI
        
        POST /api/ai-tools/generate/
        {
            "topic": "Python Decorators",
            "level": "intermediate",
            "subject_area": "programming",
            "save_immediately": false,
            "note_title": "My Note" (optional, if save_immediately=true)
        }
        """
        serializer = AIGenerateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check quota
        quota = self._check_quota(request.user)
        
        # Extract data
        topic = serializer.validated_data['topic']
        level = serializer.validated_data['level']
        subject_area = serializer.validated_data['subject_area']
        save_immediately = serializer.validated_data['save_immediately']
        
        try:
            # Generate content with timing
            ai_service = AIService()
            start_time = time.time()
            
            output_content = ai_service.generate_explanation(
                topic_name=topic,
                subject_area=subject_area,
                level=level
            )
            
            response_time = time.time() - start_time
            
            # Create usage record
            usage = AIToolUsage.objects.create(
                user=request.user,
                tool_type='generate',
                input_text=f"Topic: {topic}, Level: {level}, Subject: {subject_area}",
                output_text=output_content,
                response_time=response_time,
                tokens_used=len(output_content.split()) * 1.3,  # Rough estimate
            )
            
            # Update quota
            quota.increment_usage(tokens=usage.tokens_used)
            
            # Create standalone output
            ai_output = AIToolOutput.objects.create(
                user=request.user,
                usage=usage,
                title=topic,
                content=output_content,
            )
            
            # If save immediately, create note
            if save_immediately:
                note_title = serializer.validated_data.get('note_title', topic)
                note = self._save_to_new_note(
                    user=request.user,
                    title=note_title,
                    content=output_content,
                    usage=usage
                )
                ai_output.usage.note = note
                ai_output.usage.save()
            
            serializer = AIToolOutputSerializer(ai_output, context={'request': request})
            
            return Response({
                'success': True,
                'output': serializer.data,
                'message': 'Content generated successfully',
                'quota_remaining': {
                    'daily': quota.daily_limit - quota.daily_used,
                    'monthly': quota.monthly_limit - quota.monthly_used,
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"AI generation error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def improve(self, request):
        """
        Improve existing content using AI
        
        POST /api/ai-tools/improve/
        """
        serializer = AIImproveRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        quota = self._check_quota(request.user)
        
        content = serializer.validated_data['content']
        
        try:
            ai_service = AIService()
            start_time = time.time()
            
            improved_content = ai_service.improve_explanation(content)
            response_time = time.time() - start_time
            
            usage = AIToolUsage.objects.create(
                user=request.user,
                tool_type='improve',
                input_text=content[:1000],  # Store first 1000 chars
                output_text=improved_content,
                response_time=response_time,
                tokens_used=len(improved_content.split()) * 1.3,
            )
            
            quota.increment_usage(tokens=usage.tokens_used)
            
            ai_output = AIToolOutput.objects.create(
                user=request.user,
                usage=usage,
                title='Improved Content',
                content=improved_content,
            )
            
            serializer = AIToolOutputSerializer(ai_output, context={'request': request})
            
            return Response({
                'success': True,
                'output': serializer.data,
                'message': 'Content improved successfully'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"AI improvement error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def summarize(self, request):
        """Summarize content using AI"""
        serializer = AISummarizeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        quota = self._check_quota(request.user)
        
        content = serializer.validated_data['content']
        
        try:
            ai_service = AIService()
            start_time = time.time()
            
            summary = ai_service.summarize_explanation(content)
            response_time = time.time() - start_time
            
            usage = AIToolUsage.objects.create(
                user=request.user,
                tool_type='summarize',
                input_text=content[:1000],
                output_text=summary,
                response_time=response_time,
                tokens_used=len(summary.split()) * 1.3,
            )
            
            quota.increment_usage(tokens=usage.tokens_used)
            
            ai_output = AIToolOutput.objects.create(
                user=request.user,
                usage=usage,
                title='Content Summary',
                content=summary,
            )
            
            serializer = AIToolOutputSerializer(ai_output, context={'request': request})
            
            return Response({
                'success': True,
                'output': serializer.data,
                'message': 'Content summarized successfully'
            })
            
        except Exception as e:
            logger.error(f"AI summarization error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def code(self, request):
        """Generate code using AI"""
        serializer = AICodeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        quota = self._check_quota(request.user)
        
        topic = serializer.validated_data['topic']
        language = serializer.validated_data['language']
        level = serializer.validated_data['level']
        
        try:
            ai_service = AIService()
            start_time = time.time()
            
            code = ai_service.generate_code(
                topic_name=topic,
                language=language,
                level=level
            )
            
            response_time = time.time() - start_time
            
            usage = AIToolUsage.objects.create(
                user=request.user,
                tool_type='code',
                input_text=f"{topic} ({language}, {level})",
                output_text=code,
                response_time=response_time,
                tokens_used=len(code.split()) * 1.3,
            )
            
            quota.increment_usage(tokens=usage.tokens_used)
            
            ai_output = AIToolOutput.objects.create(
                user=request.user,
                usage=usage,
                title=f"{topic} - {language}",
                content=code,
                language=language,
            )
            
            serializer = AIToolOutputSerializer(ai_output, context={'request': request})
            
            return Response({
                'success': True,
                'output': serializer.data,
                'message': 'Code generated successfully'
            })
            
        except Exception as e:
            logger.error(f"AI code generation error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def outputs(self, request):
        """List user's AI outputs"""
        outputs = AIToolOutput.objects.filter(
            user=request.user
        ).select_related('usage').order_by('-created_at')
        
        # Filter by tool type if specified
        tool_type = request.query_params.get('tool_type')
        if tool_type:
            outputs = outputs.filter(usage__tool_type=tool_type)
        
        # Pagination
        page = self.paginate_queryset(outputs)
        serializer = AIToolOutputSerializer(page, many=True, context={'request': request})
        
        return self.get_paginated_response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='save')
    def save_to_note(self, request, pk=None):
        """
        Save AI output to a note
        
        POST /api/ai-tools/outputs/{id}/save/
        {
            "note_id": 123,  // Optional: save to existing note
            "note_title": "My New Note",  // Optional: create new note
            "chapter_title": "AI Generated"
        }
        """
        try:
            ai_output = AIToolOutput.objects.select_related('usage').get(
                pk=pk,
                user=request.user
            )
        except AIToolOutput.DoesNotExist:
            return Response({
                'error': 'Output not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = SaveToNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        note_id = serializer.validated_data.get('note_id')
        note_title = serializer.validated_data.get('note_title', ai_output.title)
        chapter_title = serializer.validated_data['chapter_title']
        
        try:
            # Get or create note
            if note_id:
                note = Note.objects.get(id=note_id, user=request.user)
            else:
                note = Note.objects.create(
                    user=request.user,
                    title=note_title,
                    status='draft'
                )
            
            # Create chapter
            max_order = note.chapters.aggregate(Max('order'))['order__max'] or -1
            chapter = Chapter.objects.create(
                note=note,
                title=chapter_title,
                order=max_order + 1
            )
            
            # Create topic with content
            topic = ChapterTopic.objects.create(
                chapter=chapter,
                name=ai_output.title,
                order=0
            )
            
            # Add explanation or code
            if ai_output.language:  # It's code
                code_snippet = TopicCodeSnippet.objects.create(
                    language=ai_output.language,
                    code=ai_output.content
                )
                topic.code_snippet = code_snippet
            else:  # It's explanation
                explanation = TopicExplanation.objects.create(
                    content=ai_output.content
                )
                topic.explanation = explanation
            
            topic.save()
            
            # Link usage to note
            ai_output.usage.note = note
            ai_output.usage.save()
            
            return Response({
                'success': True,
                'note_id': note.id,
                'chapter_id': chapter.id,
                'topic_id': topic.id,
                'message': 'Content saved to note successfully'
            })
            
        except Note.DoesNotExist:
            return Response({
                'error': 'Note not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error saving to note: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'], url_path='download')
    def download_output(self, request, pk=None):
        """
        Download AI output as a file
        
        GET /api/ai-tools/outputs/{id}/download/?format=txt|md|py
        """
        try:
            ai_output = AIToolOutput.objects.get(pk=pk, user=request.user)
        except AIToolOutput.DoesNotExist:
            return Response({
                'error': 'Output not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Update download count
        ai_output.download_count += 1
        ai_output.last_downloaded_at = timezone.now()
        ai_output.save()
        
        # Get format
        file_format = request.query_params.get('format', 'txt')
        
        # Determine content type and extension
        if ai_output.language:
            # It's code
            content_type = 'text/plain'
            extension = {
                'python': 'py',
                'javascript': 'js',
                'java': 'java',
                'cpp': 'cpp',
                'go': 'go',
                'rust': 'rs',
            }.get(ai_output.language, 'txt')
        elif file_format == 'md':
            content_type = 'text/markdown'
            extension = 'md'
        else:
            content_type = 'text/plain'
            extension = 'txt'
        
        # Create response
        filename = f"{ai_output.title.replace(' ', '_')}.{extension}"
        response = HttpResponse(ai_output.content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
    
    @action(detail=False, methods=['get'], url_path='usage-history')
    def usage_history(self, request):
        """Get user's AI tool usage history"""
        usages = AIToolUsage.objects.filter(
            user=request.user
        ).order_by('-created_at')
        
        # Filter by tool type
        tool_type = request.query_params.get('tool_type')
        if tool_type:
            usages = usages.filter(tool_type=tool_type)
        
        # Date range filter
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        if from_date:
            usages = usages.filter(created_at__gte=from_date)
        if to_date:
            usages = usages.filter(created_at__lte=to_date)
        
        page = self.paginate_queryset(usages)
        serializer = AIToolUsageSerializer(page, many=True)
        
        return self.get_paginated_response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def quota(self, request):
        """Get user's quota status"""
        quota, created = AIToolQuota.objects.get_or_create(user=request.user)
        serializer = AIToolQuotaSerializer(quota)
        
        return Response({
            'quota': serializer.data,
            'message': 'Quota retrieved successfully'
        })
    
    def _save_to_new_note(self, user, title, content, usage):
        """Helper method to save content to a new note"""
        note = Note.objects.create(
            user=user,
            title=title,
            status='draft'
        )
        
        chapter = Chapter.objects.create(
            note=note,
            title='AI Generated',
            order=0
        )
        
        topic = ChapterTopic.objects.create(
            chapter=chapter,
            name=title,
            order=0
        )
        
        explanation = TopicExplanation.objects.create(
            content=content
        )
        topic.explanation = explanation
        topic.save()
        
        return note
```

*This is part 1 of the implementation guide. Continue?*
