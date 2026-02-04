from datetime import timedelta

from django.conf import settings
from django.db import models
from django.db.models import Max, Sum
from django.utils import timezone


class DashboardCache(models.Model):
	"""Cached dashboard metrics per user"""

	user = models.OneToOneField(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		primary_key=True,
		related_name='dashboard_cache'
	)

	total_notes = models.IntegerField(default=0)
	total_chapters = models.IntegerField(default=0)
	total_topics = models.IntegerField(default=0)
	published_notes = models.IntegerField(default=0)
	draft_notes = models.IntegerField(default=0)

	ai_generations = models.IntegerField(default=0)
	ai_improvements = models.IntegerField(default=0)
	ai_summarizations = models.IntegerField(default=0)
	ai_code_generations = models.IntegerField(default=0)
	total_ai_requests = models.IntegerField(default=0)
	total_tokens_used = models.BigIntegerField(default=0)

	notes_this_week = models.IntegerField(default=0)
	topics_this_week = models.IntegerField(default=0)
	ai_requests_this_week = models.IntegerField(default=0)

	last_activity_at = models.DateTimeField(null=True, blank=True)
	streak_days = models.IntegerField(default=0)
	total_active_days = models.IntegerField(default=0)

	drive_connected = models.BooleanField(default=False)
	total_drive_uploads = models.IntegerField(default=0)

	last_refreshed_at = models.DateTimeField(auto_now=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'dashboard_cache'
		indexes = [
			models.Index(fields=['last_refreshed_at'], name='dash_refreshed_idx'),
		]

	@classmethod
	def refresh_for_user(cls, user, force=False):
		"""Recalculate and cache dashboard stats for a user"""

		cache, _ = cls.objects.get_or_create(user=user)
		if not force and cache.last_refreshed_at:
			if cache.last_refreshed_at > timezone.now() - timedelta(minutes=5):
				return cache

		from notes.models import Note, Chapter, ChapterTopic
		from ai_tools.models import AIToolUsage, AIToolOutput

		notes_qs = Note.objects.filter(user=user)
		chapters_qs = Chapter.objects.filter(note__user=user)
		topics_qs = ChapterTopic.objects.filter(chapter__note__user=user)
		ai_qs = AIToolUsage.objects.filter(user=user)

		week_ago = timezone.now() - timedelta(days=7)

		cache.total_notes = notes_qs.count()
		cache.published_notes = notes_qs.filter(status='published').count()
		cache.draft_notes = notes_qs.filter(status='draft').count()
		cache.total_chapters = chapters_qs.count()
		cache.total_topics = topics_qs.count()

		cache.ai_generations = ai_qs.filter(tool_type='generate').count()
		cache.ai_improvements = ai_qs.filter(tool_type='improve').count()
		cache.ai_summarizations = ai_qs.filter(tool_type='summarize').count()
		cache.ai_code_generations = ai_qs.filter(tool_type='code').count()
		cache.total_ai_requests = ai_qs.count()
		cache.total_tokens_used = ai_qs.aggregate(total=Sum('tokens_used'))['total'] or 0

		cache.notes_this_week = notes_qs.filter(created_at__gte=week_ago).count()
		cache.topics_this_week = topics_qs.filter(created_at__gte=week_ago).count()
		cache.ai_requests_this_week = ai_qs.filter(created_at__gte=week_ago).count()

		last_note_activity = notes_qs.aggregate(last=Max('updated_at'))['last']
		last_ai_activity = ai_qs.aggregate(last=Max('created_at'))['last']
		cache.last_activity_at = max(
			[dt for dt in [last_note_activity, last_ai_activity] if dt],
			default=None
		)

		cache.drive_connected = notes_qs.filter(
			drive_file_id__isnull=False
		).exclude(drive_file_id='').exists()
		cache.total_drive_uploads = notes_qs.filter(
			drive_file_id__isnull=False
		).exclude(drive_file_id='').count()
		cache.total_drive_uploads += AIToolOutput.objects.filter(
			user=user,
			drive_file_id__isnull=False
		).exclude(drive_file_id='').count()

		if hasattr(user, 'profile'):
			cache.streak_days = getattr(user.profile, 'current_streak', 0) or 0
			cache.total_active_days = getattr(user.profile, 'total_study_days', 0) or 0
		else:
			cache.streak_days = 0
			cache.total_active_days = 0

		cache.save()
		return cache

	def should_refresh(self):
		"""Check if cache should be refreshed (older than 5 minutes)."""
		if not self.last_refreshed_at:
			return True
		return self.last_refreshed_at <= timezone.now() - timedelta(minutes=5)


class ActivityLog(models.Model):
	"""User activity timeline for dashboard"""

	ACTIVITY_TYPES = [
		('note_created', 'Note Created'),
		('note_updated', 'Note Updated'),
		('note_published', 'Note Published'),
		('topic_created', 'Topic Created'),
		('ai_generated', 'AI Content Generated'),
		('ai_improved', 'Content Improved with AI'),
		('drive_uploaded', 'Uploaded to Drive'),
		('pdf_exported', 'PDF Exported'),
	]

	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name='activity_logs'
	)
	activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES)
	description = models.CharField(max_length=500)
	note_id = models.IntegerField(null=True, blank=True)
	note_title = models.CharField(max_length=500, blank=True)
	metadata = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = 'activity_logs'
		ordering = ['-created_at']
		indexes = [
			models.Index(fields=['user', '-created_at'], name='activity_user_created_idx'),
			models.Index(fields=['activity_type', '-created_at'], name='activity_type_created_idx'),
		]

	@classmethod
	def log_activity(cls, user, activity_type, description, note=None, **metadata):
		"""Create an activity log entry.

		Args:
			user: User instance
			activity_type: Activity type key
			description: Human-readable description
			note: Optional Note instance
			**metadata: Extra metadata
		"""
		return cls.objects.create(
			user=user,
			activity_type=activity_type,
			description=description,
			note_id=note.id if note else None,
			note_title=note.title if note else '',
			metadata=metadata,
		)

	def __str__(self):
		return f"{self.user.email} - {self.activity_type} - {self.created_at}"
