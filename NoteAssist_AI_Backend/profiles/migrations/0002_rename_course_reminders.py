from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('profiles', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='notificationsettings',
            old_name='course_reminders',
            new_name='study_reminders',
        ),
    ]
