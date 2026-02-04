from django.contrib import admin

from .models import SystemStatistics


@admin.register(SystemStatistics)
class SystemStatisticsAdmin(admin.ModelAdmin):
    list_display = (
        'total_users',
        'total_notes',
        'total_ai_requests',
        'avg_response_time',
        'calculated_at',
    )
    ordering = ('-calculated_at',)
