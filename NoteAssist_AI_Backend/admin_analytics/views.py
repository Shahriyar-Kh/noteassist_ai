# FILE: admin_analytics/views.py
# ============================================================================
# Enterprise Admin Analytics ViewSet
# Enhanced with comprehensive AI usage tracking and detailed user management
# ============================================================================

import csv
import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Avg, Count, Q, Sum
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from ai_tools.models import AIToolUsage, AIToolQuota
from notes.models import Note
from dashboard.models import ActivityLog
from .models import SystemStatistics

User = get_user_model()
logger = logging.getLogger(__name__)


# ============================================================================
# Helper: plan_type derived from profile or quota
# ============================================================================
def _derive_plan(user):
    """Return 'free', 'basic', or 'premium' based on AI quota limits."""
    try:
        quota = user.ai_quota
        if quota.monthly_limit >= 500:
            return 'premium'
        elif quota.monthly_limit >= 100:
            return 'basic'
        return 'free'
    except Exception:
        return 'free'


def _is_blocked(user):
    return not user.is_active


def _apply_plan_limits(user, plan_type):
    """Apply default limits based on plan type."""
    plan_limits = {
        'free': {'daily': 20, 'monthly': 100},
        'basic': {'daily': 50, 'monthly': 300},
        'premium': {'daily': 200, 'monthly': 1000},
    }
    limits = plan_limits.get(plan_type, plan_limits['free'])
    quota, _ = AIToolQuota.objects.get_or_create(user=user)
    quota.daily_limit = limits['daily']
    quota.monthly_limit = limits['monthly']
    quota.save()
    return quota


