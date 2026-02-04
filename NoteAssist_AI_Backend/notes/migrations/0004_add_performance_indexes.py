from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notes', '0003_remove_course_dependencies'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='chapter',
            index=models.Index(fields=['note', 'order'], name='chapter_note_order_idx'),
        ),
        migrations.AddIndex(
            model_name='chaptertopic',
            index=models.Index(fields=['chapter', 'order'], name='topic_chapter_order_idx'),
        ),
        migrations.AddIndex(
            model_name='chaptertopic',
            index=models.Index(fields=['chapter', '-created_at'], name='topic_chapter_created_idx'),
        ),
        migrations.AddIndex(
            model_name='aihistory',
            index=models.Index(fields=['user', 'feature_type', '-created_at'], name='ai_user_type_created_idx'),
        ),
    ]
