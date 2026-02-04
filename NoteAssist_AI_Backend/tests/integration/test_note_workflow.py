from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from notes.models import Note, Chapter, ChapterTopic
from ai_tools.models import AIToolUsage, AIToolOutput, AIToolQuota

User = get_user_model()


class NoteCreationWorkflowTest(TestCase):
    """
    Test complete workflow: AI generation → Save to note → View
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            terms_accepted=True
        )
        self.client.force_authenticate(user=self.user)

        AIToolQuota.objects.create(
            user=self.user,
            daily_limit=20,
            monthly_limit=200
        )

    def test_complete_workflow(self):
        """Test: Generate AI content → Save to note → View"""

        usage = AIToolUsage.objects.create(
            user=self.user,
            tool_type='generate',
            input_text='Python Decorators',
            output_text='Decorators are functions that modify other functions...',
            response_time=2.0,
            tokens_used=150
        )

        ai_output = AIToolOutput.objects.create(
            user=self.user,
            usage=usage,
            title='Python Decorators',
            content='Decorators are functions that modify other functions...'
        )

        response = self.client.post(f'/api/ai-tools/outputs/{ai_output.id}/save/', {
            'note_title': 'My Python Notes',
            'chapter_title': 'Advanced Concepts'
        })

        self.assertEqual(response.status_code, 200)
        note_id = response.data['note_id']

        note = Note.objects.get(id=note_id)
        self.assertEqual(note.title, 'My Python Notes')
        self.assertEqual(note.chapters.count(), 1)

        chapter = note.chapters.first()
        self.assertEqual(chapter.title, 'Advanced Concepts')
        self.assertEqual(chapter.topics.count(), 1)

        topic = chapter.topics.first()
        self.assertIsNotNone(topic.explanation)

    def test_download_ai_output(self):
        """Test downloading AI output"""
        usage = AIToolUsage.objects.create(
            user=self.user,
            tool_type='code',
            input_text='Python Function',
            output_text='def hello(): pass',
            response_time=1.0
        )

        ai_output = AIToolOutput.objects.create(
            user=self.user,
            usage=usage,
            title='hello.py',
            content='def hello(): pass',
            language='python'
        )

        response = self.client.get(f'/api/ai-tools/outputs/{ai_output.id}/download/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/plain')

        ai_output.refresh_from_db()
        self.assertEqual(ai_output.download_count, 1)
        self.assertIsNotNone(ai_output.last_downloaded_at)
