import csv
import io
import zipfile
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from decimal import Decimal, InvalidOperation

from .models import MovieLog, UserProfile, Watchlist


MAX_ENTRIES = 3000


def _read_csv(archive, name):
    if name not in archive.namelist():
        return []
    with archive.open(name) as handle:
        wrapper = io.TextIOWrapper(handle, encoding='utf-8-sig', newline='')
        return list(csv.DictReader(wrapper))[:MAX_ENTRIES]


def _parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value.strip()[:10])
    except ValueError:
        return None


def _rating(value):
    if value is None or str(value).strip() == '':
        return None
    try:
        number = Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        return None
    if number < Decimal('0.5') or number > Decimal('5'):
        return None
    return number


def _resolve_tmdb(name, year):
    from .api_views import make_tmdb_request

    if not name:
        return None
    name = name.strip()
    year = str(year).strip() if year else ''

    for endpoint, media_type in (('/search/movie', 'movie'), ('/search/tv', 'tv')):
        params = {'query': name, 'include_adult': 'false'}
        if year:
            if media_type == 'movie':
                params['year'] = year
            else:
                params['first_air_date_year'] = year
        data = make_tmdb_request(endpoint, params)
        results = data.get('results', []) if isinstance(data, dict) else []
        if not results:
            continue

        exact = None
        close = None
        for item in results:
            item_year = (item.get('release_date') or item.get('first_air_date') or '')[:4]
            if (item.get('title') or item.get('name') or '').lower() == name.lower() and (
                not year or item_year == year
            ):
                exact = item
                break
            if not close and (not year or abs(int(item_year or 0) - int(year or 0)) <= 1):
                close = item
        chosen = exact or close or results[0]
        return {
            'tmdb_id': chosen.get('id'),
            'media_type': media_type,
            'title': (chosen.get('title') or chosen.get('name') or name)[:255],
            'poster_path': chosen.get('poster_path') or '',
        }
    return None


def _collect_entries(archive):
    entries = {}

    def entry_for(name, year):
        key = ((name or '').strip().lower(), str(year or '').strip())
        if not key[0]:
            return None
        return entries.setdefault(key, {
            'name': (name or '').strip(),
            'year': str(year or '').strip(),
            'rating': None,
            'review': '',
            'watched_date': None,
        })

    for row in _read_csv(archive, 'watched.csv'):
        entry = entry_for(row.get('Name'), row.get('Year'))
        if entry and not entry['watched_date']:
            entry['watched_date'] = _parse_date(row.get('Date'))

    for row in _read_csv(archive, 'ratings.csv'):
        entry = entry_for(row.get('Name'), row.get('Year'))
        if entry:
            entry['rating'] = _rating(row.get('Rating'))

    for row in _read_csv(archive, 'diary.csv'):
        entry = entry_for(row.get('Name'), row.get('Year'))
        if entry:
            entry['watched_date'] = (
                _parse_date(row.get('Watched Date'))
                or _parse_date(row.get('Date'))
                or entry['watched_date']
            )
            if entry['rating'] is None:
                entry['rating'] = _rating(row.get('Rating'))

    for row in _read_csv(archive, 'reviews.csv'):
        entry = entry_for(row.get('Name'), row.get('Year'))
        if entry:
            review = (row.get('Review') or '').strip()
            if review:
                entry['review'] = review
            if entry['rating'] is None:
                entry['rating'] = _rating(row.get('Rating'))
            entry['watched_date'] = (
                _parse_date(row.get('Watched Date'))
                or _parse_date(row.get('Date'))
                or entry['watched_date']
            )

    return entries


def import_letterboxd_zip(user, upload):
    profile, _ = UserProfile.objects.get_or_create(
        user=user, defaults={'display_name': user.username}
    )

    stats = {
        'logs_created': 0,
        'logs_updated': 0,
        'watchlist_added': 0,
        'watchlist_existing': 0,
        'unmatched': 0,
        'profile_updated': False,
        'entries_found': 0,
        'watchlist_found': 0,
    }

    with zipfile.ZipFile(upload) as archive:
        names = set(archive.namelist())
        if not any(name in names for name in ('diary.csv', 'watched.csv', 'ratings.csv', 'reviews.csv', 'watchlist.csv')):
            raise ValueError('This ZIP does not look like a Letterboxd export.')

        profile_rows = _read_csv(archive, 'profile.csv')
        if profile_rows:
            row = profile_rows[0]
            bio = (row.get('Bio') or '').strip()
            location = (row.get('Location') or '').strip()
            if bio:
                profile.bio = bio[:250]
                stats['profile_updated'] = True
            if location and not profile.location_city:
                profile.location_city = location[:100]
                stats['profile_updated'] = True
            if stats['profile_updated']:
                profile.save(update_fields=['bio', 'location_city'])

        entries = _collect_entries(archive)
        watchlist_rows = _read_csv(archive, 'watchlist.csv')
        stats['entries_found'] = len(entries)
        stats['watchlist_found'] = len(watchlist_rows)

        unique_keys = list(entries.keys())
        resolved = {}
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = {
                key: executor.submit(_resolve_tmdb, entries[key]['name'], entries[key]['year'])
                for key in unique_keys
            }
            for key, future in futures.items():
                try:
                    resolved[key] = future.result()
                except Exception:
                    resolved[key] = None

        for key, entry in entries.items():
            match = resolved.get(key)
            if not match or not match.get('tmdb_id'):
                stats['unmatched'] += 1
                continue
            _, created = MovieLog.objects.update_or_create(
                user=user,
                tmdb_id=match['tmdb_id'],
                media_type=match['media_type'],
                defaults={
                    'rating': entry['rating'],
                    'review': entry['review'],
                    'watched_date': entry['watched_date'],
                },
            )
            if created:
                stats['logs_created'] += 1
            else:
                stats['logs_updated'] += 1

        for row in watchlist_rows:
            match = _resolve_tmdb(row.get('Name'), row.get('Year'))
            if not match or not match.get('tmdb_id'):
                stats['unmatched'] += 1
                continue
            existing = Watchlist.objects.filter(
                user=user,
                tmdb_id=match['tmdb_id'],
                media_type=match['media_type'],
            ).first()
            if existing is not None:
                if not existing.poster_path or not existing.title:
                    existing.poster_path = match['poster_path'] or existing.poster_path
                    existing.title = existing.title or match['title'] or ''
                    existing.save(update_fields=['poster_path', 'title'])
                stats['watchlist_existing'] += 1
                continue
            Watchlist.objects.create(
                user=user,
                tmdb_id=match['tmdb_id'],
                media_type=match['media_type'],
                title=match['title'] or (row.get('Name') or '')[:255],
                poster_path=match['poster_path'] or '',
            )
            stats['watchlist_added'] += 1

    return stats
