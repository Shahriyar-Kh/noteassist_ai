from django.core.management.base import BaseCommand
from django.utils.text import slugify

from notes.models import Note


class Command(BaseCommand):
    help = 'Migrate existing notes to ensure slugs are populated and unique'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting note migration...')

        notes = Note.objects.all().only('id', 'title', 'slug')
        total = notes.count()
        migrated = 0
        errors = 0

        for note in notes:
            try:
                base_slug = slugify(note.title)[:500] or f"note-{note.id}"
                slug = note.slug or base_slug
                counter = 1

                while Note.objects.filter(slug=slug).exclude(pk=note.pk).exists():
                    slug = f"{base_slug}-{counter}"
                    counter += 1

                if note.slug != slug:
                    note.slug = slug
                    note.save(update_fields=['slug'])

                migrated += 1

                if migrated % 100 == 0:
                    self.stdout.write(f'Migrated {migrated}/{total} notes...')

            except Exception as exc:
                errors += 1
                self.stdout.write(self.style.ERROR(
                    f'Error migrating note {note.id}: {exc}'
                ))

        self.stdout.write(self.style.SUCCESS(
            f'Migration complete! {migrated} migrated, {errors} errors'
        ))
