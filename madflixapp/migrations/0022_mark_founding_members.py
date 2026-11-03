from django.db import migrations


def mark_founding_members(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    UserProfile = apps.get_model('madflixapp', 'UserProfile')

    first_ids = list(
        User.objects.order_by('date_joined', 'id').values_list('id', flat=True)[:100]
    )
    first_set = set(first_ids)

    for user_id in first_ids:
        UserProfile.objects.get_or_create(user_id=user_id)

    UserProfile.objects.filter(user_id__in=first_set).update(is_founding_member=True)
    UserProfile.objects.exclude(user_id__in=first_set).update(is_founding_member=False)


class Migration(migrations.Migration):

    dependencies = [
        ('madflixapp', '0021_userprofile_is_founding_member'),
    ]

    operations = [
        migrations.RunPython(mark_founding_members, migrations.RunPython.noop),
    ]
