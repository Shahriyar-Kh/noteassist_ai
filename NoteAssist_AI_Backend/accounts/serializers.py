# FILE: accounts/serializers.py
# ============================================================================
# Enhanced authentication serializers with blocking checks
# Works with separate profiles app
# ============================================================================

from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from .models import LoginActivity
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    
    password = serializers.CharField(
        write_only=True, 
        min_length=8,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True, 
        min_length=8,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm',
            'full_name', 'country', 'education_level', 'field_of_study',
            'learning_goal', 'preferred_study_hours', 'timezone',
            'terms_accepted'
        ]
        extra_kwargs = {
            'terms_accepted': {'required': True},
            'email': {'required': True},
            'full_name': {'required': True},
            'country': {'required': True},
            'education_level': {'required': True},
            'field_of_study': {'required': True},
        }
    
    def validate_email(self, value):
        """Validate email is unique"""
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_password(self, value):
        """Validate password strength using Django validators"""
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, data):
        """Validate registration data"""
        errors = {}
        
        if data.get('password') != data.get('password_confirm'):
            errors['password_confirm'] = ["Passwords do not match."]
        
        if not data.get('terms_accepted'):
            errors['terms_accepted'] = ["You must accept the terms and conditions."]
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return data
    
    def create(self, validated_data):
        """Create new user with 'student' role by default"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        validated_data['role'] = 'student'
        
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        logger.info(f"User created successfully: {user.email} with role: {user.role}")
        return user


class BasicProfileSerializer(serializers.Serializer):
    """
    Basic profile data for inclusion in User serializer
    References the separate profiles.Profile model
    """
    avatar = serializers.SerializerMethodField()
    bio = serializers.CharField(read_only=True)
    total_study_days = serializers.IntegerField(read_only=True)
    current_streak = serializers.IntegerField(read_only=True)
    longest_streak = serializers.IntegerField(read_only=True)
    total_notes = serializers.IntegerField(read_only=True)
    
    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user details with role
    Includes basic profile data from separate profiles app
    """
    
    profile = serializers.SerializerMethodField()
    plan_type = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'full_name', 'role',
            'country', 'education_level', 'field_of_study',
            'learning_goal', 'preferred_study_hours', 'timezone',
            'email_verified', 'is_staff', 'is_superuser',
            'is_blocked', 'plan_type', 'profile', 'created_at'
        ]
        read_only_fields = [
            'id', 'email_verified', 'created_at', 'username', 
            'role', 'is_staff', 'is_superuser', 'is_blocked', 'plan_type'
        ]
    
    def get_profile(self, obj):
        """Get profile data if exists"""
        if hasattr(obj, 'profile'):
            return BasicProfileSerializer(obj.profile, context=self.context).data
        return None
    
    def get_plan_type(self, obj):
        """Get plan type from AI quota"""
        try:
            quota = obj.ai_quota
            if quota.monthly_limit >= 500:
                return 'premium'
            elif quota.monthly_limit >= 100:
                return 'basic'
            return 'free'
        except Exception:
            return 'free'
    
    def get_is_blocked(self, obj):
        """Get block status"""
        return not obj.is_active if not hasattr(obj, 'is_blocked') else getattr(obj, 'is_blocked', False)


