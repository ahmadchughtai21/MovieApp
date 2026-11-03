import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from madflixapp.models import (
    CircleMembership,
    CircleMessage,
    Follow,
    MovieCircle,
    MovieLog,
    UserProfile,
    Watchlist,
)
from madflixapp.utils.matching import calculate_taste_match

DEMO_PREFIX = 'demo_'
DEMO_PASSWORD = 'demo12345'

MOVIES = [
    (157336, 'Interstellar'),
    (155, 'The Dark Knight'),
    (550, 'Fight Club'),
    (680, 'Pulp Fiction'),
    (27205, 'Inception'),
    (238, 'The Godfather'),
    (13, 'Forrest Gump'),
    (603, 'The Matrix'),
    (106646, 'The Wolf of Wall Street'),
    (496243, 'Parasite'),
    (299534, 'Avengers: Endgame'),
    (120, 'The Lord of the Rings: The Fellowship of the Ring'),
    (278, 'The Shawshank Redemption'),
    (129, 'Spirited Away'),
]

CITIES = ['Lahore', 'Karachi', 'Islamabad']

PEOPLE = [
    (525, 'Christopher Nolan', 'director'),
    (138, 'Quentin Tarantino', 'director'),
    (7467, 'David Fincher', 'director'),
    (6193, 'Leonardo DiCaprio', 'actor'),
    (3894, 'Christian Bale', 'actor'),
    (287, 'Brad Pitt', 'actor'),
    (524, 'Natalie Portman', 'actor'),
]

CIRCLES = [
    {
        'slug': 'nolan-universe',
        'name': 'Nolan Universe',
        'description': 'Time loops, practical effects, and IMAX obsession.',
        'genre_tag': 'Sci-Fi',
        'movies': [157336, 27205, 155],
    },
    {
        'slug': 'a24-horror-vault',
        'name': 'A24 Horror Vault',
        'description': 'Slow-burn dread, folk horror, and everything A24.',
        'genre_tag': 'Horror',
        'movies': [496243, 106646],
    },
    {
        'slug': 'criterion-corner',
        'name': 'Criterion Corner',
        'description': 'Classics, restorations, and arthouse deep cuts.',
        'genre_tag': 'Classics',
        'movies': [238, 129, 680],
    },
]

COMMUNITY_LINES = [
    'Just rewatched this and it still holds up.',
    'The score in this one is unreal.',
    'Hot take: the third act is the best part.',
    'Who else is due for a rewatch this weekend?',
    'Adding this to my top four immediately.',
]


class Command(BaseCommand):
    help = 'Seed demo users, diary logs, watchlists, communities, and taste matches.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Remove previously generated demo users and communities before seeding.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        rng = random.Random(42)

        if options['clean']:
            deleted_users, _ = User.objects.filter(username__startswith=DEMO_PREFIX).delete()
            deleted_circles, _ = MovieCircle.objects.filter(
                slug__in=[circle['slug'] for circle in CIRCLES]
            ).delete()
            self.stdout.write(self.style.WARNING(
                f'Cleaned demo data (users rows: {deleted_users}, circle rows: {deleted_circles}).'
            ))

        users = []

        for index in range(1, 13):
            username = f'{DEMO_PREFIX}user{index}'
            user, created = User.objects.get_or_create(
                username=username,
                defaults={'email': f'{username}@madflix.local'},
            )
            user.set_password(DEMO_PASSWORD)
            user.save()

            city = CITIES[index % len(CITIES)]
            director_id, director_name, _ = rng.choice([p for p in PEOPLE if p[2] == 'director'])
            actor_id, actor_name, _ = rng.choice([p for p in PEOPLE if p[2] == 'actor'])
            favourites = rng.sample(MOVIES, 4)

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.display_name = f'Demo User {index}'
            profile.location_city = city
            profile.location_country = 'Pakistan'
            profile.is_vip = rng.random() < 0.3
            profile.bio = rng.choice([
                'Sci-fi apologist and weekend rewatcher.',
                'Here for slow burns and big scores.',
                'Letterboxd addict. Always logging.',
                'Collecting comfort movies one night at a time.',
            ])
            profile.letterboxd_username = username
            profile.fav_film_1_id = favourites[0][0]
            profile.fav_film_2_id = favourites[1][0]
            profile.fav_film_3_id = favourites[2][0]
            profile.fav_film_4_id = favourites[3][0]
            profile.fav_director_id = director_id
            profile.fav_director_name = director_name
            profile.fav_actor_id = actor_id
            profile.fav_actor_name = actor_name
            profile.profile_accent_color = rng.choice(['#6366f1', '#f5b942', '#22c55e', '#ef4444'])
            profile.save()

            log_count = rng.randint(5, 15)
            for tmdb_id, title in rng.sample(MOVIES, min(log_count, len(MOVIES))):
                rating = Decimal(str(rng.randint(1, 5)))
                MovieLog.objects.update_or_create(
                    user=user,
                    tmdb_id=tmdb_id,
                    media_type='movie',
                    defaults={
                        'rating': rating,
                        'review': rng.choice(['', '', 'Loved it.', 'Not for me.', 'A comfort watch.']),
                        'watched_date': timezone.now().date() - timedelta(days=rng.randint(0, 730)),
                    },
                )

            for tmdb_id, title in rng.sample(MOVIES, rng.randint(4, 8)):
                Watchlist.objects.update_or_create(
                    user=user,
                    tmdb_id=tmdb_id,
                    media_type='movie',
                    defaults={'title': title, 'poster_path': ''},
                )

            users.append(user)
            self.stdout.write(f'Seeded {username} ({city})')

        for user in users:
            for other in rng.sample(users, k=rng.randint(2, 4)):
                if other.id != user.id:
                    Follow.objects.get_or_create(follower=user, following=other)

        for i, user_a in enumerate(users):
            for user_b in users[i + 1:]:
                try:
                    calculate_taste_match(user_a, user_b)
                except Exception as exc:
                    self.stdout.write(self.style.WARNING(
                        f'Match failed for {user_a.username}/{user_b.username}: {exc}'
                    ))

        for circle_data in CIRCLES:
            circle, _ = MovieCircle.objects.update_or_create(
                slug=circle_data['slug'],
                defaults={
                    'name': circle_data['name'],
                    'description': circle_data['description'],
                    'genre_tag': circle_data['genre_tag'],
                },
            )
            if not circle.messages.exists():
                for line_index, line in enumerate(rng.sample(COMMUNITY_LINES, 4)):
                    sender = users[(line_index + len(circle.slug)) % len(users)]
                    CircleMessage.objects.create(
                        circle=circle,
                        sender=sender,
                        message=line,
                        tmdb_id=rng.choice(circle_data['movies']),
                        media_type='movie',
                    )
            if circle.owner is None:
                circle.owner = rng.choice(users)
                circle.save(update_fields=['owner'])
            CircleMembership.objects.get_or_create(circle=circle, user=circle.owner)
            for member in rng.sample(users, k=rng.randint(4, 8)):
                CircleMembership.objects.get_or_create(circle=circle, user=member)
            self.stdout.write(f'Seeded community {circle.name}')

        self.stdout.write(self.style.SUCCESS(
            f'Demo data ready: {len(users)} users, {MovieLog.objects.filter(user__username__startswith=DEMO_PREFIX).count()} logs.'
        ))
