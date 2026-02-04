from rest_framework import serializers

from .models import AIToolUsage, AIToolOutput, AIToolQuota


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
