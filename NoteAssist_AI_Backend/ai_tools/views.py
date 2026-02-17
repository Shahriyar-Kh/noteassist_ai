import logging
import time

from django.db.models import Max
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

# Import guest manager
from accounts.guest_manager import GuestSessionManager

# ✅ Import new permission classes
from accounts.permissions import IsAuthenticatedForMutations, IsAuthenticatedUser

from .models import AIToolUsage, AIToolOutput, AIToolQuota
from .serializers import (
    AIToolUsageSerializer, AIToolOutputSerializer,
    AIGenerateRequestSerializer, AIImproveRequestSerializer,
    AISummarizeRequestSerializer, AICodeRequestSerializer,
    SaveToNoteSerializer, AIToolQuotaSerializer
)
from notes.ai_service import AIService
from notes.models import Note, Chapter, ChapterTopic, TopicExplanation, TopicCodeSnippet

logger = logging.getLogger(__name__)


class AIToolsViewSet(viewsets.GenericViewSet):
    """
    Standalone AI Tools API
    
    ✅ Auth Rules:
    - All AI operations (generate, improve, summarize, code) require authentication
    - Guests NOT allowed to use any AI features
    - Guest limit checks enforced before authentication

    Endpoints:
    - POST /api/ai-tools/generate/
    - POST /api/ai-tools/improve/
    - POST /api/ai-tools/summarize/
    - POST /api/ai-tools/code/
    - GET  /api/ai-tools/outputs/
    - GET  /api/ai-tools/outputs/{id}/
    - POST /api/ai-tools/outputs/{id}/save/
    - GET  /api/ai-tools/outputs/{id}/download/
    - DELETE /api/ai-tools/outputs/{id}/
    - GET  /api/ai-tools/usage-history/
    - GET  /api/ai-tools/quota/
    """

    # ✅ NEW: Require authentication for all AI operations
    permission_classes = [IsAuthenticatedUser]

    def _check_guest_limit(self, request, tool_name):
        """Check if guest user can use the AI tool"""
        if GuestSessionManager.is_guest(request):
            if not GuestSessionManager.can_use_ai_tool(request, tool_name):
                return Response({
                    'error': 'Guest limit reached',
                    'message': 'Your free trial is complete. Please login or register to continue.',
                    'limit_reached': True,
                    'tool_name': tool_name,
                    'usage': GuestSessionManager.get_ai_tool_usage(request, tool_name),
                    'limit': GuestSessionManager.MAX_AI_TOOL_ATTEMPTS.get(tool_name, 0)
                }, status=status.HTTP_403_FORBIDDEN)
        return None

    def _check_quota(self, user):
        """Check quota for authenticated users"""
        if not user or not user.is_authenticated:
            return None  # Skip quota check for guests
            
        quota, _ = AIToolQuota.objects.get_or_create(user=user)

        if not quota.can_use_tool():
            raise serializers.ValidationError({
                'error': 'Daily or monthly quota exceeded',
                'quota_exceeded': True,
                'message': 'Daily or monthly quota exceeded',
                'daily_used': quota.daily_used,
                'daily_limit': quota.daily_limit,
                'monthly_used': quota.monthly_used,
                'monthly_limit': quota.monthly_limit,
            })

        return quota

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate topic explanation using AI"""
        # Check guest limit first
        guest_limit_response = self._check_guest_limit(request, 'generate_topic')
        if guest_limit_response:
            return guest_limit_response
        
        serializer = AIGenerateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check quota for authenticated users
        is_guest = GuestSessionManager.is_guest(request)
        quota = None if is_guest else self._check_quota(request.user)

        topic = serializer.validated_data['topic']
        level = serializer.validated_data['level']
        subject_area = serializer.validated_data['subject_area']
        save_immediately = serializer.validated_data['save_immediately']

        try:
            ai_service = AIService()
            start_time = time.time()

            output_content = ai_service.generate_explanation(
                topic_name=topic,
                subject_area=subject_area,
                level=level
            )

            response_time = time.time() - start_time
            
            # For guest users, return mock data without saving
            if is_guest:
                GuestSessionManager.increment_ai_tool_usage(request, 'generate_topic')
                
                mock_output = {
                    'id': 'guest-output',
                    'title': topic,
                    'content': output_content,
                    'created_at': timezone.now().isoformat(),
                    'is_guest_output': True,
                    'tool_type': 'generate',
                    'can_use_more': GuestSessionManager.can_use_ai_tool(request, 'generate_topic'),
                    'usage_remaining': GuestSessionManager.MAX_AI_TOOL_ATTEMPTS['generate_topic'] - GuestSessionManager.get_ai_tool_usage(request, 'generate_topic')
                }
                
                logger.info(f"✅ Guest AI generate used (not persisted)")
                return Response({
                    'success': True,
                    'output': mock_output,
                    'message': 'Content generated successfully',
                    'is_guest': True
                }, status=status.HTTP_201_CREATED)

            # For authenticated users, save to database
            usage = AIToolUsage.objects.create(
                user=request.user,
                tool_type='generate',
                input_text=f"Topic: {topic}, Level: {level}, Subject: {subject_area}",
                output_text=output_content,
                response_time=response_time,
                tokens_used=int(len(output_content.split()) * 1.3),
            )

            quota.increment_usage(tokens=usage.tokens_used)

            ai_output = AIToolOutput.objects.create(
                user=request.user,
                usage=usage,
                title=topic,
                content=output_content,
            )

            # Log activity
            from dashboard.models import ActivityLog
            ActivityLog.log_activity(
                user=request.user,
                activity_type='ai_generated',
                description=f"Generated explanation for: {topic}",
                tool_type='generate',
                subject=subject_area,
                tokens=usage.tokens_used
            )

            if save_immediately:
                note_title = serializer.validated_data.get('note_title', topic)
                note = self._save_to_new_note(
                    user=request.user,
                    title=note_title,
                    content=output_content,
                    usage=usage
                )
                ai_output.usage.note = note
                ai_output.usage.save(update_fields=['note'])

            output_serializer = AIToolOutputSerializer(ai_output, context={'request': request})

            return Response({
                'success': True,
                'output': output_serializer.data,
                'message': 'Content generated successfully',
                'quota_remaining': {
                    'daily': quota.daily_limit - quota.daily_used,
                    'monthly': quota.monthly_limit - quota.monthly_used,
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"AI generation error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def improve(self, request):
        """Improve existing content using AI"""
        # Check guest limit first
        guest_limit_response = self._check_guest_limit(request, 'improve_topic')
        if guest_limit_response:
            return guest_limit_response
        
        serializer = AIImproveRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_guest = GuestSessionManager.is_guest(request)
        quota = None if is_guest else self._check_quota(request.user)
        content = serializer.validated_data['content']

        try:
            ai_service = AIService()
            start_time = time.time()

            improved_content = ai_service.improve_explanation(content)
            response_time = time.time() - start_time
            
            # For guest users, return mock data without saving
            if is_guest:
                GuestSessionManager.increment_ai_tool_usage(request, 'improve_topic')
                
                mock_output = {
                    'id': 'guest-output',
                    'title': 'Improved Content',
                    'content': improved_content,
                    'created_at': timezone.now().isoformat(),
                    'is_guest_output': True,
                    'tool_type': 'improve',
                    'can_use_more': GuestSessionManager.can_use_ai_tool(request, 'improve_topic'),
                    'usage_remaining': GuestSessionManager.MAX_AI_TOOL_ATTEMPTS['improve_topic'] - GuestSessionManager.get_ai_tool_usage(request, 'improve_topic')
                }
                
                return Response({
                    'success': True,
                    'output': mock_output,
                    'message': 'Content improved successfully',
                    'is_guest': True
                }, status=status.HTTP_201_CREATED)

            usage = AIToolUsage.objects.create(
                user=request.user,
                tool_type='improve',
                input_text=content[:1000],
                output_text=improved_content,
                response_time=response_time,
                tokens_used=int(len(improved_content.split()) * 1.3),
            )

            quota.increment_usage(tokens=usage.tokens_used)

            ai_output = AIToolOutput.objects.create(
                user=request.user,
                usage=usage,
                title='Improved Content',
                content=improved_content,
            )

            output_serializer = AIToolOutputSerializer(ai_output, context={'request': request})

            return Response({
                'success': True,
                'output': output_serializer.data,
                'message': 'Content improved successfully'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"AI improvement error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def summarize(self, request):
        """Summarize content using AI"""
        # Check guest limit first
        guest_limit_response = self._check_guest_limit(request, 'summarize_topic')
        if guest_limit_response:
            return guest_limit_response
        
        serializer = AISummarizeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_guest = GuestSessionManager.is_guest(request)
        quota = None if is_guest else self._check_quota(request.user)
        content = serializer.validated_data['content']

        try:
            ai_service = AIService()
            start_time = time.time()

            summary = ai_service.summarize_explanation(content)
            response_time = time.time() - start_time
            
            # For guest users, return mock data without saving
            if is_guest:
                GuestSessionManager.increment_ai_tool_usage(request, 'summarize_topic')
                
                mock_output = {
                    'id': 'guest-output',
                    'title': 'Content Summary',
                    'content': summary,
                    'created_at': timezone.now().isoformat(),
                    'is_guest_output': True,
                    'tool_type': 'summarize',
                    'can_use_more': GuestSessionManager.can_use_ai_tool(request, 'summarize_topic'),
                    'usage_remaining': GuestSessionManager.MAX_AI_TOOL_ATTEMPTS['summarize_topic'] - GuestSessionManager.get_ai_tool_usage(request, 'summarize_topic')
                }
                
                return Response({
                    'success': True,
                    'output': mock_output,
                    'message': 'Content summarized successfully',
                    'is_guest': True
                })

            usage = AIToolUsage.objects.create(
                user=request.user,
                tool_type='summarize',
                input_text=content[:1000],
                output_text=summary,
                response_time=response_time,
                tokens_used=int(len(summary.split()) * 1.3),
            )

            quota.increment_usage(tokens=usage.tokens_used)

            ai_output = AIToolOutput.objects.create(
                user=request.user,
                usage=usage,
                title='Content Summary',
                content=summary,
            )

            output_serializer = AIToolOutputSerializer(ai_output, context={'request': request})

            return Response({
                'success': True,
                'output': output_serializer.data,
                'message': 'Content summarized successfully'
            })

        except Exception as e:
            logger.error(f"AI summarization error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def code(self, request):
        """Generate code using AI"""
        # Check guest limit first
        guest_limit_response = self._check_guest_limit(request, 'generate_code')
        if guest_limit_response:
            return guest_limit_response
        
        serializer = AICodeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_guest = GuestSessionManager.is_guest(request)
        quota = None if is_guest else self._check_quota(request.user)
        topic = serializer.validated_data['topic']
        language = serializer.validated_data['language']
        level = serializer.validated_data['level']

        try:
            ai_service = AIService()
            start_time = time.time()

            code = ai_service.generate_code(
                topic_name=topic,
                language=language,
                level=level
            )

            response_time = time.time() - start_time
            
            # For guest users, return mock data without saving
            if is_guest:
                GuestSessionManager.increment_ai_tool_usage(request, 'generate_code')
                
                mock_output = {
                    'id': 'guest-output',
                    'title': f"{topic} - {language}",
                    'content': code,
                    'language': language,
                    'created_at': timezone.now().isoformat(),
                    'is_guest_output': True,
                    'tool_type': 'code',
                    'can_use_more': GuestSessionManager.can_use_ai_tool(request, 'generate_code'),
                    'usage_remaining': GuestSessionManager.MAX_AI_TOOL_ATTEMPTS['generate_code'] - GuestSessionManager.get_ai_tool_usage(request, 'generate_code')
                }
                
                return Response({
                    'success': True,
                    'output': mock_output,
                    'message': 'Code generated successfully',
                    'is_guest': True
                })

            usage = AIToolUsage.objects.create(
                user=request.user,
                tool_type='code',
                input_text=f"{topic} ({language}, {level})",
                output_text=code,
                response_time=response_time,
                tokens_used=int(len(code.split()) * 1.3),
            )

            quota.increment_usage(tokens=usage.tokens_used)

            ai_output = AIToolOutput.objects.create(
                user=request.user,
                usage=usage,
                title=f"{topic} - {language}",
                content=code,
                language=language,
            )

            output_serializer = AIToolOutputSerializer(ai_output, context={'request': request})

            return Response({
                'success': True,
                'output': output_serializer.data,
                'message': 'Code generated successfully'
            })

        except Exception as e:
            logger.error(f"AI code generation error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def outputs(self, request):
        """List user's AI outputs"""
        # Require authentication for outputs
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required',
                'message': 'Please login or register to view your outputs.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        outputs = AIToolOutput.objects.filter(
            user=request.user
        ).select_related('usage').order_by('-created_at')

        tool_type = request.query_params.get('tool_type')
        if tool_type:
            outputs = outputs.filter(usage__tool_type=tool_type)

        serializer = AIToolOutputSerializer(outputs, many=True, context={'request': request})
        return Response(serializer.data)

    def retrieve_output(self, request, pk=None):
        """Retrieve a single AI output"""
        try:
            ai_output = AIToolOutput.objects.select_related('usage').get(
                pk=pk,
                user=request.user
            )
        except AIToolOutput.DoesNotExist:
            return Response({'error': 'Output not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AIToolOutputSerializer(ai_output, context={'request': request})
        return Response(serializer.data)

    def delete_output(self, request, pk=None):
        """Delete an AI output"""
        try:
            ai_output = AIToolOutput.objects.get(pk=pk, user=request.user)
        except AIToolOutput.DoesNotExist:
            return Response({'error': 'Output not found'}, status=status.HTTP_404_NOT_FOUND)

        ai_output.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='save')
    def save_to_note(self, request, pk=None):
        """Save AI output to a note"""
        try:
            ai_output = AIToolOutput.objects.select_related('usage').get(
                pk=pk,
                user=request.user
            )
        except AIToolOutput.DoesNotExist:
            return Response({
                'error': 'Output not found'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = SaveToNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        note_id = serializer.validated_data.get('note_id')
        note_title = serializer.validated_data.get('note_title', ai_output.title)
        chapter_title = serializer.validated_data['chapter_title']

        try:
            if note_id:
                note = Note.objects.get(id=note_id, user=request.user)
            else:
                note = Note.objects.create(
                    user=request.user,
                    title=note_title,
                    status='draft'
                )

            max_order = note.chapters.aggregate(Max('order'))['order__max'] or -1
            chapter = Chapter.objects.create(
                note=note,
                title=chapter_title,
                order=max_order + 1
            )

            topic = ChapterTopic.objects.create(
                chapter=chapter,
                name=ai_output.title,
                order=0
            )

            if ai_output.language:
                code_snippet = TopicCodeSnippet.objects.create(
                    language=ai_output.language,
                    code=ai_output.content
                )
                topic.code_snippet = code_snippet
            else:
                explanation = TopicExplanation.objects.create(
                    content=ai_output.content
                )
                topic.explanation = explanation

            topic.save()

            ai_output.usage.note = note
            ai_output.usage.save(update_fields=['note'])

            return Response({
                'success': True,
                'note_id': note.id,
                'chapter_id': chapter.id,
                'topic_id': topic.id,
                'message': 'Content saved to note successfully'
            })

        except Note.DoesNotExist:
            return Response({
                'error': 'Note not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error saving to note: {str(e)}", exc_info=True)
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='download')
    def download_output(self, request, pk=None):
        """Download AI output as a file"""
        try:
            ai_output = AIToolOutput.objects.get(pk=pk, user=request.user)
        except AIToolOutput.DoesNotExist:
            return Response({
                'error': 'Output not found'
            }, status=status.HTTP_404_NOT_FOUND)

        ai_output.download_count += 1
        ai_output.last_downloaded_at = timezone.now()
        ai_output.save(update_fields=['download_count', 'last_downloaded_at'])

        file_format = request.query_params.get('format', 'txt').lower()

        if ai_output.language:
            content_type = 'text/plain'
            extension = {
                'python': 'py',
                'javascript': 'js',
                'java': 'java',
                'cpp': 'cpp',
                'go': 'go',
                'rust': 'rs',
            }.get(ai_output.language, 'txt')
        elif file_format == 'md':
            content_type = 'text/markdown'
            extension = 'md'
        else:
            content_type = 'text/plain'
            extension = 'txt'

        filename = f"{ai_output.title.replace(' ', '_')}.{extension}"
        response = HttpResponse(ai_output.content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        return response

    @action(detail=False, methods=['get'], url_path='usage-history')
    def usage_history(self, request):
        """Get user's AI tool usage history"""
        usages = AIToolUsage.objects.filter(
            user=request.user
        ).order_by('-created_at')

        tool_type = request.query_params.get('tool_type')
        if tool_type:
            usages = usages.filter(tool_type=tool_type)

        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')

        if from_date:
            usages = usages.filter(created_at__gte=from_date)
        if to_date:
            usages = usages.filter(created_at__lte=to_date)

        serializer = AIToolUsageSerializer(usages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def quota(self, request):
        """Get user's quota status"""
        quota, _ = AIToolQuota.objects.get_or_create(user=request.user)
        serializer = AIToolQuotaSerializer(quota)

        return Response({
            'quota': serializer.data,
            'message': 'Quota retrieved successfully'
        })

    def _save_to_new_note(self, user, title, content, usage):
        """Helper method to save content to a new note"""
        note = Note.objects.create(
            user=user,
            title=title,
            status='draft'
        )

        chapter = Chapter.objects.create(
            note=note,
            title='AI Generated',
            order=0
        )

        topic = ChapterTopic.objects.create(
            chapter=chapter,
            name=title,
            order=0
        )

        explanation = TopicExplanation.objects.create(
            content=content
        )
        topic.explanation = explanation
        topic.save()

        return note

    @action(detail=True, methods=['post'], url_path='upload-to-drive')
    def upload_to_drive(self, request, pk=None):
        """
        Upload AI-generated output to Google Drive.
        Requires authenticated user with valid Google OAuth token.
        """
        try:
            ai_output = self.get_object_or_404(AIToolOutput, id=pk, user=request.user)
        except Exception:
            return Response(
                {'error': 'Output not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            from notes.google_drive_service import GoogleDriveService

            drive_service = GoogleDriveService(request.user)

            uploaded_file = request.FILES.get('file')
            if uploaded_file:
                filename = request.data.get('filename') or uploaded_file.name or f"ai_output_{ai_output.id}.pdf"
                if not filename.lower().endswith('.pdf'):
                    filename = f"{filename}.pdf"

                result = drive_service.upload_or_update_pdf(
                    uploaded_file,
                    filename,
                    existing_file_id=ai_output.drive_file_id
                )

                if not result.get('success'):
                    return Response(
                        {'error': result.get('error', 'Upload failed')},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

                ai_output.drive_file_id = result.get('id')
                ai_output.drive_url = result.get('webViewLink')
                ai_output.save(update_fields=['drive_file_id', 'drive_url'])

                logger.info(f"AI output {pk} uploaded PDF to Google Drive: {result.get('id')}")

                return Response({
                    'success': True,
                    'drive_file_id': result.get('id'),
                    'message': 'Successfully uploaded to Google Drive',
                    'web_view_link': result.get('webViewLink', ''),
                    'updated': result.get('updated', False)
                })

            safe_title = (ai_output.title or f"ai_output_{ai_output.id}").strip()
            safe_title = "_".join(safe_title.split())
            filename = f"{safe_title}.md"

            header_lines = [
                f"# {ai_output.title}",
                "",
                f"Tool: {ai_output.usage.tool_type}",
                f"Generated: {ai_output.created_at.strftime('%Y-%m-%d %H:%M')} UTC",
                ""
            ]

            if ai_output.language:
                content_body = f"```{ai_output.language}\n{ai_output.content}\n```"
            else:
                content_body = ai_output.content

            formatted_content = "\n".join(header_lines) + content_body

            result = drive_service.upload_or_update_text(
                formatted_content,
                filename,
                existing_file_id=ai_output.drive_file_id,
                mime_type='text/markdown'
            )

            if not result.get('success'):
                return Response(
                    {'error': result.get('error', 'Upload failed')},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            ai_output.drive_file_id = result.get('id')
            ai_output.drive_url = result.get('webViewLink')
            ai_output.save(update_fields=['drive_file_id', 'drive_url'])

            logger.info(f"AI output {pk} uploaded to Google Drive: {result.get('id')}")

            return Response({
                'success': True,
                'drive_file_id': result.get('id'),
                'message': 'Successfully uploaded to Google Drive',
                'web_view_link': result.get('webViewLink', ''),
                'updated': result.get('updated', False)
            })

        except Exception as e:
            error_msg = str(e)
            if 'authentication required' in error_msg.lower():
                return Response(
                    {'error': 'Google Drive authentication required', 'needs_auth': True},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            logger.error(f"Failed to upload AI output to Google Drive: {error_msg}")
            return Response(
                {'error': f'Failed to upload to Drive: {error_msg}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_object_or_404(self, model, **kwargs):
        """Helper method to get object or raise 404"""
        try:
            return model.objects.get(**kwargs)
        except model.DoesNotExist:
            raise


class AdminAnalyticsViewSet(viewsets.ViewSet):
    """
    Admin-only analytics API for platform insights.
    Requires IsAdminUser permission.
    """
    permission_classes = [IsAuthenticated]

    def has_admin_permission(self, request):
        """Check if user is admin"""
        return request.user.is_superuser or request.user.role == 'admin'

    def check_admin_permission(self, request):
        """Raise permission error if not admin"""
        if not self.has_admin_permission(request):
            raise PermissionError("Admin access required")

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get overall platform analytics"""
        self.check_admin_permission(request)

        from django.contrib.auth import get_user_model
        from django.db.models import Count, Q
        from django.utils import timezone
        from datetime import timedelta

        User = get_user_model()

        # User metrics
        total_users = User.objects.count()
        active_users_7d = User.objects.filter(
            last_login__gte=timezone.now() - timedelta(days=7)
        ).count()

        # Notes metrics
        total_notes = Note.objects.count()
        notes_7d = Note.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()

        # AI usage metrics
        total_ai_usage = AIToolUsage.objects.count()
        ai_usage_7d = AIToolUsage.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()

        # Tool breakdown
        usage_by_tool = AIToolUsage.objects.values('tool_type').annotate(
            count=Count('id')
        )

        return Response({
            'users': {
                'total': total_users,
                'active_7d': active_users_7d,
                'active_ratio': f"{(active_users_7d/total_users*100):.1f}%" if total_users > 0 else "0%",
            },
            'notes': {
                'total': total_notes,
                'created_7d': notes_7d,
            },
            'ai_usage': {
                'total': total_ai_usage,
                'usage_7d': ai_usage_7d,
                'by_tool': dict(usage_by_tool),
            },
        })

    @action(detail=False, methods=['get'])
    def user_metrics(self, request):
        """Get detailed user metrics"""
        self.check_admin_permission(request)

        from django.contrib.auth import get_user_model
        from django.db.models import Count
        from django.utils import timezone
        from datetime import timedelta

        User = get_user_model()

        users = User.objects.annotate(
            notes_count=Count('notes'),
            ai_usage_count=Count('ai_usage_generated_by')
        ).values(
            'id', 'email', 'first_name', 'created_at', 'last_login',
            'notes_count', 'ai_usage_count'
        ).order_by('-created_at')

        return Response({
            'count': users.count(),
            'users': list(users[:100])  # Paginate top 100
        })

    @action(detail=False, methods=['get'])
    def ai_metrics(self, request):
        """Get detailed AI tool usage metrics"""
        self.check_admin_permission(request)

        from django.db.models import Count, Avg
        from datetime import timedelta
        from django.utils import timezone

        # Overall metrics
        total_usage = AIToolUsage.objects.count()
        avg_response_time = AIToolUsage.objects.aggregate(
            avg=Avg('response_time')
        )['avg'] or 0

        # By tool type
        by_tool = AIToolUsage.objects.values('tool_type').annotate(
            count=Count('id'),
            avg_tokens=Avg('tokens_used'),
            avg_time=Avg('response_time')
        )

        # Last 7 days trend
        daily_trend = []
        for i in range(7):
            day = timezone.now().date() - timedelta(days=6-i)
            count = AIToolUsage.objects.filter(
                created_at__date=day
            ).count()
            daily_trend.append({
                'date': day.isoformat(),
                'count': count,
            })

        # Top users
        top_users = AIToolUsage.objects.values('user__email').annotate(
            usage_count=Count('id')
        ).order_by('-usage_count')[:10]

        return Response({
            'total_usage': total_usage,
            'avg_response_time_ms': round(avg_response_time * 1000, 2),
            'by_tool': list(by_tool),
            'daily_trend': daily_trend,
            'top_users': list(top_users),
        })