# FILE: accounts/models.py - CLEANED VERSION (Profile removed)
# ============================================================================
# Profile logic is now in separate 'profiles' app for better separation of concerns
# ============================================================================

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import uuid


class CustomUserManager(BaseUserManager):
    """Custom user manager for email-based authentication"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user"""
        if not email:
            raise ValueError('Email address is required')
        
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'student')
        
        # Auto-generate username from email if not provided
        if 'username' not in extra_fields or not extra_fields.get('username'):
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            
            while self.model.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            extra_fields['username'] = username
        
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('email_verified', True)
        extra_fields.setdefault('terms_accepted', True)
        
        # Set required fields for superuser
        if 'full_name' not in extra_fields:
            extra_fields['full_name'] = 'Admin User'
        if 'country' not in extra_fields:
            extra_fields['country'] = 'USA'
        if 'education_level' not in extra_fields:
            extra_fields['education_level'] = 'postgraduate'
        if 'field_of_study' not in extra_fields:
            extra_fields['field_of_study'] = 'Administration'
        
        if not extra_fields.get('is_staff'):
            raise ValueError('Superuser must have is_staff=True')
        if not extra_fields.get('is_superuser'):
            raise ValueError('Superuser must have is_superuser=True')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom User model with email as primary identifier
    
    Note: Profile data is stored in separate 'profiles.Profile' model
    via OneToOne relationship for better separation of concerns.
    """
    
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('admin', 'Admin'),
    ]
    
    EDUCATION_LEVEL_CHOICES = [
        ('high_school', 'High School'),
        ('undergraduate', 'Undergraduate'),
        ('graduate', 'Graduate'),
        ('postgraduate', 'Postgraduate'),
        ('professional', 'Professional'),
    ]
    
    # Override email to be unique and required
    email = models.EmailField(_('email address'), unique=True)
    username = models.CharField(max_length=150, unique=True, blank=True)
    
    # Use email for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # Made flexible for Google OAuth
    
    # User Role & Basic Info
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    full_name = models.CharField(max_length=255, blank=True)
    country = models.CharField(max_length=100, blank=True)
    education_level = models.CharField(
        max_length=50, 
        choices=EDUCATION_LEVEL_CHOICES, 
        blank=True
    )
    field_of_study = models.CharField(max_length=255, blank=True)
    
    # Learning Preferences (kept in User for registration convenience)
    learning_goal = models.TextField(blank=True)
    preferred_study_hours = models.IntegerField(default=2)
    timezone = models.CharField(max_length=50, default='UTC')
    
    # OAuth fields
    google_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    
    # Account status
    email_verified = models.BooleanField(default=False)
    terms_accepted = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    
    objects = CustomUserManager()
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        verbose_name = 'user'
        verbose_name_plural = 'users'
        indexes = [
            models.Index(fields=['email'], name='user_email_idx'),
            models.Index(fields=['-created_at'], name='user_created_idx'),
            models.Index(fields=['is_active', '-last_login_at'], name='user_active_login_idx'),
        ]
    
    def save(self, *args, **kwargs):
        # Normalize email
        if self.email:
            self.email = self.email.lower().strip()
        
        # Auto-generate username if not provided
        if not self.username:
            base_username = self.email.split('@')[0] if self.email else f'user_{uuid.uuid4().hex[:8]}'
            username = base_username
            counter = 1
            
            while User.objects.filter(username=username).exclude(pk=self.pk).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            self.username = username
        
        # Set role to admin if user is staff or superuser
        if self.is_staff or self.is_superuser:
            self.role = 'admin'
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.email


def get_active_users():
    return User.objects.filter(is_active=True).select_related('profile')


class LoginActivity(models.Model):
    """Track user login activities for security monitoring"""
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='login_activities'
    )
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    login_at = models.DateTimeField(auto_now_add=True)
    location = models.CharField(max_length=255, blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    
    class Meta:
        db_table = 'login_activities'
        ordering = ['-login_at']
        verbose_name = 'login activity'
        verbose_name_plural = 'login activities'
        indexes = [
            models.Index(fields=['user', '-login_at'], name='login_activity_u_date_idx'),
            models.Index(fields=['-login_at'], name='login_activity_date_idx'),
            models.Index(fields=['ip_address'], name='login_activity_ip_idx'),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.login_at}"


class PasswordReset(models.Model):
    """Password reset tokens"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_resets')
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'password_resets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token'], name='password_reset_token_idx'),
            models.Index(fields=['user', '-created_at'], name='pw_reset_u_date_idx'),
            models.Index(fields=['used', 'expires_at'], name='password_reset_valid_idx'),
        ]
    
    def is_valid(self):
        return not self.used and timezone.now() < self.expires_at
    
    def __str__(self):
        return f"Reset token for {self.user.email}"


