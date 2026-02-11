# FILE: accounts/admin_views.py
# Comprehensive User Management API for Admin
# ============================================================================

from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum, Avg, F
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from ai_tools.models import AIToolUsage
from notes.models import Note
from .models import UserPlan, UserActionLog, LoginActivity
from notes.sendgrid_service import send_admin_notification_email
from django.db.models import Count, Q, Sum, Avg, F

User = get_user_model()


class UserManagementPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminUserManagementViewSet(viewsets.ViewSet):
    """Comprehensive user management for admins"""
    
    permission_classes = [IsAdminUser]
    pagination_class = UserManagementPagination
    
    @action(detail=False, methods=['get'])
    def all_users(self, request):
        """Get all users with advanced filtering and search"""
        
        # Query parameters
        search = request.query_params.get('search', '')
        plan_type = request.query_params.get('plan_type', '')
        status_filter = request.query_params.get('status', '')  # active, blocked
        sort_by = request.query_params.get('sort_by', '-created_at')
        
        # Base queryset
        queryset = User.objects.select_related('plan').annotate(
            total_notes=Count('notes'),
            published_notes=Count('notes', filter=Q(notes__status='published')),
            draft_notes=Count('notes', filter=Q(notes__status='draft')),
            ai_usage_count=Count('ai_tool_usages')
        )
        
        # Apply search
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(full_name__icontains=search) |
                Q(username__icontains=search)
            )
        
        # Apply plan filter
        if plan_type:
            queryset = queryset.filter(plan__plan_type=plan_type)
        
        # Apply status filter
        if status_filter == 'blocked':
            queryset = queryset.filter(plan__is_blocked=True)
        elif status_filter == 'active':
            queryset = queryset.filter(is_active=True, plan__is_blocked=False)
        
        # Apply sorting
        valid_sort_fields = [
            'created_at', '-created_at',
            'total_notes', '-total_notes',
            'ai_usage_count', '-ai_usage_count',
            'email', '-email'
        ]
        if sort_by in valid_sort_fields:
            queryset = queryset.order_by(sort_by)
        
        # Pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        
        # Serialize data
        users_data = []
        for user in page:
            try:
                plan = user.plan
            except UserPlan.DoesNotExist:
                plan = UserPlan.objects.create(user=user)
            
            users_data.append({
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'username': user.username,
                'created_at': user.created_at,
                'last_login_at': user.last_login_at,
                'is_active': user.is_active,
                'plan_type': plan.plan_type,
                'is_blocked': plan.is_blocked,
                'total_notes': user.total_notes,
                'published_notes': user.published_notes,
                'draft_notes': user.draft_notes,
                'ai_usage_count': user.ai_usage_count,
                'total_views': 0,
            })
        
        return paginator.get_paginated_response(users_data)
    
    @action(detail=False, methods=['get'], url_path='insights')
    def user_insights(self, request):
        """Get user insights and analytics"""
        
        filter_type = request.query_params.get('filter', 'all')
        limit = int(request.query_params.get('limit', 10))
        
        base_queryset = User.objects.select_related('plan')
        
        if filter_type == 'top_creators':
            users = base_queryset.annotate(
                note_count=Count('notes')
            ).filter(note_count__gt=0).order_by('-note_count')[:limit]
            
            data = [{
                'id': u.id,
                'email': u.email,
                'full_name': u.full_name,
                'count': u.note_count
            } for u in users]
        
        elif filter_type == 'most_ai_usage':
            users = base_queryset.annotate(
                ai_count=Count('ai_tool_usages')
            ).filter(ai_count__gt=0).order_by('-ai_count')[:limit]
            
            data = [{
                'id': u.id,
                'email': u.email,
                'full_name': u.full_name,
                'count': u.ai_count
            } for u in users]
        
        elif filter_type == 'most_published':
            users = base_queryset.annotate(
                published_count=Count('notes', filter=Q(notes__status='published'))
            ).filter(published_count__gt=0).order_by('-published_count')[:limit]
            
            data = [{
                'id': u.id,
                'email': u.email,
                'full_name': u.full_name,
                'count': u.published_count
            } for u in users]
        
        elif filter_type == 'most_viewed':
            users = base_queryset.annotate(
                total_views=Count('notes')
            ).filter(total_views__gt=0).order_by('-total_views')[:limit]
            
            data = [{
                'id': u.id,
                'email': u.email,
                'full_name': u.full_name,
                'count': u.total_views
            } for u in users]
        
        elif filter_type == 'new_users_today':
            today = timezone.now().date()
            users = base_queryset.filter(
                created_at__date=today
            ).order_by('-created_at')[:limit]
            
            data = [{
                'id': u.id,
                'email': u.email,
                'full_name': u.full_name,
                'created_at': u.created_at
            } for u in users]
        
        elif filter_type == 'new_users_week':
            week_ago = timezone.now() - timedelta(days=7)
            users = base_queryset.filter(
                created_at__gte=week_ago
            ).order_by('-created_at')[:limit]
            
            data = [{
                'id': u.id,
                'email': u.email,
                'full_name': u.full_name,
                'created_at': u.created_at
            } for u in users]
        
        elif filter_type == 'active_users':
            week_ago = timezone.now() - timedelta(days=7)
            users = base_queryset.filter(
                last_login_at__gte=week_ago
            ).order_by('-last_login_at')[:limit]
            
            data = [{
                'id': u.id,
                'email': u.email,
                'full_name': u.full_name,
                'last_login_at': u.last_login_at
            } for u in users]
        
        else:
            return Response({'error': 'Invalid filter type'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(data)
    
    @action(detail=True, methods=['get'])
    def user_detail(self, request, pk=None):
        """Get detailed information about a single user with comprehensive AI usage"""
        
        try:
            user = User.objects.select_related('plan').annotate(
                total_notes=Count('notes'),
                published_notes=Count('notes', filter=Q(notes__status='published')),
                draft_notes=Count('notes', filter=Q(notes__status='draft')),
                total_ai_usage=Count('ai_tool_usages')
            ).get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get or create user plan
        try:
            plan = user.plan
        except UserPlan.DoesNotExist:
            plan = UserPlan.objects.create(user=user)
        
        # AI usage breakdown by tool type with individual counts
        ai_usage_by_tool = AIToolUsage.objects.filter(user=user).values('tool_type').annotate(
            count=Count('id'),
            total_tokens=Sum('tokens_used'),
            avg_response_time=Avg('response_time')
        )
        
        # Create a detailed breakdown
        ai_breakdown = {
            'generate': 0,
            'improve': 0,
            'summarize': 0,
            'code': 0,
            'total': 0
        }
        
        for usage in ai_usage_by_tool:
            tool_type = usage['tool_type']
            count = usage['count']
            ai_breakdown[tool_type] = count
            ai_breakdown['total'] += count
        
        # Recent activity
        recent_notes = Note.objects.filter(user=user).order_by('-created_at')[:5]
        recent_ai_usage = AIToolUsage.objects.filter(user=user).select_related('note').order_by('-created_at')[:10]
        recent_logins = LoginActivity.objects.filter(user=user).order_by('-login_at')[:5]
        
        # Action logs
        action_logs = UserActionLog.objects.filter(user=user).select_related('admin').order_by('-created_at')[:10]
        
        data = {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'username': user.username,
            'country': user.country,
            'education_level': user.education_level,
            'field_of_study': user.field_of_study,
            'created_at': user.created_at,
            'last_login_at': user.last_login_at,
            'is_active': user.is_active,
            'email_verified': user.email_verified,
            
            # Statistics
            'total_notes': user.total_notes,
            'published_notes': user.published_notes,
            'draft_notes': user.draft_notes,
            'total_ai_usage': user.total_ai_usage,
            
            # Detailed AI Usage Breakdown
            'ai_usage_breakdown': ai_breakdown,
            'ai_usage_details': {
                'generate_topic': ai_breakdown['generate'],
                'improve': ai_breakdown['improve'],
                'summarize': ai_breakdown['summarize'],
                'generate_code': ai_breakdown['code'],
                'total': ai_breakdown['total']
            },
            
            # Plan Information
            'plan': {
                'type': plan.plan_type,
                'is_blocked': plan.is_blocked,
                'blocked_reason': plan.blocked_reason,
                'blocked_at': plan.blocked_at,
                'can_use_ai_tools': plan.can_use_ai_tools,
                'can_export_pdf': plan.can_export_pdf,
                'can_publish_notes': plan.can_publish_notes,
                'max_notes': plan.max_notes,
                'daily_ai_limit': plan.daily_ai_limit,
                'weekly_ai_limit': plan.weekly_ai_limit,
                'monthly_ai_limit': plan.monthly_ai_limit,
                'ai_requests_today': plan.ai_requests_today,
                'ai_requests_week': plan.ai_requests_week,
                'ai_requests_month': plan.ai_requests_month,
            },
            
            # AI Usage Breakdown by Tool (detailed)
            'ai_usage_by_tool': [{
                'tool_type': item['tool_type'],
                'tool_name': dict(AIToolUsage.TOOL_TYPES).get(item['tool_type'], item['tool_type']),
                'count': item['count'],
                'total_tokens': item['total_tokens'] or 0,
                'avg_response_time': round(item['avg_response_time'], 2) if item['avg_response_time'] else 0
            } for item in ai_usage_by_tool],
            
            # Recent Activity
            'recent_notes': [{
                'id': n.id,
                'title': n.title,
                'status': n.status,
                'is_published': n.status == 'published',
                'created_at': n.created_at
            } for n in recent_notes],
            
            'recent_ai_usage': [{
                'id': a.id,
                'tool_type': a.tool_type,
                'tool_name': a.get_tool_type_display(),
                'created_at': a.created_at,
                'tokens_used': a.tokens_used,
                'response_time': round(a.response_time, 2),
                'note_title': a.note.title if a.note else None
            } for a in recent_ai_usage],
            
            'recent_logins': [{
                'login_at': l.login_at,
                'ip_address': l.ip_address,
                'device_type': l.device_type,
                'location': l.location
            } for l in recent_logins],
            
            # Action Logs
            'action_logs': [{
                'action': log.action,
                'admin_email': log.admin.email if log.admin else 'System',
                'details': log.details,
                'created_at': log.created_at
            } for log in action_logs]
        }
        
        return Response(data)


    @action(detail=True, methods=['post'])
    def block_user(self, request, pk=None):
        """Block a user"""
        
        try:
            user = User.objects.get(pk=pk)
            plan = user.plan
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except UserPlan.DoesNotExist:
            plan = UserPlan.objects.create(user=user)
        
        reason = request.data.get('reason', 'Blocked by admin')
        
        plan.is_blocked = True
        plan.blocked_reason = reason
        plan.blocked_at = timezone.now()
        plan.save()
        
        # Log action
        UserActionLog.objects.create(
            user=user,
            admin=request.user,
            action='block',
            details={'reason': reason},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        # Send email notification
        try:
            send_admin_notification_email(
                user_email=user.email,
                subject='Your Account Has Been Blocked',
                message=f'Your account has been blocked. Reason: {reason}',
                action_type='block'
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
        
        return Response({
            'success': True,
            'message': 'User blocked successfully'
        })
    
    @action(detail=True, methods=['post'])
    def unblock_user(self, request, pk=None):
        """Unblock a user"""
        
        try:
            user = User.objects.get(pk=pk)
            plan = user.plan
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except UserPlan.DoesNotExist:
            return Response({'error': 'User plan not found'}, status=status.HTTP_404_NOT_FOUND)
        
        plan.is_blocked = False
        plan.blocked_reason = ''
        plan.blocked_at = None
        plan.save()
        
        # Log action
        UserActionLog.objects.create(
            user=user,
            admin=request.user,
            action='unblock',
            details={},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        # Send email notification
        try:
            send_admin_notification_email(
                user_email=user.email,
                subject='Your Account Has Been Unblocked',
                message='Your account has been unblocked. You can now access all features.',
                action_type='unblock'
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
        
        return Response({
            'success': True,
            'message': 'User unblocked successfully'
        })
    
    @action(detail=True, methods=['post'])
    def update_limits(self, request, pk=None):
        """Update user AI usage limits"""
        
        try:
            user = User.objects.get(pk=pk)
            plan = user.plan
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except UserPlan.DoesNotExist:
            plan = UserPlan.objects.create(user=user)
        
        # Update limits
        daily_limit = request.data.get('daily_limit')
        weekly_limit = request.data.get('weekly_limit')
        monthly_limit = request.data.get('monthly_limit')
        
        changes = {}
        if daily_limit is not None:
            plan.daily_ai_limit = int(daily_limit)
            changes['daily_limit'] = daily_limit
        if weekly_limit is not None:
            plan.weekly_ai_limit = int(weekly_limit)
            changes['weekly_limit'] = weekly_limit
        if monthly_limit is not None:
            plan.monthly_ai_limit = int(monthly_limit)
            changes['monthly_limit'] = monthly_limit
        
        plan.save()
        
        # Log action
        UserActionLog.objects.create(
            user=user,
            admin=request.user,
            action='change_limits',
            details=changes,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        # Send email notification
        try:
            send_admin_notification_email(
                user_email=user.email,
                subject='Your AI Usage Limits Have Been Updated',
                message=f'Your AI usage limits have been updated: Daily: {daily_limit}, Weekly: {weekly_limit}, Monthly: {monthly_limit}',
                action_type='limits_changed'
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
        
        return Response({
            'success': True,
            'message': 'Limits updated successfully',
            'plan': {
                'daily_ai_limit': plan.daily_ai_limit,
                'weekly_ai_limit': plan.weekly_ai_limit,
                'monthly_ai_limit': plan.monthly_ai_limit,
            }
        })
    
    @action(detail=True, methods=['post'])
    def change_plan(self, request, pk=None):
        """Change user plan type"""
        
        try:
            user = User.objects.get(pk=pk)
            plan = user.plan
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except UserPlan.DoesNotExist:
            plan = UserPlan.objects.create(user=user)
        
        new_plan = request.data.get('plan_type')
        if new_plan not in ['free', 'basic', 'premium']:
            return Response({'error': 'Invalid plan type'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_plan = plan.plan_type
        plan.plan_type = new_plan
        
        # Set default limits based on plan
        if new_plan == 'free':
            plan.daily_ai_limit = 10
            plan.weekly_ai_limit = 50
            plan.monthly_ai_limit = 200
            plan.max_notes = 100
        elif new_plan == 'basic':
            plan.daily_ai_limit = 30
            plan.weekly_ai_limit = 150
            plan.monthly_ai_limit = 600
            plan.max_notes = 500
        elif new_plan == 'premium':
            plan.daily_ai_limit = 100
            plan.weekly_ai_limit = 500
            plan.monthly_ai_limit = 2000
            plan.max_notes = -1  # Unlimited
        
        plan.save()
        
        # Log action
        UserActionLog.objects.create(
            user=user,
            admin=request.user,
            action='change_plan',
            details={'old_plan': old_plan, 'new_plan': new_plan},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        # Send email notification
        try:
            send_admin_notification_email(
                user_email=user.email,
                subject='Your Plan Has Been Updated',
                message=f'Your plan has been changed from {old_plan} to {new_plan}.',
                action_type='plan_changed'
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
        
        return Response({
            'success': True,
            'message': 'Plan updated successfully',
            'plan': {
                'type': plan.plan_type,
                'daily_ai_limit': plan.daily_ai_limit,
                'weekly_ai_limit': plan.weekly_ai_limit,
                'monthly_ai_limit': plan.monthly_ai_limit,
            }
        })
    
    @action(detail=True, methods=['post'])
    def toggle_feature_access(self, request, pk=None):
        """Toggle feature access for user"""
        
        try:
            user = User.objects.get(pk=pk)
            plan = user.plan
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except UserPlan.DoesNotExist:
            plan = UserPlan.objects.create(user=user)
        
        feature = request.data.get('feature')
        enabled = request.data.get('enabled', True)
        
        if feature == 'ai_tools':
            plan.can_use_ai_tools = enabled
        elif feature == 'export_pdf':
            plan.can_export_pdf = enabled
        elif feature == 'publish_notes':
            plan.can_publish_notes = enabled
        else:
            return Response({'error': 'Invalid feature'}, status=status.HTTP_400_BAD_REQUEST)
        
        plan.save()
        
        # Log action
        action_type = 'grant_access' if enabled else 'revoke_access'
        UserActionLog.objects.create(
            user=user,
            admin=request.user,
            action=action_type,
            details={'feature': feature, 'enabled': enabled},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        # Send email notification
        try:
            action_text = 'granted' if enabled else 'revoked'
            send_admin_notification_email(
                user_email=user.email,
                subject=f'Feature Access {action_text.capitalize()}',
                message=f'Your access to {feature} has been {action_text}.',
                action_type='access_changed'
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
        
        return Response({
            'success': True,
            'message': f'Feature access updated successfully'
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get overall user statistics"""
        
        today = timezone.now().date()
        week_ago = timezone.now() - timedelta(days=7)
        month_ago = timezone.now() - timedelta(days=30)
        
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        blocked_users = UserPlan.objects.filter(is_blocked=True).count()
        
        new_users_today = User.objects.filter(created_at__date=today).count()
        new_users_week = User.objects.filter(created_at__gte=week_ago).count()
        new_users_month = User.objects.filter(created_at__gte=month_ago).count()
        
        # Plan distribution
        plan_distribution = UserPlan.objects.values('plan_type').annotate(
            count=Count('user')
        )
        
        # Most active users
        most_active = User.objects.annotate(
            activity_score=Count('notes') + Count('ai_tool_usages')
        ).order_by('-activity_score')[:5]
        
        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'blocked_users': blocked_users,
            'new_users_today': new_users_today,
            'new_users_week': new_users_week,
            'new_users_month': new_users_month,
            'plan_distribution': list(plan_distribution),
            'most_active_users': [{
                'id': u.id,
                'email': u.email,
                'full_name': u.full_name,
                'activity_score': u.activity_score
            } for u in most_active]
        })
