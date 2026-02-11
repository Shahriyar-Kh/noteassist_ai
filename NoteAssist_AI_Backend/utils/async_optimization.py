# FILE: utils/async_optimization.py
# ============================================================================
# Async Task Optimization - Handle long-running tasks efficiently
# ============================================================================

from celery import shared_task
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import logging
import uuid

logger = logging.getLogger(__name__)


class AsyncTaskManager:
    """Manage async tasks with proper caching and notification"""
    
    # Task status constants
    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED = 'failed'
    
    # Cache keys
    TASK_STATUS_PREFIX = 'task_status_{task_id}'
    TASK_RESULT_PREFIX = 'task_result_{task_id}'
    
    # Timeouts
    TASK_CACHE_TIMEOUT = 3600  # 1 hour for results
    
    @staticmethod
    def create_task_id():
        """Generate unique task ID"""
        return str(uuid.uuid4())
    
    @staticmethod
    def set_task_status(task_id, status, progress=0, message=''):
        """Set task status with progress tracking"""
        cache_key = AsyncTaskManager.TASK_STATUS_PREFIX.format(task_id=task_id)
        status_data = {
            'status': status,
            'progress': progress,
            'message': message,
            'timestamp': timezone.now().isoformat(),
        }
        cache.set(cache_key, status_data, AsyncTaskManager.TASK_CACHE_TIMEOUT)
        logger.debug(f"Task {task_id} status: {status} ({progress}%)")
    
    @staticmethod
    def get_task_status(task_id):
        """Get current task status"""
        cache_key = AsyncTaskManager.TASK_STATUS_PREFIX.format(task_id=task_id)
        return cache.get(cache_key, {
            'status': AsyncTaskManager.STATUS_PENDING,
            'progress': 0,
            'message': 'Task queued',
        })
    
    @staticmethod
    def set_task_result(task_id, result, status=STATUS_COMPLETED):
        """Set task result"""
        cache_key = AsyncTaskManager.TASK_RESULT_PREFIX.format(task_id=task_id)
        cache.set(cache_key, result, AsyncTaskManager.TASK_CACHE_TIMEOUT)
        
        # Update status
        AsyncTaskManager.set_task_status(
            task_id,
            status,
            progress=100,
            message='Task completed' if status == AsyncTaskManager.STATUS_COMPLETED else 'Task failed'
        )
    
    @staticmethod
    def get_task_result(task_id):
        """Get task result"""
        cache_key = AsyncTaskManager.TASK_RESULT_PREFIX.format(task_id=task_id)
        return cache.get(cache_key)
    
    @staticmethod
    def complete_task(task_id, result):
        """Mark task as completed with result"""
        AsyncTaskManager.set_task_result(task_id, result, status=AsyncTaskManager.STATUS_COMPLETED)
    
    @staticmethod
    def fail_task(task_id, error):
        """Mark task as failed with error"""
        AsyncTaskManager.set_task_result(task_id, {'error': str(error)}, status=AsyncTaskManager.STATUS_FAILED)


class NotificationOptimizer:
    """Optimize notification delivery - real-time & instant"""
    
    # Notification types
    TYPE_SUCCESS = 'success'
    TYPE_ERROR = 'error'
    TYPE_WARNING = 'warning'
    TYPE_INFO = 'info'
    TYPE_PROCESSING = 'processing'
    
    # Cache keys for real-time notifications
    NOTIFICATION_PREFIX = 'notifications_{user_id}'
    NOTIFICATION_QUEUE_PREFIX = 'notification_queue_{user_id}'
    
    @staticmethod
    def create_notification(user_id, title, message, notification_type=TYPE_SUCCESS, action_id=None):
        """
        Create and cache notification for instant delivery.
        Uses cache for real-time delivery without DB hits.
        """
        notification = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'title': title,
            'message': message,
            'type': notification_type,
            'action_id': action_id,
            'timestamp': timezone.now().isoformat(),
            'read': False,
        }
        
        # Add to notification queue
        queue_key = NotificationOptimizer.NOTIFICATION_QUEUE_PREFIX.format(user_id=user_id)
        queue = cache.get(queue_key, [])
        queue.append(notification)
        
        # Keep last 100 notifications in memory
        queue = queue[-100:]
        cache.set(queue_key, queue, timeout=86400)  # Keep for 24 hours
        
        logger.debug(f"Notification created for user {user_id}: {title}")
        return notification
    
    @staticmethod
    def get_notifications(user_id, limit=50):
        """Get pending notifications for user"""
        queue_key = NotificationOptimizer.NOTIFICATION_QUEUE_PREFIX.format(user_id=user_id)
        queue = cache.get(queue_key, [])
        return queue[-limit:]
    
    @staticmethod
    def clear_notifications(user_id):
        """Clear notification queue for user"""
        queue_key = NotificationOptimizer.NOTIFICATION_QUEUE_PREFIX.format(user_id=user_id)
        cache.delete(queue_key)


