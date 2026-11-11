import os
import subprocess

from django.conf import settings
from django.core.files.storage import default_storage


def clip_thumbnail_url(clip):
    """Return a cached JPEG thumbnail URL for a clip, generating it once with ffmpeg."""
    if clip is None or not clip.video:
        return ''
    try:
        source_path = clip.video.path
    except (ValueError, NotImplementedError):
        return ''

    relative_path = f'clips/thumbs/{clip.id}.jpg'
    target_path = os.path.join(settings.MEDIA_ROOT, relative_path)
    os.makedirs(os.path.dirname(target_path), exist_ok=True)

    if not os.path.exists(target_path):
        try:
            subprocess.run(
                [
                    'ffmpeg', '-y', '-loglevel', 'error',
                    '-ss', '0.1', '-i', source_path,
                    '-frames:v', '1', '-vf', 'scale=360:-2',
                    target_path,
                ],
                check=True,
                timeout=30,
            )
        except (OSError, subprocess.SubprocessError):
            return ''

    return f'{settings.MEDIA_URL}{relative_path}'