class EmailVerification(models.Model):
    """Email verification tokens"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verifications')
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    verified = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'email_verifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token'], name='email_verification_token_idx'),
            models.Index(fields=['user', '-created_at'], name='email_verif_u_date_idx'),
            models.Index(fields=['verified', 'expires_at'], name='email_verification_valid_idx'),
        ]
    
    def is_valid(self):
        return not self.verified and timezone.now() < self.expires_at
    
    def __str__(self):
        return f"Verification token for {self.user.email}"


class UserPlan(models.Model):
    """User subscription and plan management"""
    
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('basic', 'Basic'),
        ('premium', 'Premium'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='plan',
        primary_key=True
    )
    plan_type = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    
    # AI Usage Limits
    daily_ai_limit = models.IntegerField(default=10)
    weekly_ai_limit = models.IntegerField(default=50)
    monthly_ai_limit = models.IntegerField(default=200)
    
    # Feature Access
    can_use_ai_tools = models.BooleanField(default=True)
    can_export_pdf = models.BooleanField(default=True)
    can_publish_notes = models.BooleanField(default=True)
    max_notes = models.IntegerField(default=100)
    max_storage_mb = models.IntegerField(default=500)
    
    # Usage Tracking
    ai_requests_today = models.IntegerField(default=0)
    ai_requests_week = models.IntegerField(default=0)
    ai_requests_month = models.IntegerField(default=0)
    last_reset_daily = models.DateField(default=timezone.now)
    last_reset_weekly = models.DateField(default=timezone.now)
    last_reset_monthly = models.DateField(default=timezone.now)
    
    # Admin Controls
    is_blocked = models.BooleanField(default=False)
    blocked_reason = models.TextField(blank=True)
    blocked_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_plans'
        verbose_name = 'user plan'
        verbose_name_plural = 'user plans'
        indexes = [
            models.Index(fields=['plan_type'], name='plan_type_idx'),
            models.Index(fields=['is_blocked'], name='plan_blocked_idx'),
        ]
    
    def reset_daily_usage(self):
        """Reset daily usage counters"""
        today = timezone.now().date()
        if self.last_reset_daily < today:
            self.ai_requests_today = 0
            self.last_reset_daily = today
            self.save(update_fields=['ai_requests_today', 'last_reset_daily'])
    
    def reset_weekly_usage(self):
        """Reset weekly usage counters"""
        today = timezone.now().date()
        days_since_reset = (today - self.last_reset_weekly).days
        if days_since_reset >= 7:
            self.ai_requests_week = 0
            self.last_reset_weekly = today
            self.save(update_fields=['ai_requests_week', 'last_reset_weekly'])
    
    def reset_monthly_usage(self):
        """Reset monthly usage counters"""
        today = timezone.now().date()
        days_since_reset = (today - self.last_reset_monthly).days
        if days_since_reset >= 30:
            self.ai_requests_month = 0
            self.last_reset_monthly = today
            self.save(update_fields=['ai_requests_month', 'last_reset_monthly'])
    
    def can_make_ai_request(self):
        """Check if user can make an AI request"""
        self.reset_daily_usage()
        self.reset_weekly_usage()
        self.reset_monthly_usage()
        
        if self.is_blocked or not self.can_use_ai_tools:
            return False
        
        if self.ai_requests_today >= self.daily_ai_limit:
            return False
        if self.ai_requests_week >= self.weekly_ai_limit:
            return False
        if self.ai_requests_month >= self.monthly_ai_limit:
            return False
        
        return True
    
    def increment_ai_usage(self):
        """Increment AI usage counters"""
        self.ai_requests_today += 1
        self.ai_requests_week += 1
        self.ai_requests_month += 1
        self.save(update_fields=[
            'ai_requests_today',
            'ai_requests_week',
            'ai_requests_month'
        ])
    
    def get_remaining_requests(self):
        """Get remaining AI requests for all periods"""
        self.reset_daily_usage()
        self.reset_weekly_usage()
        self.reset_monthly_usage()
        
        return {
            'daily': max(0, self.daily_ai_limit - self.ai_requests_today),
            'weekly': max(0, self.weekly_ai_limit - self.ai_requests_week),
            'monthly': max(0, self.monthly_ai_limit - self.ai_requests_month),
        }
    
    def __str__(self):
        return f"{self.user.email} - {self.plan_type}"


class UserActionLog(models.Model):
    """Log admin actions on users for audit trail"""
    
    ACTION_CHOICES = [
        ('block', 'Block User'),
        ('unblock', 'Unblock User'),
        ('change_plan', 'Change Plan'),
        ('change_limits', 'Change Limits'),
        ('revoke_access', 'Revoke Access'),
        ('grant_access', 'Grant Access'),
        ('reset_usage', 'Reset Usage'),
        ('send_notification', 'Send Notification'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='action_logs'
    )
    admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='admin_actions'
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_action_logs'
        ordering = ['-created_at']
        verbose_name = 'user action log'
        verbose_name_plural = 'user action logs'
        indexes = [
            models.Index(fields=['user', '-created_at'], name='action_user_date_idx'),
            models.Index(fields=['admin', '-created_at'], name='action_admin_date_idx'),
            models.Index(fields=['action'], name='action_type_idx'),
        ]
    
    def __str__(self):
        return f"{self.action} on {self.user.email} by {self.admin.email if self.admin else 'System'}"