# ============================================================================
# Main ViewSet
# ============================================================================
class AdminAnalyticsViewSet(viewsets.ViewSet):
    """Admin-only analytics + comprehensive user management API."""

    permission_classes = [IsAdminUser]

    # =========================================================================
    # OVERVIEW
    # =========================================================================
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get overall platform analytics."""
        cache_key = 'admin_overview'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            stats = SystemStatistics.objects.latest()
            if (timezone.now() - stats.calculated_at) > timedelta(hours=1):
                stats = SystemStatistics.calculate()
        except SystemStatistics.DoesNotExist:
            stats = SystemStatistics.calculate()

        now = timezone.now()
        week_ago = now - timedelta(days=7)

        # Calculate week-over-week growth for notes
        notes_last_week = Note.objects.filter(
            created_at__range=[now - timedelta(days=14), week_ago]
        ).count()
        notes_this_week = Note.objects.filter(created_at__gte=week_ago).count()
        notes_growth = round(
            ((notes_this_week - notes_last_week) / max(notes_last_week, 1)) * 100, 1
        )

        # AI growth
        ai_last_week = AIToolUsage.objects.filter(
            created_at__range=[now - timedelta(days=14), week_ago]
        ).count()
        ai_this_week = AIToolUsage.objects.filter(created_at__gte=week_ago).count()
        ai_growth = round(
            ((ai_this_week - ai_last_week) / max(ai_last_week, 1)) * 100, 1
        )

        active_ratio = round(
            (stats.active_users_week / max(stats.total_users, 1)) * 100, 1
        )

        # User distribution by plan
        users_by_plan = {'free': 0, 'basic': 0, 'premium': 0}
        for user in User.objects.prefetch_related('ai_quota'):
            plan = _derive_plan(user)
            users_by_plan[plan] += 1

        # AI requests across all users
        total_ai_requests = AIToolUsage.objects.count()
        
        data = {
            'total_users': stats.total_users,
            'active_users': stats.active_users_week,
            'active_users_ratio': active_ratio,
            'active_users_today': stats.active_users_today,
            'total_notes': stats.total_notes,
            'published_notes': stats.published_notes,
            'total_ai_generations': stats.total_ai_requests,
            'total_ai_requests': total_ai_requests,
            'avg_response_time': round(stats.avg_response_time, 2),
            'notes_growth_7d': notes_growth,
            'ai_usage_growth_7d': ai_growth,
            'users_by_plan': users_by_plan,
        }

        cache.set(cache_key, data, 600)
        return Response(data)

    # =========================================================================
    # USER LIST (with enhanced pagination and filtering)
    # =========================================================================
    @action(detail=False, methods=['get'])
    def users(self, request):
        """Get detailed user list with AI usage stats and filtering."""
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        search = request.query_params.get('search', '').strip()
        plan_type = request.query_params.get('plan_type', '')
        status_filter = request.query_params.get('status', '')
        sort_by = request.query_params.get('sort_by', '-created_at')

        qs = User.objects.annotate(
            note_count=Count('notes', distinct=True),
            ai_usage_count=Count('ai_tool_usages', distinct=True),
        ).select_related()

        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) | Q(email__icontains=search)
            )

        if status_filter == 'active':
            qs = qs.filter(is_active=True)
        elif status_filter == 'blocked':
            qs = qs.filter(is_active=False)

        # Sorting
        sort_map = {
            '-created_at': '-created_at',
            'created_at': 'created_at',
            '-ai_usage_count': '-ai_usage_count',
            '-note_count': '-note_count',
            '-last_login_at': '-last_login_at',
        }
        qs = qs.order_by(sort_map.get(sort_by, '-created_at'))

        total = qs.count()
        pages = (total + page_size - 1) // page_size
        offset = (page - 1) * page_size
        users_page = qs[offset: offset + page_size]

        results = []
        for user in users_page:
            derived_plan = _derive_plan(user)
            if plan_type and derived_plan != plan_type:
                continue
            
            # Get AI usage breakdown
            ai_usage_data = AIToolUsage.objects.filter(user=user).values('tool_type').annotate(
                count=Count('id')
            )
            ai_by_feature = {item['tool_type']: item['count'] for item in ai_usage_data}
            
            results.append({
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name or user.email.split('@')[0],
                'plan_type': derived_plan,
                'status': 'blocked' if _is_blocked(user) else 'active',
                'is_blocked': _is_blocked(user),
                'note_count': user.note_count,
                'ai_usage_count': user.ai_usage_count,
                'ai_usage_by_feature': ai_by_feature,
                'created_at': user.created_at,
                'last_login_at': user.last_login_at,
                'email_verified': user.email_verified,
                'role': user.role,
            })

        return Response({
            'results': results,
            'count': total,
            'pages': pages,
            'page': page,
        })

    # =========================================================================
    # USER STATS (for stats cards on management page)
    # =========================================================================
    @action(detail=False, methods=['get'])
    def user_stats(self, request):
        """Get comprehensive user and platform statistics."""
        cache_key = 'admin_user_stats'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        two_weeks_ago = now - timedelta(days=14)

        all_users = User.objects.filter(is_active=True)
        total = User.objects.count()
        active_today = User.objects.filter(last_login_at__gte=today_start).count()
        active_week = User.objects.filter(last_login_at__gte=week_ago).count()
        new_today = User.objects.filter(created_at__gte=today_start).count()

        # Growth: compare last 7d signups vs 7d before that
        new_this_week = User.objects.filter(created_at__gte=week_ago).count()
        new_last_week = User.objects.filter(
            created_at__range=[two_weeks_ago, week_ago]
        ).count()
        user_growth_pct = round(
            ((new_this_week - new_last_week) / max(new_last_week, 1)) * 100, 1
        )

        active_this_week = active_week
        active_last_week = User.objects.filter(
            last_login_at__range=[two_weeks_ago, week_ago]
        ).count()
        active_growth_pct = round(
            ((active_this_week - active_last_week) / max(active_last_week, 1)) * 100, 1
        )

        total_notes = Note.objects.count()
        published_notes = Note.objects.filter(status='published').count()
        notes_this_week = Note.objects.filter(created_at__gte=week_ago).count()
        notes_last_week = Note.objects.filter(
            created_at__range=[two_weeks_ago, week_ago]
        ).count()
        notes_growth_pct = round(
            ((notes_this_week - notes_last_week) / max(notes_last_week, 1)) * 100, 1
        )

        total_ai = AIToolUsage.objects.count()
        ai_this_week = AIToolUsage.objects.filter(created_at__gte=week_ago).count()
        ai_last_week = AIToolUsage.objects.filter(
            created_at__range=[two_weeks_ago, week_ago]
        ).count()
        ai_growth_pct = round(
            ((ai_this_week - ai_last_week) / max(ai_last_week, 1)) * 100, 1
        )

        # Plan distribution
        free_count = basic_count = premium_count = 0
        for user in User.objects.prefetch_related('ai_quota'):
            p = _derive_plan(user)
            if p == 'premium':
                premium_count += 1
            elif p == 'basic':
                basic_count += 1
            else:
                free_count += 1

        # 7-day growth trend (new signups per day)
        growth_trend = []
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).date()
            count = User.objects.filter(created_at__date=day).count()
            growth_trend.append({'date': str(day), 'count': count})

        # Sparkline data (last 7 days of active users)
        active_trend = []
        for i in range(6, -1, -1):
            day_start = (now - timedelta(days=i)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            day_end = day_start + timedelta(days=1)
            count = User.objects.filter(
                last_login_at__range=[day_start, day_end]
            ).count()
            active_trend.append(count)

        notes_trend = []
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).date()
            count = Note.objects.filter(created_at__date=day).count()
            notes_trend.append(count)

        ai_trend = []
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).date()
            count = AIToolUsage.objects.filter(created_at__date=day).count()
            ai_trend.append(count)

        data = {
            'total_users': total,
            'active_users_today': active_today,
            'active_users_week': active_week,
            'new_users_today': new_today,
            'user_growth_pct': user_growth_pct,
            'active_growth_pct': active_growth_pct,
            'total_notes': total_notes,
            'published_notes': published_notes,
            'notes_growth_pct': notes_growth_pct,
            'total_ai_requests': total_ai,
            'ai_growth_pct': ai_growth_pct,
            'free_users': free_count,
            'basic_users': basic_count,
            'premium_users': premium_count,
            'growth_trend': growth_trend,
            'active_trend': active_trend,
            'notes_trend': notes_trend,
            'ai_trend': ai_trend,
        }

        cache.set(cache_key, data, 300)
        return Response(data)

    # =========================================================================
    # USER INSIGHTS (leaderboard and analytics data)
    # =========================================================================
    @action(detail=False, methods=['get'])
    def user_insights(self, request):
        """Get user leaderboards and insights by type."""
        insight_type = request.query_params.get('type', 'top_creators')
        limit = min(int(request.query_params.get('limit', 10)), 50)

        now = timezone.now()
        week_ago = now - timedelta(days=7)

        if insight_type == 'top_creators':
            qs = (
                User.objects
                .annotate(total_notes=Count('notes', distinct=True))
                .filter(total_notes__gt=0)
                .order_by('-total_notes')[:limit]
            )
            data = [
                {
                    'id': u.id,
                    'full_name': u.full_name or u.email.split('@')[0],
                    'email': u.email,
                    'total_notes': u.total_notes,
                    'plan_type': _derive_plan(u),
                }
                for u in qs
            ]

        elif insight_type == 'ai_power_users':
            qs = (
                User.objects
                .annotate(ai_usage_count=Count('ai_tool_usages', distinct=True))
                .filter(ai_usage_count__gt=0)
                .order_by('-ai_usage_count')[:limit]
            )
            data = []
            for u in qs:
                # Find most-used tool
                most_used = (
                    AIToolUsage.objects
                    .filter(user=u)
                    .values('tool_type')
                    .annotate(cnt=Count('id'))
                    .order_by('-cnt')
                    .first()
                )
                data.append({
                    'id': u.id,
                    'full_name': u.full_name or u.email.split('@')[0],
                    'email': u.email,
                    'ai_usage_count': u.ai_usage_count,
                    'most_used_tool': most_used['tool_type'] if most_used else '-',
                    'plan_type': _derive_plan(u),
                })

        elif insight_type == 'most_published':
            qs = (
                User.objects
                .annotate(
                    published_notes=Count('notes', filter=Q(notes__status='published'), distinct=True),
                    total_notes=Count('notes', distinct=True),
                )
                .filter(published_notes__gt=0)
                .order_by('-published_notes')[:limit]
            )
            data = [
                {
                    'id': u.id,
                    'full_name': u.full_name or u.email.split('@')[0],
                    'email': u.email,
                    'published_notes': u.published_notes,
                    'total_notes': u.total_notes,
                    'publish_ratio': round(
                        (u.published_notes / max(u.total_notes, 1)) * 100, 1
                    ),
                    'plan_type': _derive_plan(u),
                }
                for u in qs
            ]

        elif insight_type == 'new_users':
            qs = (
                User.objects
                .filter(created_at__gte=now - timedelta(days=30))
                .annotate(note_count=Count('notes', distinct=True))
                .order_by('-created_at')[:limit]
            )
            data = [
                {
                    'id': u.id,
                    'full_name': u.full_name or u.email.split('@')[0],
                    'email': u.email,
                    'created_at': u.created_at,
                    'notes_in_first_week': Note.objects.filter(
                        user=u,
                        created_at__lte=u.created_at + timedelta(days=7),
                    ).count(),
                    'plan_type': _derive_plan(u),
                }
                for u in qs
            ]

        elif insight_type == 'active_users':
            qs = (
                User.objects
                .filter(last_login_at__gte=week_ago)
                .annotate(
                    ai_usage_count=Count('ai_tool_usages', distinct=True),
                    note_count=Count('notes', distinct=True),
                )
                .order_by('-last_login_at')[:limit]
            )
            data = [
                {
                    'id': u.id,
                    'full_name': u.full_name or u.email.split('@')[0],
                    'email': u.email,
                    'last_active': u.last_login_at,
                    'activity_score': u.ai_usage_count + u.note_count,
                    'plan_type': _derive_plan(u),
                }
                for u in qs
            ]

        else:
            return Response(
                {'error': f'Unknown insight type: {insight_type}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(data)

    # =========================================================================
    # USER DETAIL (comprehensive single user analytics)
    # =========================================================================
    @action(detail=False, methods=['get'])
    def user_detail(self, request):
        """Get detailed information about a specific user with comprehensive stats."""
        user_id = request.query_params.get('user_id')
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        week_ago = now - timedelta(days=7)

        # Notes stats
        notes_qs = Note.objects.filter(user=user)
        total_notes = notes_qs.count()
        published_notes = notes_qs.filter(status='published').count()
        draft_notes = total_notes - published_notes

        # AI usage breakdown by tool
        ai_qs = AIToolUsage.objects.filter(user=user)
        ai_by_type = {
            row['tool_type']: row['cnt']
            for row in ai_qs.values('tool_type').annotate(cnt=Count('id'))
        }

        # 7-day AI trend
        ai_trend_7d = []
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).date()
            count = ai_qs.filter(created_at__date=day).count()
            ai_trend_7d.append({'date': str(day), 'count': count})

        # Quota and limits
        quota_data = {}
        try:
            quota = user.ai_quota
            quota.reset_daily_quota()
            quota_data = {
                'daily_limit': quota.daily_limit,
                'daily_used': quota.daily_used,
                'monthly_limit': quota.monthly_limit,
                'monthly_used': quota.monthly_used,
                'weekly_limit': getattr(quota, 'weekly_limit', quota.daily_limit * 7),
                'weekly_used': getattr(quota, 'weekly_used', 0),
            }
        except Exception:
            quota_data = {
                'daily_limit': 20, 'daily_used': 0,
                'monthly_limit': 100, 'monthly_used': 0,
                'weekly_limit': 100, 'weekly_used': 0,
            }

        # Activity history (last 20 entries)
        activity_qs = (
            ActivityLog.objects
            .filter(user=user)
            .order_by('-created_at')[:20]
        )
        activity_history = [
            {
                'id': a.id,
                'activity_type': a.activity_type,
                'description': a.description,
                'created_at': a.created_at,
                'metadata': a.metadata,
            }
            for a in activity_qs
        ]

        # Recent AI usage details
        recent_ai_usage = AIToolUsage.objects.filter(user=user).order_by('-created_at')[:20]
        ai_usage_history = [
            {
                'id': usage.id,
                'tool_type': usage.tool_type,
                'response_time': usage.response_time,
                'created_at': usage.created_at,
            }
            for usage in recent_ai_usage
        ]

        data = {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name or user.email.split('@')[0],
            'plan_type': _derive_plan(user),
            'is_blocked': _is_blocked(user),
            'is_active': user.is_active,
            'role': user.role,
            'email_verified': user.email_verified,
            'created_at': user.created_at,
            'last_login_at': user.last_login_at,

            # Notes stats
            'notes_stats': {
                'total': total_notes,
                'published': published_notes,
                'drafts': draft_notes,
                'total_views': 0,
            },

            # AI usage
            'ai_usage': ai_by_type,
            'ai_usage_count': ai_qs.count(),
            'ai_trend_7d': ai_trend_7d,
            'ai_usage_history': ai_usage_history,
            'ai_quota': quota_data,

            # Activity
            'activity_history': activity_history,
        }
        return Response(data)

    # =========================================================================
    # BLOCK / UNBLOCK USER
    # =========================================================================
    @action(detail=False, methods=['post'])
    def block_user(self, request):
        """Block a user account with optional reason."""
        user_id = request.query_params.get('user_id')
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if user.is_superuser or user.role == 'admin':
            return Response(
                {'error': 'Cannot block admin users'},
                status=status.HTTP_403_FORBIDDEN
            )

        reason = request.data.get('reason', 'Policy violation')
        user.is_active = False
        user.save(update_fields=['is_active'])

        # Log the admin action
        ActivityLog.log_activity(
            user=user,
            activity_type='account_blocked',
            description=f'Account blocked by admin {request.user.email}. Reason: {reason}',
        )

        logger.info(f"Admin {request.user.email} blocked user {user.email}. Reason: {reason}")
        return Response({
            'success': True,
            'message': f'User {user.email} has been blocked.',
            'user': {
                'id': user.id,
                'email': user.email,
                'is_blocked': True,
            }
        })

    @action(detail=False, methods=['post'])
    def unblock_user(self, request):
        """Unblock a previously blocked user."""
        user_id = request.query_params.get('user_id')
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        user.is_active = True
        user.save(update_fields=['is_active'])

        ActivityLog.log_activity(
            user=user,
            activity_type='account_unblocked',
            description=f'Account unblocked by admin {request.user.email}.',
        )

        logger.info(f"Admin {request.user.email} unblocked user {user.email}")
        return Response({
            'success': True,
            'message': f'User {user.email} has been unblocked.',
            'user': {
                'id': user.id,
                'email': user.email,
                'is_blocked': False,
            }
        })

    # =========================================================================
    # UPDATE AI LIMITS
    # =========================================================================
    @action(detail=False, methods=['patch'])
    def update_ai_limits(self, request):
        """Update user AI usage limits."""
        user_id = request.query_params.get('user_id')
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        quota, _ = AIToolQuota.objects.get_or_create(user=user)
        
        if 'daily_limit' in request.data:
            quota.daily_limit = int(request.data['daily_limit'])
        if 'monthly_limit' in request.data:
            quota.monthly_limit = int(request.data['monthly_limit'])
        quota.save()

        ActivityLog.log_activity(
            user=user,
            activity_type='ai_limits_updated',
            description=f'AI limits updated by admin {request.user.email}: daily={quota.daily_limit}, monthly={quota.monthly_limit}',
        )

        logger.info(f"Admin {request.user.email} updated AI limits for {user.email}")
        return Response({
            'success': True,
            'message': 'Limits updated successfully',
            'limits': {
                'daily': quota.daily_limit,
                'monthly': quota.monthly_limit,
            }
        })

    # =========================================================================
    # TOGGLE AI ACCESS
    # =========================================================================
    @action(detail=False, methods=['patch'])
    def toggle_ai_access(self, request):
        """Enable or disable AI access for a user."""
        user_id = request.query_params.get('user_id')
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        enabled = bool(request.data.get('enabled', True))
        quota, _ = AIToolQuota.objects.get_or_create(user=user)

        if not enabled:
            # Effectively disable by setting limits to 0
            quota.daily_limit = 0
            quota.monthly_limit = 0
        else:
            # Restore sensible defaults if currently disabled
            if quota.daily_limit == 0:
                quota.daily_limit = 20
            if quota.monthly_limit == 0:
                quota.monthly_limit = 100
        quota.save()

        ActivityLog.log_activity(
            user=user,
            activity_type='ai_access_toggled',
            description=f'AI access {"enabled" if enabled else "disabled"} by admin {request.user.email}.',
        )

        logger.info(f"Admin {request.user.email} toggled AI access for {user.email}: {enabled}")
        return Response({
            'success': True,
            'ai_enabled': enabled,
            'message': f'AI access has been {"enabled" if enabled else "disabled"}'
        })

    # =========================================================================
    # UPDATE PLAN
    # =========================================================================
    @action(detail=False, methods=['patch'])
    def update_plan(self, request):
        """Update user plan type and apply default limits."""
        user_id = request.query_params.get('user_id')
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        plan = request.data.get('plan', 'free')
        
        if plan not in ['free', 'basic', 'premium']:
            return Response(
                {'error': 'Invalid plan type. Must be free, basic, or premium'},
                status=status.HTTP_400_BAD_REQUEST
            )

        quota = _apply_plan_limits(user, plan)

        ActivityLog.log_activity(
            user=user,
            activity_type='plan_updated',
            description=f'Plan changed to "{plan}" by admin {request.user.email}.',
        )

        logger.info(f"Admin {request.user.email} updated plan for {user.email} to {plan}")
        return Response({
            'success': True,
            'message': f'Plan updated to {plan}',
            'plan': {
                'type': plan,
                'daily_limit': quota.daily_limit,
                'monthly_limit': quota.monthly_limit,
            }
        })

    # =========================================================================
    # UPDATE FEATURES (if supported by User model)
    # =========================================================================
    @action(detail=False, methods=['patch'])
    def update_features(self, request):
        """Update user feature access permissions."""
        user_id = request.query_params.get('user_id')
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Track which features were updated
        features_updated = []
        update_fields = []
        
        # List of feature flags that might exist on the User model
        feature_fields = [
            'can_generate_topic',
            'can_improve',
            'can_summarize',
            'can_generate_code',
            'can_export_pdf',
            'can_use_google_drive',
        ]
        
        for feature in feature_fields:
            if feature in request.data and hasattr(user, feature):
                setattr(user, feature, request.data[feature])
                features_updated.append(feature)
                update_fields.append(feature)

        if update_fields:
            user.save(update_fields=update_fields)
            ActivityLog.log_activity(
                user=user,
                activity_type='features_updated',
                description=f'Features updated by admin {request.user.email}: {", ".join(features_updated)}',
            )
            logger.info(f"Admin {request.user.email} updated features for {user.email}")

        # Build response with current feature status
        response_features = {}
        for feature in feature_fields:
            if hasattr(user, feature):
                response_features[feature] = getattr(user, feature)

        return Response({
            'success': True,
            'message': 'Feature access updated',
            'features_updated': features_updated,
            'features': response_features
        })

    # =========================================================================
    # SEND USER EMAIL
    # =========================================================================
    @action(detail=False, methods=['post'])
    def send_user_email(self, request):
        """Send predefined emails to users for various actions."""
        user_id = request.query_params.get('user_id')
        
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        email_type = request.data.get('email_type', '')

        email_subjects = {
            'account_blocked': 'Your NoteAssist AI account has been suspended',
            'limits_changed': 'Your NoteAssist AI usage limits have been updated',
            'ai_revoked': 'Your NoteAssist AI access has been updated',
            'plan_updated': 'Your NoteAssist AI plan has been updated',
        }

        email_bodies = {
            'account_blocked': (
                f"Hello {user.full_name or user.email},\n\n"
                "Your NoteAssist AI account has been suspended due to a policy violation. "
                "If you believe this was a mistake, please contact our support team.\n\n"
                "— NoteAssist AI Team"
            ),
            'limits_changed': (
                f"Hello {user.full_name or user.email},\n\n"
                "Your AI usage limits on NoteAssist AI have been updated by our admin team. "
                "Log in to see your current limits under Account Settings.\n\n"
                "— NoteAssist AI Team"
            ),
            'ai_revoked': (
                f"Hello {user.full_name or user.email},\n\n"
                "Your AI tools access on NoteAssist AI has been modified. "
                "If you have questions, please contact support.\n\n"
                "— NoteAssist AI Team"
            ),
            'plan_updated': (
                f"Hello {user.full_name or user.email},\n\n"
                "Your NoteAssist AI subscription plan has been updated. "
                "Log in to see your new benefits.\n\n"
                "— NoteAssist AI Team"
            ),
        }

        subject = email_subjects.get(email_type)
        body = email_bodies.get(email_type)

        if not subject:
            return Response(
                {'error': f'Unknown email type: {email_type}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from django.core.mail import send_mail
            from django.conf import settings

            from_email = (
                getattr(settings, 'SENDGRID_FROM_EMAIL', None) or settings.DEFAULT_FROM_EMAIL
            )
            send_mail(subject, body, from_email, [user.email], fail_silently=False)
            logger.info(f"Admin {request.user.email} sent '{email_type}' email to {user.email}")
            return Response({
                'success': True,
                'message': f'Email sent to {user.email}'
            })

        except Exception as e:
            logger.error(f"Failed to send admin email to {user.email}: {str(e)}")
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # =========================================================================
    # EXPORT USERS CSV
    # =========================================================================
    @action(detail=False, methods=['get'])
    def export_users(self, request):
        """Export user list to CSV with filtering."""
        search = request.query_params.get('search', '').strip()
        plan_type = request.query_params.get('plan_type', '')
        status_filter = request.query_params.get('status', '')

        qs = User.objects.annotate(
            note_count=Count('notes', distinct=True),
            ai_usage_count=Count('ai_tool_usages', distinct=True),
        )

        if search:
            qs = qs.filter(Q(full_name__icontains=search) | Q(email__icontains=search))
        if status_filter == 'active':
            qs = qs.filter(is_active=True)
        elif status_filter == 'blocked':
            qs = qs.filter(is_active=False)

        def stream():
            yield 'ID,Name,Email,Plan,Status,Notes,AI Requests,Joined,Last Login\n'
            for user in qs.iterator():
                derived = _derive_plan(user)
                if plan_type and derived != plan_type:
                    continue
                row = [
                    str(user.id),
                    user.full_name or '',
                    user.email,
                    derived,
                    'blocked' if _is_blocked(user) else 'active',
                    str(user.note_count),
                    str(user.ai_usage_count),
                    user.created_at.strftime('%Y-%m-%d') if user.created_at else '',
                    user.last_login_at.strftime('%Y-%m-%d') if user.last_login_at else '',
                ]
                yield ','.join(row) + '\n'

        response = StreamingHttpResponse(stream(), content_type='text/csv')
        response['Content-Disposition'] = (
            f'attachment; filename="users_{timezone.now().date()}.csv"'
        )
        return response

    # =========================================================================
    # COMPREHENSIVE AI ANALYTICS
    # =========================================================================
    @action(detail=False, methods=['get'], url_path='ai-analytics')
    def ai_analytics(self, request):
        """Get comprehensive AI usage analytics by type and user."""
        # Overall AI usage
        total_requests = AIToolUsage.objects.count()
        
        # Usage by feature/tool type
        by_type = AIToolUsage.objects.values('tool_type').annotate(
            count=Count('id'),
            avg_time=Avg('response_time')
        )
        
        # Top users by AI usage
        top_users = (
            User.objects
            .annotate(ai_count=Count('ai_tool_usages', distinct=True))
            .filter(ai_count__gt=0)
            .order_by('-ai_count')[:10]
            .values('id', 'email', 'full_name', 'ai_count')
        )
        
        # Usage by plan type
        usage_by_plan = []
        for plan in ['free', 'basic', 'premium']:
            plan_users = User.objects.filter(ai_quota__monthly_limit__gte={
                'free': 0, 'basic': 100, 'premium': 500
            }.get(plan, 0))
            
            plan_usage = AIToolUsage.objects.filter(user__in=plan_users).count()
            usage_by_plan.append({
                'plan': plan,
                'users': plan_users.count(),
                'total_requests': plan_usage,
            })
        
        return Response({
            'total_requests': total_requests,
            'by_type': list(by_type),
            'top_users': list(top_users),
            'by_plan': usage_by_plan,
        })

    # =========================================================================
    # REFRESH STATISTICS
    # =========================================================================
    @action(detail=False, methods=['post'])
    def refresh(self, request):
        """Force recalculation of system statistics."""
        try:
            stats = SystemStatistics.calculate()
            cache.delete('admin_overview')
            cache.delete('admin_user_stats')
            return Response({
                'success': True,
                'calculated_at': stats.calculated_at
            })
        except Exception as e:
            logger.error(f"Error refreshing statistics: {str(e)}")
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # =========================================================================
    # LEGACY COMPATIBILITY
    # =========================================================================
    @action(detail=False, methods=['get'])
    def user_metrics(self, request):
        """Legacy endpoint - delegates to users()."""
        return self.users(request)

    @action(detail=False, methods=['get'])
    def ai_metrics(self, request):
        """Legacy endpoint - delegates to ai_analytics()."""
        return self.ai_analytics(request)