class LoginActivitySerializer(serializers.ModelSerializer):
    """Serializer for login activities"""
    
    class Meta:
        model = LoginActivity
        fields = ['ip_address', 'user_agent', 'login_at', 'location', 'device_type']


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Enhanced JWT serializer with blocking check and custom claims
    """
    
    username_field = 'email'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'username' in self.fields:
            self.fields.pop('username')
        self.fields['email'] = serializers.EmailField(required=True)
    
    @classmethod
    def get_token(cls, user):
        """Override to add custom claims to token"""
        token = super().get_token(user)
        
        token['email'] = user.email
        token['role'] = user.role
        token['full_name'] = user.full_name
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        
        # Add blocking status if available
        if hasattr(user, 'is_blocked'):
            token['is_blocked'] = user.is_blocked
        else:
            token['is_blocked'] = not user.is_active
        
        # Add plan type
        try:
            quota = user.ai_quota
            if quota.monthly_limit >= 500:
                token['plan_type'] = 'premium'
            elif quota.monthly_limit >= 100:
                token['plan_type'] = 'basic'
            else:
                token['plan_type'] = 'free'
        except Exception:
            token['plan_type'] = 'free'
        
        return token
    
    def validate(self, attrs):
        """Validate and authenticate user with comprehensive checks"""
        email = attrs.get('email', '').lower().strip()
        password = attrs.get('password')
        
        if not email or not password:
            raise serializers.ValidationError({
                'detail': 'Email and password are required.'
            })
        
        # Check if user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            logger.warning(f"Login attempt with non-existent email: {email}")
            raise serializers.ValidationError({
                'detail': 'This email is not registered. Please sign up first.',
                'error_type': 'email_not_found'
            })
        
        # ✅ CHECK IF USER IS BLOCKED - BEFORE password check
        is_blocked = getattr(user, 'is_blocked', not user.is_active)
        if is_blocked:
            block_reason = getattr(user, 'blocked_reason', 'Policy violation')
            blocked_at = getattr(user, 'blocked_at', None)
            logger.warning(f"Blocked user login attempt: {email}")
            raise serializers.ValidationError({
                'detail': f'Your account has been blocked. Reason: {block_reason}. Please contact support at shahriyarkhanpk3@gmail.com',
                'error_type': 'account_blocked',
                'is_blocked': True,
                'blocked_reason': block_reason,
                'blocked_at': blocked_at.isoformat() if blocked_at else None,
                'support_email': 'shahriyarkhanpk3@gmail.com',
            })
        
        # Check if user is active
        if not user.is_active:
            logger.warning(f"Login attempt for disabled account: {email}")
            raise serializers.ValidationError({
                'detail': 'This account has been disabled. Please contact support.',
                'error_type': 'account_disabled'
            })
        
        # Authenticate with password
        authenticated_user = authenticate(
            request=self.context.get('request'),
            email=email,
            password=password
        )
        
        if not authenticated_user:
            logger.warning(f"Failed login attempt for {email}: incorrect password")
            raise serializers.ValidationError({
                'detail': 'Incorrect password. Please try again.',
                'error_type': 'incorrect_password'
            })
        
        # Update last login
        user.last_login_at = timezone.now()
        user.save(update_fields=['last_login_at'])
        
        # Generate tokens
        refresh = self.get_token(user)
        
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user, context=self.context).data,
            'redirect': self.get_redirect_url(user)
        }
        
        logger.info(f"User logged in successfully: {user.email} with role: {user.role}")
        
        return data
    
    def get_redirect_url(self, user):
        """Determine redirect URL based on user role"""
        if user.role == 'admin' or user.is_staff or user.is_superuser:
            return '/admin-dashboard'
        return '/dashboard'


class GoogleAuthSerializer(serializers.Serializer):
    """Serializer for Google OAuth authentication"""
    credential = serializers.CharField(required=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        """Normalize email"""
        return value.lower().strip()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True, min_length=8)
    
    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Passwords do not match'
            })
        try:
            validate_password(data['new_password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({
                'new_password': list(e.messages)
            })
        return data


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating basic user info (not full profile)"""
    
    class Meta:
        model = User
        fields = [
            'full_name', 'country', 'education_level', 
            'field_of_study', 'learning_goal', 'preferred_study_hours'
        ]
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# ============================================================================
# ENHANCED SERIALIZERS FOR ADMIN OPERATIONS
# ============================================================================

class EnhancedUserDetailSerializer(serializers.ModelSerializer):
    """Enhanced user detail serializer for admin analytics"""
    
    ai_quota = serializers.SerializerMethodField()
    notes_count = serializers.SerializerMethodField()
    ai_usage_count = serializers.SerializerMethodField()
    plan_type = serializers.SerializerMethodField()
    block_info = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role', 'is_active', 'is_staff',
            'email_verified', 'created_at', 'last_login_at',
            'country', 'education_level', 'field_of_study',
            'learning_goal', 'timezone',
            'plan_type', 'ai_quota', 'notes_count', 'ai_usage_count',
            'block_info'
        ]
        read_only_fields = [
            'id', 'email', 'created_at', 'last_login_at',
            'plan_type', 'ai_quota', 'notes_count', 'ai_usage_count'
        ]
    
    def get_ai_quota(self, obj):
        """Get AI quota information"""
        try:
            quota = obj.ai_quota
            return {
                'daily_limit': quota.daily_limit,
                'daily_used': quota.daily_used,
                'monthly_limit': quota.monthly_limit,
                'monthly_used': quota.monthly_used,
            }
        except Exception:
            return {
                'daily_limit': 20,
                'daily_used': 0,
                'monthly_limit': 100,
                'monthly_used': 0,
            }
    
    def get_notes_count(self, obj):
        """Get total notes count"""
        if hasattr(obj, 'notes'):
            return obj.notes.count()
        return 0
    
    def get_ai_usage_count(self, obj):
        """Get total AI usage count"""
        if hasattr(obj, 'ai_tool_usages'):
            return obj.ai_tool_usages.count()
        return 0
    
    def get_plan_type(self, obj):
        """Get plan type from quota"""
        try:
            quota = obj.ai_quota
            if quota.monthly_limit >= 500:
                return 'premium'
            elif quota.monthly_limit >= 100:
                return 'basic'
            return 'free'
        except Exception:
            return 'free'
    
    def get_block_info(self, obj):
        """Get blocking information"""
        is_blocked = not obj.is_active
        return {
            'is_blocked': is_blocked,
            'blocked_reason': getattr(obj, 'blocked_reason', None),
            'blocked_at': getattr(obj, 'blocked_at', None),
            'blocked_by': getattr(obj, 'blocked_by', None),
        }


class UserListSerializer(serializers.ModelSerializer):
    """Compact serializer for user lists"""
    
    plan_type = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'plan_type', 'status',
            'created_at', 'last_login_at', 'email_verified', 'role'
        ]
        read_only_fields = ['id', 'email', 'created_at', 'last_login_at', 'role']
    
    def get_plan_type(self, obj):
        """Get plan type"""
        try:
            quota = obj.ai_quota
            if quota.monthly_limit >= 500:
                return 'premium'
            elif quota.monthly_limit >= 100:
                return 'basic'
            return 'free'
        except Exception:
            return 'free'
    
    def get_status(self, obj):
        """Get user status"""
        if not obj.is_active:
            return 'blocked'
        return 'active'