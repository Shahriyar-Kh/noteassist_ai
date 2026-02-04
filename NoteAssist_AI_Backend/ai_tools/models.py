from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


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
            self.expires_at = timezone.now() + timedelta(days=30)
        super().save(*args, **kwargs)

    @property
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
            self.save(update_fields=['daily_used', 'last_reset_date'])

    def can_use_tool(self):
        """Check if user has quota available"""
        self.reset_daily_quota()
        return self.daily_used < self.daily_limit and self.monthly_used < self.monthly_limit

    def increment_usage(self, tokens=0):
        """Increment usage counters"""
        self.daily_used += 1
        self.monthly_used += 1
        self.total_tokens_used += tokens
        self.save(update_fields=['daily_used', 'monthly_used', 'total_tokens_used'])

    def __str__(self):
        return f"{self.user.email} - Daily: {self.daily_used}/{self.daily_limit}"