from django.core import mail
from django.test import SimpleTestCase, override_settings

from notes.sendgrid_service import send_admin_notification_email


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    EMAIL_HOST_USER='support@example.com',
    SENDGRID_API_KEY='',
)
class AdminNotificationEmailTests(SimpleTestCase):
    def test_notification_uses_configured_email_backend_without_sendgrid(self):
        sent = send_admin_notification_email(
            user_email='student@example.com',
            subject='Account updated',
            message='Your account is ready <again>',
        )

        self.assertTrue(sent)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].from_email, 'support@example.com')
        self.assertEqual(mail.outbox[0].body, 'Your account is ready <again>')
        self.assertIn('ready &lt;again&gt;', mail.outbox[0].alternatives[0].content)
