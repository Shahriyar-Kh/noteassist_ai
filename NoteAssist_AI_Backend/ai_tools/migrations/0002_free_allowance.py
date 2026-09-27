from django.db import migrations, models
import django.utils.timezone


def adopt_free_allowance(apps, schema_editor):
    Quota = apps.get_model('ai_tools', 'AIToolQuota')
    Quota.objects.filter(daily_limit=20).update(daily_limit=3)
    Quota.objects.filter(monthly_limit=100).update(monthly_limit=60)
    # Existing monthly counters have no known reset month; start everyone fresh.
    Quota.objects.update(monthly_used=0)


class Migration(migrations.Migration):
    dependencies = [('ai_tools', '0001_initial')]

    operations = [
        migrations.AddField(
            model_name='aitoolquota',
            name='last_reset_month',
            field=models.DateField(default=django.utils.timezone.localdate),
        ),
        migrations.AlterField(
            model_name='aitoolquota',
            name='daily_limit',
            field=models.IntegerField(default=3),
        ),
        migrations.AlterField(
            model_name='aitoolquota',
            name='monthly_limit',
            field=models.IntegerField(default=60),
        ),
        migrations.RunPython(adopt_free_allowance, migrations.RunPython.noop),
    ]
