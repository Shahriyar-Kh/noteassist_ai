from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task
def cleanup_expired_outputs():
    """
    Delete expired AI outputs
    Run daily at 3 AM
    """
    from .models import AIToolOutput

    now = timezone.now()
    expired = AIToolOutput.objects.filter(expires_at__lt=now)

    count = expired.count()
    expired.delete()

    logger.info(f"Cleaned up {count} expired AI outputs")
    return count


@shared_task
def process_ai_request_async(user_id, tool_type, **kwargs):
    """
    Process AI request asynchronously
    For long-running AI operations
    """
    from django.contrib.auth import get_user_model
    from .models import AIToolUsage, AIToolOutput
    from notes.ai_service import AIService

    User = get_user_model()
    user = User.objects.get(id=user_id)

    try:
        ai_service = AIService()

        if tool_type == 'generate':
            output_content = ai_service.generate_explanation(
                topic_name=kwargs.get('topic'),
                subject_area=kwargs.get('subject_area', 'programming'),
                level=kwargs.get('level', 'beginner')
            )
        elif tool_type == 'improve':
            output_content = ai_service.improve_explanation(kwargs.get('content'))
        elif tool_type == 'summarize':
            output_content = ai_service.summarize_explanation(kwargs.get('content'))
        elif tool_type == 'code':
            output_content = ai_service.generate_code(
                topic_name=kwargs.get('topic'),
                language=kwargs.get('language', 'python'),
                level=kwargs.get('level', 'beginner')
            )
        else:
            raise ValueError(f"Unknown tool type: {tool_type}")

        usage = AIToolUsage.objects.create(
            user=user,
            tool_type=tool_type,
            input_text=str(kwargs.get('topic') or kwargs.get('content'))[:500],
            output_text=output_content,
            tokens_used=int(len(output_content.split()) * 1.3),
        )

        ai_output = AIToolOutput.objects.create(
            user=user,
            usage=usage,
            title=kwargs.get('title', 'Async Generated Content'),
            content=output_content,
            language=kwargs.get('language', ''),
        )

        logger.info(f"Async task completed for user {user.id}: {tool_type}")
        return {
            'output_id': ai_output.id,
            'success': True,
        }

    except Exception as e:
        logger.error(f"Async task failed for user {user.id}: {str(e)}", exc_info=True)
        raise