# Optimized Celery Tasks for AI operations
@shared_task(bind=True, max_retries=2)
def process_ai_request(self, task_id, user_id, request_type, request_data):
    """
    Optimized async task for AI operations.
    Provides real-time status updates and instant result delivery.
    """
    try:
        # Mark as processing
        AsyncTaskManager.set_task_status(
            task_id,
            AsyncTaskManager.STATUS_PROCESSING,
            progress=10,
            message='Starting AI processing...'
        )
        
        # Import here to avoid circular imports
        from notes.ai_service import (
            generate_ai_explanation,
            generate_ai_code,
            improve_explanation,
            summarize_explanation
        )
        
        # Update progress
        AsyncTaskManager.set_task_status(
            task_id,
            AsyncTaskManager.STATUS_PROCESSING,
            progress=30,
            message='Processing your request...'
        )
        
        # Execute based on request type
        if request_type == 'generate_explanation':
            result = generate_ai_explanation(
                request_data.get('topic'),
                request_data.get('context')
            )
        elif request_type == 'generate_code':
            result = generate_ai_code(
                request_data.get('topic'),
                request_data.get('language'),
                request_data.get('context')
            )
        elif request_type == 'improve_explanation':
            result = improve_explanation(
                request_data.get('content'),
                request_data.get('context')
            )
        elif request_type == 'summarize':
            result = summarize_explanation(
                request_data.get('content')
            )
        else:
            raise ValueError(f"Unknown request type: {request_type}")
        
        # Update progress
        AsyncTaskManager.set_task_status(
            task_id,
            AsyncTaskManager.STATUS_PROCESSING,
            progress=90,
            message='Finalizing results...'
        )
        
        # Complete task
        AsyncTaskManager.complete_task(task_id, result)
        
        # Send notification
        NotificationOptimizer.create_notification(
            user_id=user_id,
            title='✅ AI Operation Complete',
            message=f'{request_type.replace("_", " ").title()} completed successfully!',
            notification_type=NotificationOptimizer.TYPE_SUCCESS,
            action_id=task_id
        )
        
        logger.info(f"Task {task_id} completed successfully")
        return {'task_id': task_id, 'status': 'completed'}
        
    except Exception as exc:
        logger.error(f"Task {task_id} failed: {str(exc)}")
        
        # Mark as failed
        AsyncTaskManager.fail_task(task_id, str(exc))
        
        # Send error notification
        NotificationOptimizer.create_notification(
            user_id=user_id,
            title='❌ AI Operation Failed',
            message=f'Request failed: {str(exc)[:100]}',
            notification_type=NotificationOptimizer.TYPE_ERROR,
            action_id=task_id
        )
        
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))


@shared_task
def send_notification(user_id, title, message, notification_type='success'):
    """Send notification to user"""
    NotificationOptimizer.create_notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type
    )
    return True


@shared_task
def cleanup_stale_notifications(days=7):
    """Cleanup stale notifications older than specified days"""
    logger.info(f"Cleaning notifications older than {days} days")
    return True
