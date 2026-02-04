from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.db import connection
from rest_framework.test import APIClient

from notes.models import Note, Chapter, ChapterTopic
from django.contrib.auth import get_user_model
from ai_tools.models import AIToolQuota

User = get_user_model()


class QueryOptimizationTest(TestCase):
    """Test that views use optimal number of queries"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            terms_accepted=True
        )
        self.client.force_authenticate(user=self.user)

        AIToolQuota.objects.create(user=self.user)
        self._create_test_data(num_notes=10, topics_per_note=5)

    def _create_test_data(self, num_notes, topics_per_note):
        """Create test notes with chapters and topics"""
        for i in range(num_notes):
            note = Note.objects.create(
                user=self.user,
                title=f'Note {i}'
            )

            chapter = Chapter.objects.create(
                note=note,
                title=f'Chapter {i}',
                order=0
            )

            for j in range(topics_per_note):
                ChapterTopic.objects.create(
                    chapter=chapter,
                    name=f'Topic {j}',
                    order=j
                )

    def test_note_list_query_count(self):
        """Test note list uses minimal queries"""
        with CaptureQueriesContext(connection) as context:
            response = self.client.get('/api/notes/')

            self.assertLessEqual(
                len(context.captured_queries),
                5,
                f"Too many queries: {len(context.captured_queries)}"
            )

            self.assertEqual(response.status_code, 200)

    def test_note_detail_query_count(self):
        """Test note detail uses prefetch efficiently"""
        note = Note.objects.first()

        with CaptureQueriesContext(connection) as context:
            response = self.client.get(f'/api/notes/{note.id}/')

            self.assertLessEqual(
                len(context.captured_queries),
                3,
                f"Too many queries: {len(context.captured_queries)}"
            )

            self.assertEqual(response.status_code, 200)

    def test_ai_outputs_list_query_count(self):
        """Test AI outputs list efficiency"""
        from ai_tools.models import AIToolUsage, AIToolOutput

        for i in range(5):
            usage = AIToolUsage.objects.create(
                user=self.user,
                tool_type='generate',
                input_text=f'Test {i}',
                output_text=f'Output {i}',
                response_time=1.0
            )
            AIToolOutput.objects.create(
                user=self.user,
                usage=usage,
                title=f'Output {i}',
                content=f'Content {i}'
            )

        with CaptureQueriesContext(connection) as context:
            response = self.client.get('/api/ai-tools/outputs/')

            self.assertLessEqual(
                len(context.captured_queries),
                5,
                f"Too many queries: {len(context.captured_queries)}"
            )

            self.assertEqual(response.status_code, 200)
