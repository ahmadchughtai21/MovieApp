import os
import re
import shutil
import tempfile
from urllib.parse import quote_plus

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from madflixapp.api_views import make_tmdb_request
from madflixapp.models import Clip


def _is_native_short(info):
    if not info:
        return False
    duration = info.get('duration')
    if not duration or duration >= 60:
        return False
    width = info.get('width') or 0
    height = info.get('height') or 0
    if not height or not width or height <= width:
        return False
    return True


def _safe_filename(value, fallback='short'):
    name = re.sub(r'[^A-Za-z0-9._-]+', '-', value or '').strip('-')
    return (name or fallback)[:80]


class Command(BaseCommand):
    help = 'Fetch and publish up to 5 native YouTube Shorts for movies with no existing clips.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=5, help='Number of clips to publish (default 5).')

    def handle(self, *args, **options):
        try:
            import yt_dlp
        except ImportError as exc:
            raise CommandError('yt-dlp is not installed. Install it with: pip install yt-dlp') from exc

        limit = max(1, int(options.get('limit') or 5))
        User = get_user_model()
        bot = User.objects.filter(username='madflix').first()
        if bot is None:
            raise CommandError('The uploader account "madflix" does not exist.')

        existing_tmdb_ids = set(
            Clip.objects.exclude(tmdb_id__isnull=True).values_list('tmdb_id', flat=True)
        )
        self.stdout.write(f'Movies with existing clips: {len(existing_tmdb_ids)}')

        movies = self._collect_movies(existing_tmdb_ids, limit)
        if not movies:
            self.stdout.write(self.style.WARNING('No new trending movies available.'))
            return

        published = 0
        for movie in movies:
            if published >= limit:
                break
            try:
                info = self._find_short(yt_dlp, movie['title'])
                if info is None:
                    self.stdout.write(f'No native portrait Short found for {movie["title"]}.')
                    continue

                temp_dir = tempfile.mkdtemp(prefix='madflix_short_', dir='/tmp')
                try:
                    file_path = self._download(yt_dlp, info['webpage_url'], temp_dir)
                    if not file_path or not os.path.exists(file_path):
                        continue

                    with open(file_path, 'rb') as handle:
                        content = handle.read()

                    clip = Clip(
                        user=bot,
                        caption=info.get('title') or f'{movie["title"]} Short',
                        tmdb_id=movie['id'],
                        media_type='movie',
                        media_title=movie['title'][:200],
                        duration_seconds=int(info.get('duration') or 0),
                    )
                    filename = f'{_safe_filename(movie["title"])}-{int(timezone.now().timestamp())}.mp4'
                    clip.video.save(filename, ContentFile(content), save=False)
                    clip.save()

                    existing_tmdb_ids.add(movie['id'])
                    published += 1
                    self.stdout.write(self.style.SUCCESS(
                        f'Published clip for {movie["title"]}: {info.get("title")}'
                    ))
                finally:
                    shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception as exc:
                self.stdout.write(self.style.WARNING(
                    f'Skipped {movie["title"]}: {exc}'
                ))

        self.stdout.write(self.style.SUCCESS(f'Published {published} clip(s).'))

    def _collect_movies(self, existing_tmdb_ids, limit):
        movies = []
        seen = set(existing_tmdb_ids)
        endpoints = ('/movie/top_rated',)

        for endpoint in endpoints:
            for page in range(1, 26):
                if len(movies) >= limit:
                    return movies
                payload = make_tmdb_request(endpoint, {'page': page})
                results = payload.get('results', []) if isinstance(payload, dict) else []
                if not results:
                    break
                for item in results:
                    movie_id = item.get('id')
                    title = (item.get('title') or '').strip()
                    if not movie_id or not title or movie_id in seen:
                        continue
                    seen.add(movie_id)
                    movies.append({'id': movie_id, 'title': title})
                    if len(movies) >= limit:
                        return movies
        return movies

    def _find_short(self, yt_dlp, movie_title):
        import requests

        queries = [
            f'"{movie_title}" #shorts',
            f'"{movie_title}" short edit',
        ]
        keywords = [
            word.lower()
            for word in re.findall(r"[A-Za-z0-9']+", movie_title)
            if len(word) > 2 and word.lower() not in {'the', 'and', 'of', 'for', 'with'}
        ]
        options = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'noplaylist': True,
            'ignoreerrors': True,
            'socket_timeout': 20,
        }

        candidates = []
        seen = set()
        with yt_dlp.YoutubeDL(options) as ydl:
            for query in queries:
                video_ids = self._search_short_ids(requests, query)
                for video_id in video_ids[:10]:
                    if video_id in seen:
                        continue
                    seen.add(video_id)
                    try:
                        info = ydl.extract_info(
                            f'https://www.youtube.com/watch?v={video_id}',
                            download=False,
                        )
                    except Exception:
                        continue
                    text = f"{info.get('title') or ''} {info.get('description') or ''}".lower()
                    if _is_native_short(info) and any(word in text for word in keywords):
                        candidates.append(info)
                if candidates:
                    break

        if not candidates:
            return None
        candidates.sort(key=lambda item: item.get('view_count') or 0, reverse=True)
        return candidates[0]

    def _search_short_ids(self, requests, query):
        search_url = (
            'https://www.youtube.com/results'
            f'?search_query={quote_plus(query)}&sp=EgIYAQ%3D%3D'
        )
        try:
            response = requests.get(
                search_url,
                headers={'User-Agent': 'Mozilla/5.0'},
                timeout=20,
            )
            response.raise_for_status()
        except requests.exceptions.RequestException:
            return []
        ids = re.findall(r'/shorts/([A-Za-z0-9_-]{11})', response.text)
        return list(dict.fromkeys(ids))

    def _download(self, yt_dlp, url, temp_dir):
        output_template = os.path.join(temp_dir, 'short.%(ext)s')
        options = {
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
            'format': 'bv*+ba/b',
            'merge_output_format': 'mp4',
            'outtmpl': output_template,
            'socket_timeout': 30,
        }
        with yt_dlp.YoutubeDL(options) as ydl:
            ydl.download([url])

        for filename in os.listdir(temp_dir):
            path = os.path.join(temp_dir, filename)
            if os.path.isfile(path) and filename.endswith(('.mp4', '.mkv', '.webm')):
                return path
        return None
