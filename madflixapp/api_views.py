from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.core.paginator import Paginator
from django.db.models import Avg, Count, Q
from django.http import JsonResponse
from django.core.cache import cache
from django.utils import timezone
from django.utils.text import slugify
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
import time
import requests
from django.core.files.storage import default_storage
from .models import (
    CircleMembership,
    CircleMessage,
    ClipComment,
    ClipLike,
    DiaryLike,
    DirectMessage,
    Follow,
    FriendRequest,
    MovieCircle,
    MovieLog,
    ReviewReply,
    ReviewReplyLike,
    TasteMatch,
    UserProfile,
    UserReport,
    Watchlist,
)
from .utils.matching import calculate_taste_match
from .serializers import (
    GenreSerializer, MovieSearchSerializer, TVSearchSerializer,
    MoviePlayerSerializer, ShowPlayerSerializer, GenreDiscoverSerializer
)

# TMDB API Configuration
TMDB_API_KEY = "094fb2bd51d27c7e737e0111053401dd"
TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Genres data
MOVIES_GENRES = [
    {"id": 28, "name": "Action"},
    {"id": 12, "name": "Adventure"},
    {"id": 16, "name": "Animation"},
    {"id": 35, "name": "Comedy"},
    {"id": 80, "name": "Crime"},
    {"id": 99, "name": "Documentary"},
    {"id": 18, "name": "Drama"},
    {"id": 10751, "name": "Family"},
    {"id": 14, "name": "Fantasy"},
    {"id": 36, "name": "History"},
    {"id": 27, "name": "Horror"},
    {"id": 10402, "name": "Music"},
    {"id": 9648, "name": "Mystery"},
    {"id": 10749, "name": "Romance"},
    {"id": 878, "name": "Science Fiction"},
    {"id": 10770, "name": "TV Movie"},
    {"id": 53, "name": "Thriller"},
    {"id": 10752, "name": "War"},
    {"id": 37, "name": "Western"}
]

SHOWS_GENRES = [
    {"id": 10759, "name": "Action & Adventure"},
    {"id": 16, "name": "Animation"},
    {"id": 35, "name": "Comedy"},
    {"id": 80, "name": "Crime"},
    {"id": 99, "name": "Documentary"},
    {"id": 18, "name": "Drama"},
    {"id": 10751, "name": "Family"},
    {"id": 10762, "name": "Kids"},
    {"id": 9648, "name": "Mystery"},
    {"id": 10763, "name": "News"},
    {"id": 10764, "name": "Reality"},
    {"id": 10765, "name": "Sci-Fi & Fantasy"},
    {"id": 10766, "name": "Soap"},
    {"id": 10767, "name": "Talk"},
    {"id": 10768, "name": "War & Politics"},
    {"id": 37, "name": "Western"}
]

# Helper function to make TMDB requests
def make_tmdb_request(endpoint, params=None):
    """Helper function to make requests to TMDB API with caching"""
    cache_key = f'tmdb:{endpoint}:{hash(frozenset(params.items()) if params else frozenset())}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    url = f"{TMDB_BASE_URL}{endpoint}"
    if params is None:
        params = {}
    params['api_key'] = TMDB_API_KEY

    # The TMDB edge occasionally returns empty 204s under burst load — retry.
    last_error = None
    for attempt in range(3):
        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 204 or not response.content:
                raise requests.exceptions.RequestException('empty TMDB response')
            response.raise_for_status()
            data = response.json()
            cache.set(cache_key, data, 300)  # Cache for 5 minutes
            return data
        except (requests.exceptions.RequestException, ValueError) as e:
            last_error = e
            if attempt < 2:
                time.sleep(0.5 * (attempt + 1))
    return {"error": str(last_error)}

# =============================================================================
# HOME PAGE API ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_home_data(request):
    """
    Get all home page data including trending movies/shows, popular, upcoming, etc.
    Uses parallel requests for faster loading.
    """
    try:
        # Define all TMDB endpoints to fetch
        endpoints = {
            'movies_trending': '/trending/movie/week',
            'movies_popular': '/movie/popular',
            'movies_upcoming': '/movie/upcoming',
            'movies_top_rated': '/movie/top_rated',
            'shows_airing_today': '/tv/airing_today',
            'shows_on_the_air': '/tv/on_the_air',
            'shows_trending': '/trending/tv/week',
            'shows_top_rated': '/tv/top_rated',
        }

        # Fetch all in parallel
        results = {}
        with ThreadPoolExecutor(max_workers=8) as executor:
            future_to_key = {
                executor.submit(make_tmdb_request, path): key
                for key, path in endpoints.items()
            }
            for future in as_completed(future_to_key):
                key = future_to_key[future]
                try:
                    results[key] = future.result()
                except Exception:
                    results[key] = {"error": "Failed to fetch"}

        data = {
            'movies': {
                'trending_this_week': results.get('movies_trending', {}),
                'popular': results.get('movies_popular', {}),
                'upcoming': results.get('movies_upcoming', {}),
                'top_rated': results.get('movies_top_rated', {}),
            },
            'shows': {
                'airing_today': results.get('shows_airing_today', {}),
                'on_the_air': results.get('shows_on_the_air', {}),
                'trending_this_week': results.get('shows_trending', {}),
                'top_rated': results.get('shows_top_rated', {}),
            },
            'genres': {
                'movies': MOVIES_GENRES,
                'shows': SHOWS_GENRES,
            },
        }

        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": "Failed to fetch home data", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# =============================================================================
# MOVIE API ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_movies_data(request):
    """
    Get movies data including now playing, popular, and upcoming
    """
    try:
        endpoints = {
            'now_playing': '/movie/now_playing',
            'popular': '/movie/popular',
            'upcoming': '/movie/upcoming',
        }
        results = {}
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_to_key = {
                executor.submit(make_tmdb_request, path): key
                for key, path in endpoints.items()
            }
            for future in as_completed(future_to_key):
                key = future_to_key[future]
                try:
                    results[key] = future.result()
                except Exception:
                    results[key] = {"error": "Failed to fetch"}

        data = {
            'now_playing': results.get('now_playing', {}),
            'popular': results.get('popular', {}),
            'upcoming': results.get('upcoming', {}),
        }
        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": "Failed to fetch movies data", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_movie_trending(request):
    """Get trending movies"""
    try:
        time_window = request.GET.get('time_window', 'week')  # day or week
        data = make_tmdb_request(f'/trending/movie/{time_window}')
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch trending movies", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_movie_popular(request):
    """Get popular movies with pagination"""
    try:
        page = request.GET.get('page', 1)
        data = make_tmdb_request('/movie/popular', {'page': page})
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch popular movies", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_movie_top_rated(request):
    """Get top rated movies with pagination"""
    try:
        page = request.GET.get('page', 1)
        data = make_tmdb_request('/movie/top_rated', {'page': page})
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch top rated movies", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_movie_upcoming(request):
    """Get upcoming movies with pagination"""
    try:
        page = request.GET.get('page', 1)
        data = make_tmdb_request('/movie/upcoming', {'page': page})
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch upcoming movies", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_movie_now_playing(request):
    """Get now playing movies with pagination"""
    try:
        page = request.GET.get('page', 1)
        data = make_tmdb_request('/movie/now_playing', {'page': page})
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch now playing movies", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_movie_search(request):
    """Search movies by query"""
    try:
        serializer = MovieSearchSerializer(data=request.GET)
        if serializer.is_valid():
            query = serializer.validated_data['query']
            page = serializer.validated_data.get('page', 1)

            data = make_tmdb_request('/search/movie', {
                'query': query,
                'page': page
            })

            # Log search
            try:
                from .models import SearchLog
                results_count = data.get('total_results', 0) if isinstance(data, dict) else 0
                ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
                SearchLog.objects.create(
                    query=f"movie:{query}",
                    results_count=results_count,
                    ip_address=ip,
                    user=request.user if request.user.is_authenticated else None,
                )
            except Exception:
                pass

            return Response(data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response(
            {"error": "Failed to search movies", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_movie_details(request, movie_id):
    """Get detailed information about a specific movie"""
    try:
        # Get movie details
        movie_details = make_tmdb_request(f'/movie/{movie_id}')

        # Get similar movies
        similar_movies = make_tmdb_request(f'/movie/{movie_id}/similar')

        # Get movie credits
        credits = make_tmdb_request(f'/movie/{movie_id}/credits')

        # Get movie videos (trailers, etc.)
        videos = make_tmdb_request(f'/movie/{movie_id}/videos')

        # Movie streaming URL (using the same service as in your original code)
        streaming_url = f"https://vidapi.xyz/embedmulti/movie/{movie_id}"

        data = {
            'movie_details': movie_details,
            'similar_movies': similar_movies,
            'credits': credits,
            'videos': videos,
            'streaming_url': streaming_url
        }

        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": "Failed to fetch movie details", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_movies_by_genre(request):
    """Get movies by genre with pagination"""
    try:
        serializer = GenreDiscoverSerializer(data=request.GET)
        if serializer.is_valid():
            genre_id = serializer.validated_data['genre_id']
            page = serializer.validated_data.get('page', 1)

            data = make_tmdb_request('/discover/movie', {
                'with_genres': genre_id,
                'page': page
            })

            # Add genre name
            genre_name = next((item['name'] for item in MOVIES_GENRES if item['id'] == genre_id), None)
            data['genre_info'] = {'id': genre_id, 'name': genre_name}

            return Response(data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response(
            {"error": "Failed to fetch movies by genre", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# =============================================================================
# TV SHOWS API ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_shows_data(request):
    """
    Get TV shows data including airing today, on the air, popular, and top rated
    """
    try:
        endpoints = {
            'airing_today': '/tv/airing_today',
            'on_the_air': '/tv/on_the_air',
            'popular': '/tv/popular',
            'top_rated': '/tv/top_rated',
        }
        results = {}
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_key = {
                executor.submit(make_tmdb_request, path): key
                for key, path in endpoints.items()
            }
            for future in as_completed(future_to_key):
                key = future_to_key[future]
                try:
                    results[key] = future.result()
                except Exception:
                    results[key] = {"error": "Failed to fetch"}

        data = {
            'airing_today': results.get('airing_today', {}),
            'on_the_air': results.get('on_the_air', {}),
            'popular': results.get('popular', {}),
            'top_rated': results.get('top_rated', {}),
        }
        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": "Failed to fetch shows data", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_show_trending(request):
    """Get trending TV shows"""
    try:
        time_window = request.GET.get('time_window', 'week')  # day or week
        data = make_tmdb_request(f'/trending/tv/{time_window}')
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch trending shows", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_show_popular(request):
    """Get popular TV shows with pagination"""
    try:
        page = request.GET.get('page', 1)
        data = make_tmdb_request('/tv/popular', {'page': page})
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch popular shows", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_show_top_rated(request):
    """Get top rated TV shows with pagination"""
    try:
        page = request.GET.get('page', 1)
        data = make_tmdb_request('/tv/top_rated', {'page': page})
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch top rated shows", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_show_airing_today(request):
    """Get TV shows airing today with pagination"""
    try:
        page = request.GET.get('page', 1)
        data = make_tmdb_request('/tv/airing_today', {'page': page})
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch shows airing today", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_show_on_the_air(request):
    """Get TV shows on the air with pagination"""
    try:
        page = request.GET.get('page', 1)
        data = make_tmdb_request('/tv/on_the_air', {'page': page})
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch shows on the air", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_show_search(request):
    """Search TV shows by query"""
    try:
        serializer = TVSearchSerializer(data=request.GET)
        if serializer.is_valid():
            query = serializer.validated_data['query']
            page = serializer.validated_data.get('page', 1)

            data = make_tmdb_request('/search/tv', {
                'query': query,
                'page': page
            })

            # Log search
            try:
                from .models import SearchLog
                results_count = data.get('total_results', 0) if isinstance(data, dict) else 0
                ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
                SearchLog.objects.create(
                    query=f"tv:{query}",
                    results_count=results_count,
                    ip_address=ip,
                    user=request.user if request.user.is_authenticated else None,
                )
            except Exception:
                pass

            return Response(data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response(
            {"error": "Failed to search shows", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_show_details(request, show_id):
    """Get detailed information about a specific TV show"""
    try:
        season = request.GET.get('season', 1)
        episode = request.GET.get('episode', 1)

        # Get show details
        show_details = make_tmdb_request(f'/tv/{show_id}')

        # Get episode details if season and episode are provided
        episode_details = None
        if season and episode:
            episode_details = make_tmdb_request(f'/tv/{show_id}/season/{season}/episode/{episode}')

        # Get similar shows
        similar_shows = make_tmdb_request(f'/tv/{show_id}/similar')

        # Get show credits
        credits = make_tmdb_request(f'/tv/{show_id}/credits')

        # Get show videos
        videos = make_tmdb_request(f'/tv/{show_id}/videos')

        # Get seasons data with episode counts
        seasons_data = []
        if 'seasons' in show_details and show_details['seasons']:
            for season_info in show_details['seasons']:
                if season_info.get('air_date'):  # Only include seasons with air dates
                    season_data = make_tmdb_request(f'/tv/{show_id}/season/{season_info["season_number"]}')
                    seasons_data.append({
                        'season_number': season_info['season_number'],
                        'name': season_info['name'],
                        'episode_count': len(season_data.get('episodes', [])),
                        'air_date': season_info['air_date'],
                        'overview': season_info.get('overview', ''),
                        'poster_path': season_info.get('poster_path')
                    })

        # Calculate navigation info for episodes
        navigation_info = None
        if season and episode and seasons_data:
            current_season = None
            next_season = None
            prev_season = None

            # Find current, next and previous seasons
            for i, season_data in enumerate(seasons_data):
                if season_data['season_number'] == int(season):
                    current_season = season_data
                    if i > 0:
                        prev_season = seasons_data[i - 1]
                    if i < len(seasons_data) - 1:
                        next_season = seasons_data[i + 1]
                    break

            if current_season:
                navigation_info = {
                    'current_season': current_season['season_number'],
                    'current_episode': int(episode),
                    'next_episode': None,
                    'prev_episode': None
                }

                # Calculate next episode
                if int(episode) < current_season['episode_count']:
                    navigation_info['next_episode'] = {
                        'season': int(season),
                        'episode': int(episode) + 1
                    }
                elif next_season:
                    navigation_info['next_episode'] = {
                        'season': next_season['season_number'],
                        'episode': 1
                    }

                # Calculate previous episode
                if int(episode) > 1:
                    navigation_info['prev_episode'] = {
                        'season': int(season),
                        'episode': int(episode) - 1
                    }
                elif prev_season:
                    navigation_info['prev_episode'] = {
                        'season': prev_season['season_number'],
                        'episode': prev_season['episode_count']
                    }

        # Show streaming URL
        streaming_url = None
        if season and episode:
            streaming_url = f"https://vidapi.xyz/embedmulti/tv/{show_id}&s{season}&e={episode}"

        data = {
            'show_details': show_details,
            'episode_details': episode_details,
            'similar_shows': similar_shows,
            'credits': credits,
            'videos': videos,
            'seasons_data': seasons_data,
            'navigation_info': navigation_info,
            'streaming_url': streaming_url
        }

        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": "Failed to fetch show details", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_shows_by_genre(request):
    """Get TV shows by genre with pagination"""
    try:
        serializer = GenreDiscoverSerializer(data=request.GET)
        if serializer.is_valid():
            genre_id = serializer.validated_data['genre_id']
            page = serializer.validated_data.get('page', 1)

            data = make_tmdb_request('/discover/tv', {
                'with_genres': genre_id,
                'page': page
            })

            # Add genre name
            genre_name = next((item['name'] for item in SHOWS_GENRES if item['id'] == genre_id), None)
            data['genre_info'] = {'id': genre_id, 'name': genre_name}

            return Response(data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response(
            {"error": "Failed to fetch shows by genre", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# =============================================================================
# GENRE API ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_movie_genres(request):
    """Get all movie genres"""
    try:
        serializer = GenreSerializer(MOVIES_GENRES, many=True)
        return Response({
            'genres': serializer.data,
            'count': len(MOVIES_GENRES)
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch movie genres", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_show_genres(request):
    """Get all TV show genres"""
    try:
        serializer = GenreSerializer(SHOWS_GENRES, many=True)
        return Response({
            'genres': serializer.data,
            'count': len(SHOWS_GENRES)
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch show genres", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_all_genres(request):
    """Get all genres (movies and TV shows)"""
    try:
        movie_serializer = GenreSerializer(MOVIES_GENRES, many=True)
        show_serializer = GenreSerializer(SHOWS_GENRES, many=True)

        return Response({
            'movie_genres': movie_serializer.data,
            'show_genres': show_serializer.data,
            'movie_count': len(MOVIES_GENRES),
            'show_count': len(SHOWS_GENRES)
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch genres", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# =============================================================================
# WATCH PROVIDERS ENDPOINTS
# =============================================================================

# Map of TMDB provider IDs to display info and search URL templates.
# Search URLs are used because TMDB does not provide provider-specific content IDs
# that would let us deep-link into the exact title on each service.
WATCH_PROVIDERS = {
    8:    {"name": "Netflix",         "search_url": "https://www.netflix.com/search?q={q}"},
    119:  {"name": "Amazon Prime",    "search_url": "https://www.amazon.com/s?k={q}&i=instant-video"},
    337:  {"name": "Disney+",         "search_url": "https://www.disneyplus.com/search?q={q}"},
    350:  {"name": "Apple TV+",       "search_url": "https://tv.apple.com/search?term={q}"},
    384:  {"name": "Max",             "search_url": "https://play.max.com/search?q={q}"},
    15:   {"name": "Hulu",            "search_url": "https://www.hulu.com/search?q={q}"},
    531:  {"name": "Paramount+",      "search_url": "https://www.paramountplus.com/search?q={q}"},
    386:  {"name": "Peacock",         "search_url": "https://www.peacocktv.com/search?q={q}"},
    2:    {"name": "Apple TV",        "search_url": "https://tv.apple.com/search?term={q}"},
    3:    {"name": "Google Play",     "search_url": "https://play.google.com/store/search?q={q}&c=movies"},
    10:   {"name": "Amazon Video",    "search_url": "https://www.amazon.com/s?k={q}&i=instant-video"},
    192:  {"name": "YouTube",         "search_url": "https://www.youtube.com/results?search_query={q}+full+movie"},
}


def _build_providers_payload(providers_data, title, region):
    """
    Build the response payload for a watch providers request.

    Returns up to three categories: stream (subscription), rent, buy.
    Each item contains the provider's logo, name, and a search URL.
    """
    region_data = (providers_data.get("results") or {}).get(region) or {}
    categories = {"stream": [], "rent": [], "buy": []}

    seen_ids = set()
    for category_key, tmdb_key in (("stream", "flatrate"), ("rent", "rent"), ("buy", "buy")):
        for provider in region_data.get(tmdb_key, []):
            pid = provider.get("provider_id")
            if pid in seen_ids:
                continue
            seen_ids.add(pid)

            if pid not in WATCH_PROVIDERS:
                continue
            info = WATCH_PROVIDERS[pid]

            logo_path = provider.get("logo_path")
            categories[category_key].append({
                "provider_id": pid,
                "name": info["name"],
                "logo_path": f"https://image.tmdb.org/t/p/w92{logo_path}" if logo_path else None,
                "url": info["search_url"].format(q=requests.utils.quote(title)),
            })

    has_any = any(categories.values())
    return {
        "providers": categories,
        "has_any": has_any,
        "region": region,
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def api_movie_watch_providers(request, movie_id):
    """Get streaming/rent/buy providers for a movie"""
    try:
        region = request.GET.get('region', 'US').upper()
        title = request.GET.get('title', '')

        if not title:
            details = make_tmdb_request(f'/movie/{movie_id}')
            title = details.get('title') or details.get('original_title') or ''

        providers_data = make_tmdb_request(f'/movie/{movie_id}/watch/providers')
        payload = _build_providers_payload(providers_data, title, region)
        return Response(payload, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch watch providers", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def api_show_watch_providers(request, show_id):
    """Get streaming/rent/buy providers for a TV show"""
    try:
        region = request.GET.get('region', 'US').upper()
        title = request.GET.get('title', '')

        if not title:
            details = make_tmdb_request(f'/tv/{show_id}')
            title = details.get('name') or details.get('original_name') or ''

        providers_data = make_tmdb_request(f'/tv/{show_id}/watch/providers')
        payload = _build_providers_payload(providers_data, title, region)
        return Response(payload, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch watch providers", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =============================================================================
# SEASON AND EPISODE ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_season_details(request, show_id, season_number):
    """Get detailed information about a specific season"""
    try:
        season_details = make_tmdb_request(f'/tv/{show_id}/season/{season_number}')
        return Response(season_details, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch season details", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_episode_details(request, show_id, season_number, episode_number):
    """Get detailed information about a specific episode"""
    try:
        episode_details = make_tmdb_request(f'/tv/{show_id}/season/{season_number}/episode/{episode_number}')
        return Response(episode_details, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch episode details", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_multi_search(request):
    """Search across movies, TV shows, and people"""
    try:
        query = request.GET.get('query')
        page = request.GET.get('page', 1)

        if not query:
            return Response(
                {"error": "Query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = make_tmdb_request('/search/multi', {
            'query': query,
            'page': page
        })

        # Log search
        try:
            from .models import SearchLog
            results_count = data.get('total_results', 0) if isinstance(data, dict) else 0
            ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')
            SearchLog.objects.create(
                query=query,
                results_count=results_count,
                ip_address=ip,
                user=request.user if request.user.is_authenticated else None,
            )
        except Exception:
            pass

        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to perform multi search", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_configuration(request):
    """Get TMDB API configuration for image URLs, etc."""
    try:
        data = make_tmdb_request('/configuration')
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch configuration", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_endpoints_list(request):
    """
    List all available API endpoints for easy reference
    """
    endpoints = {
        "base_url": request.build_absolute_uri('/api/'),
        "endpoints": {
            "home": {
                "url": "/api/home/",
                "method": "GET",
                "description": "Get all homepage data (trending, popular, etc.)"
            },
            "movies": {
                "all_movies_data": {
                    "url": "/api/movies/",
                    "method": "GET",
                    "description": "Get all movies data (now playing, popular, upcoming)"
                },
                "trending": {
                    "url": "/api/movies/trending/",
                    "method": "GET",
                    "params": "?time_window=week",
                    "description": "Get trending movies (day/week)"
                },
                "popular": {
                    "url": "/api/movies/popular/",
                    "method": "GET",
                    "params": "?page=1",
                    "description": "Get popular movies with pagination"
                },
                "top_rated": {
                    "url": "/api/movies/top-rated/",
                    "method": "GET",
                    "params": "?page=1",
                    "description": "Get top rated movies with pagination"
                },
                "upcoming": {
                    "url": "/api/movies/upcoming/",
                    "method": "GET",
                    "params": "?page=1",
                    "description": "Get upcoming movies with pagination"
                },
                "now_playing": {
                    "url": "/api/movies/now-playing/",
                    "method": "GET",
                    "params": "?page=1",
                    "description": "Get now playing movies with pagination"
                },
                "search": {
                    "url": "/api/movies/search/",
                    "method": "GET",
                    "params": "?query=search_term&page=1",
                    "description": "Search movies by query"
                },
                "details": {
                    "url": "/api/movies/{movie_id}/",
                    "method": "GET",
                    "description": "Get detailed movie information, similar movies, credits, videos"
                },
                "by_genre": {
                    "url": "/api/movies/genre/",
                    "method": "GET",
                    "params": "?genre_id=28&page=1",
                    "description": "Get movies by genre ID"
                }
            },
            "shows": {
                "all_shows_data": {
                    "url": "/api/shows/",
                    "method": "GET",
                    "description": "Get all TV shows data (airing today, on air, popular, top rated)"
                },
                "trending": {
                    "url": "/api/shows/trending/",
                    "method": "GET",
                    "params": "?time_window=week",
                    "description": "Get trending TV shows (day/week)"
                },
                "popular": {
                    "url": "/api/shows/popular/",
                    "method": "GET",
                    "params": "?page=1",
                    "description": "Get popular TV shows with pagination"
                },
                "top_rated": {
                    "url": "/api/shows/top-rated/",
                    "method": "GET",
                    "params": "?page=1",
                    "description": "Get top rated TV shows with pagination"
                },
                "airing_today": {
                    "url": "/api/shows/airing-today/",
                    "method": "GET",
                    "params": "?page=1",
                    "description": "Get TV shows airing today with pagination"
                },
                "on_the_air": {
                    "url": "/api/shows/on-the-air/",
                    "method": "GET",
                    "params": "?page=1",
                    "description": "Get TV shows on the air with pagination"
                },
                "search": {
                    "url": "/api/shows/search/",
                    "method": "GET",
                    "params": "?query=search_term&page=1",
                    "description": "Search TV shows by query"
                },
                "details": {
                    "url": "/api/shows/{show_id}/",
                    "method": "GET",
                    "params": "?season=1&episode=1",
                    "description": "Get detailed show information, episodes, similar shows, navigation"
                },
                "by_genre": {
                    "url": "/api/shows/genre/",
                    "method": "GET",
                    "params": "?genre_id=18&page=1",
                    "description": "Get TV shows by genre ID"
                },
                "season_details": {
                    "url": "/api/shows/{show_id}/season/{season_number}/",
                    "method": "GET",
                    "description": "Get detailed season information"
                },
                "episode_details": {
                    "url": "/api/shows/{show_id}/season/{season_number}/episode/{episode_number}/",
                    "method": "GET",
                    "description": "Get detailed episode information"
                }
            },
            "genres": {
                "movie_genres": {
                    "url": "/api/genres/movies/",
                    "method": "GET",
                    "description": "Get all movie genres"
                },
                "show_genres": {
                    "url": "/api/genres/shows/",
                    "method": "GET",
                    "description": "Get all TV show genres"
                },
                "all_genres": {
                    "url": "/api/genres/",
                    "method": "GET",
                    "description": "Get all genres (movies and TV shows)"
                }
            },
            "utility": {
                "multi_search": {
                    "url": "/api/search/",
                    "method": "GET",
                    "params": "?query=search_term&page=1",
                    "description": "Search across movies, TV shows, and people"
                },
                "configuration": {
                    "url": "/api/config/",
                    "method": "GET",
                    "description": "Get TMDB configuration for image URLs"
                },
                "endpoints_list": {
                    "url": "/api/endpoints/",
                    "method": "GET",
                    "description": "Get list of all available endpoints (this endpoint)"
                }
            }
        },
        "authentication": "No authentication required - all endpoints are public",
        "base_parameters": {
            "page": "Integer - Page number for pagination (default: 1)",
            "query": "String - Search query for search endpoints",
            "time_window": "String - 'day' or 'week' for trending endpoints"
        },
        "response_format": "All endpoints return JSON responses",
        "error_handling": "Errors return JSON with 'error' and 'details' fields"
    }

    return Response(endpoints, status=status.HTTP_200_OK)


# =============================================================================
# RECOMMENDATIONS ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_recommendations(request):
    """
    Get personalized recommendations based on user's watch history.
    For logged-in users: fetches recommendations from their recently watched movies/shows.
    For logged-out users: falls back to trending + popular.
    """
    try:
        user = request.user
        source_ids = []

        if user.is_authenticated:
            from django.utils import timezone
            from datetime import timedelta
            from .models import WatchHistory, Watchlist

            cutoff = timezone.now() - timedelta(days=60)

            # Get recent movie IDs from watch history
            recent_movies = list(
                WatchHistory.objects.filter(
                    user=user, media_type='movie', timestamp__gte=cutoff
                ).values_list('tmdb_id', flat=True).distinct()[:8]
            )

            # Get recent show IDs
            recent_shows = list(
                WatchHistory.objects.filter(
                    user=user, media_type='tv', timestamp__gte=cutoff
                ).values_list('tmdb_id', flat=True).distinct()[:5]
            )

            # Get watchlist IDs to exclude
            watchlist_ids = set(
                Watchlist.objects.filter(user=user).values_list('tmdb_id', flat=True)
            )

            # Get watched IDs to exclude
            watched_ids = set(
                WatchHistory.objects.filter(user=user, completed=True).values_list('tmdb_id', flat=True)
            )

            # Diary logs are the richest taste signal on Madflix.
            log_rows = list(
                MovieLog.objects.filter(user=user)
                .order_by('-created_at')
                .values('tmdb_id', 'media_type')[:12]
            )
            recent_movies = list(dict.fromkeys(
                recent_movies + [row['tmdb_id'] for row in log_rows if row['media_type'] == 'movie']
            ))[:8]
            recent_shows = list(dict.fromkeys(
                recent_shows + [row['tmdb_id'] for row in log_rows if row['media_type'] == 'tv']
            ))[:5]

            exclude_ids = watchlist_ids | watched_ids | {row['tmdb_id'] for row in log_rows}
            raw_exclude = request.GET.get('exclude', '')
            for token in raw_exclude.split(','):
                try:
                    exclude_ids.add(int(token))
                except (TypeError, ValueError):
                    continue

            # Fetch recommendations in parallel for recent movies
            movie_recs = {}
            with ThreadPoolExecutor(max_workers=6) as executor:
                future_to_id = {
                    executor.submit(make_tmdb_request, f'/movie/{mid}/recommendations'): mid
                    for mid in recent_movies
                }
                for future in as_completed(future_to_id):
                    mid = future_to_id[future]
                    try:
                        result = future.result()
                        for rec in (result.get('results') or [])[:10]:
                            rid = rec.get('id')
                            if rid and rid not in exclude_ids:
                                if rid not in movie_recs:
                                    movie_recs[rid] = {**rec, 'rec_count': 0, 'source_type': 'movie', 'media_type': 'movie'}
                                movie_recs[rid]['rec_count'] += 1
                    except Exception:
                        pass

            # Fetch recommendations for recent shows
            show_recs = {}
            with ThreadPoolExecutor(max_workers=4) as executor:
                future_to_id = {
                    executor.submit(make_tmdb_request, f'/tv/{sid}/recommendations'): sid
                    for sid in recent_shows
                }
                for future in as_completed(future_to_id):
                    sid = future_to_id[future]
                    try:
                        result = future.result()
                        for rec in (result.get('results') or [])[:10]:
                            rid = rec.get('id')
                            if rid and rid not in exclude_ids:
                                if rid not in show_recs:
                                    show_recs[rid] = {**rec, 'rec_count': 0, 'source_type': 'tv', 'media_type': 'tv'}
                                show_recs[rid]['rec_count'] += 1
                    except Exception:
                        pass

            # Merge and sort by relevance
            all_recs = {**movie_recs, **show_recs}
            rec_list = sorted(
                all_recs.values(),
                key=lambda x: (x['rec_count'], x.get('vote_average', 0) or 0),
                reverse=True
            )

            rec_list = [item for item in rec_list if item.get('id') not in exclude_ids]

        # Fallback pool deliberately avoids /trending so it never mirrors the home rails.
        fallback_sources = [
            ('/movie/top_rated', 'movie', 1),
            ('/movie/top_rated', 'movie', 2),
            ('/movie/upcoming', 'movie', 1),
            ('/movie/upcoming', 'movie', 2),
            ('/tv/top_rated', 'tv', 1),
            ('/tv/popular', 'tv', 1),
            ('/tv/popular', 'tv', 2),
            ('/movie/now_playing', 'movie', 1),
            ('/tv/on_the_air', 'tv', 1),
        ]
        fallback = []
        seen = set()
        exclude_ids = locals().get('exclude_ids', set())
        for endpoint, media_type, page in fallback_sources:
            payload = make_tmdb_request(endpoint, {'page': page})
            for item in (payload.get('results') or []):
                item_id = item.get('id')
                if not item_id or item_id in seen or item_id in exclude_ids:
                    continue
                seen.add(item_id)
                fallback.append({**item, 'media_type': media_type})

        # Last resort: never leave the user with an empty recommendations rail.
        if not fallback:
            payload = make_tmdb_request('/movie/top_rated', {'page': 1})
            fallback = [
                {**item, 'media_type': 'movie'}
                for item in (payload.get('results') or [])[:20]
            ]

        if user.is_authenticated and locals().get('rec_list'):
            merged = []
            merged_ids = set()
            for item in rec_list + fallback:
                item_id = item.get('id')
                if not item_id or item_id in merged_ids:
                    continue
                merged_ids.add(item_id)
                merged.append(item)
            return Response({
                'results': merged[:40],
                'source': 'personalized',
                'total': len(merged),
            }, status=status.HTTP_200_OK)

        return Response({
            'results': fallback[:40],
            'source': 'fallback',
            'total': len(fallback),
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": "Failed to fetch recommendations", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def get_recommended_media_pairs(user):
    """
    Ordered [(tmdb_id, media_type), ...] recommendation pool for the clips feed.

    Authenticated users: TMDB recommendations derived from their recent watch
    history (same sources as api_recommendations), falling back to trending +
    popular when history is thin. Anonymous users get an empty list.
    Cached per user for 10 minutes.
    """
    if user is None or not user.is_authenticated:
        return []

    cache_key = f'rec_pairs:{user.id}'
    cached = cache.get(cache_key)
    if cached is not None:
        return [tuple(p) for p in cached]

    from datetime import timedelta
    from django.utils import timezone
    from .models import WatchHistory, Watchlist

    pairs = []
    seen = set()

    def add(rid, media_type):
        if rid and (rid, media_type) not in seen:
            seen.add((rid, media_type))
            pairs.append((rid, media_type))

    cutoff = timezone.now() - timedelta(days=60)
    recent_movies = list(
        WatchHistory.objects.filter(user=user, media_type='movie', timestamp__gte=cutoff)
        .values_list('tmdb_id', flat=True).distinct()[:8]
    )
    recent_shows = list(
        WatchHistory.objects.filter(user=user, media_type='tv', timestamp__gte=cutoff)
        .values_list('tmdb_id', flat=True).distinct()[:5]
    )
    exclude_ids = set(
        Watchlist.objects.filter(user=user).values_list('tmdb_id', flat=True)
    ) | set(
        WatchHistory.objects.filter(user=user, completed=True).values_list('tmdb_id', flat=True)
    )

    def recommendations_for(ids, kind):
        found = []
        if not ids:
            return found
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = {
                executor.submit(make_tmdb_request, f'/{kind}/{mid}/recommendations'): mid
                for mid in ids
            }
            for future in as_completed(futures):
                try:
                    result = future.result()
                except Exception:
                    continue
                for rec in (result.get('results') or [])[:10]:
                    rid = rec.get('id')
                    if rid and rid not in exclude_ids:
                        found.append(rid)
        return found

    for rid in recommendations_for(recent_movies, 'movie'):
        add(rid, 'movie')
    for rid in recommendations_for(recent_shows, 'tv'):
        add(rid, 'tv')

    if len(pairs) < 10:
        for endpoint in ('/trending/movie/week', '/movie/popular'):
            result = make_tmdb_request(endpoint)
            for item in (result.get('results') or [])[:20]:
                add(item.get('id'), 'movie')

    cache.set(cache_key, [list(p) for p in pairs], 600)
    return pairs


@api_view(['GET'])
@permission_classes([AllowAny])
def api_movie_recommendations(request, movie_id):
    """Get TMDB recommendations for a specific movie."""
    try:
        data = make_tmdb_request(f'/movie/{movie_id}/recommendations')
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch movie recommendations", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def api_show_recommendations(request, show_id):
    """Get TMDB recommendations for a specific TV show."""
    try:
        data = make_tmdb_request(f'/tv/{show_id}/recommendations')
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": "Failed to fetch show recommendations", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


LOCAL_CITY_SUGGESTIONS = [
    ('Lahore', 'Pakistan'), ('Karachi', 'Pakistan'), ('Islamabad', 'Pakistan'),
    ('Rawalpindi', 'Pakistan'), ('Faisalabad', 'Pakistan'), ('Multan', 'Pakistan'),
    ('Peshawar', 'Pakistan'), ('Quetta', 'Pakistan'), ('Hyderabad', 'Pakistan'),
    ('Sialkot', 'Pakistan'), ('Gujranwala', 'Pakistan'), ('Bahawalpur', 'Pakistan'),
    ('Sargodha', 'Pakistan'), ('Abbottabad', 'Pakistan'), ('Murree', 'Pakistan'),
    ('Sukkur', 'Pakistan'), ('Larkana', 'Pakistan'), ('Mardan', 'Pakistan'),
    ('Kasur', 'Pakistan'), ('Okara', 'Pakistan'), ('Jhelum', 'Pakistan'),
    ('Gujrat', 'Pakistan'), ('Sahiwal', 'Pakistan'), ('Rahim Yar Khan', 'Pakistan'),
    ('Dera Ghazi Khan', 'Pakistan'), ('Vehari', 'Pakistan'), ('Chiniot', 'Pakistan'),
    ('Sheikhupura', 'Pakistan'), ('Jhang', 'Pakistan'), ('Lahore Cantt', 'Pakistan'),
    ('Dubai', 'United Arab Emirates'), ('London', 'United Kingdom'),
    ('New York', 'United States'), ('Toronto', 'Canada'), ('Sydney', 'Australia'),
]


@api_view(['GET'])
@permission_classes([AllowAny])
def city_search(request):
    """Search cities through Nominatim, cached for 24 hours."""
    query = (request.GET.get('q') or '').strip()
    if not query:
        return Response([], status=status.HTTP_200_OK)

    cache_key = f'city_search:v3:{query.lower()}'
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached, status=status.HTTP_200_OK)

    needle = query.lower()
    results = []
    seen = set()

    for city, country in LOCAL_CITY_SUGGESTIONS:
        if needle in city.lower():
            key = (city.lower(), country.lower())
            seen.add(key)
            results.append({'city': city, 'country': country})

    try:
        response = requests.get(
            'https://nominatim.openstreetmap.org/search?accept-language=en',
            params={
                'format': 'json',
                'addressdetails': 1,
                'q': query,
                'type': 'city',
            },
            headers={'User-Agent': 'MadflixApp/1.0'},
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.exceptions.RequestException, ValueError):
        return Response([], status=status.HTTP_200_OK)

    for item in payload:
        address = item.get('address') or {}
        city = (
            address.get('city')
            or address.get('town')
            or address.get('village')
            or address.get('municipality')
            or address.get('county')
            or item.get('name')
            or ''
        ).strip()
        country = (address.get('country') or '').strip()
        if not city:
            continue
        key = (city.lower(), country.lower())
        if key in seen:
            continue
        seen.add(key)
        results.append({'city': city, 'country': country})

    cache.set(cache_key, results, 60 * 60 * 24)
    return Response(results, status=status.HTTP_200_OK)


def _recent_logs(user, limit=4):
    logs = list(
        MovieLog.objects.filter(user=user).order_by('-created_at')[:limit]
    )
    tmdb_ids = [log.tmdb_id for log in logs]
    saved = {
        item.tmdb_id: item
        for item in Watchlist.objects.filter(user=user, tmdb_id__in=tmdb_ids)
    }
    result = []
    for log in logs:
        item = saved.get(log.tmdb_id)
        title = item.title if item else ''
        poster_path = item.poster_path if item else ''

        if not title or not poster_path:
            endpoint = f'/tv/{log.tmdb_id}' if log.media_type == 'tv' else f'/movie/{log.tmdb_id}'
            data = make_tmdb_request(endpoint)
            if isinstance(data, dict) and not data.get('error'):
                title = title or data.get('title') or data.get('name') or ''
                poster_path = poster_path or data.get('poster_path') or ''

        result.append({
            'tmdb_id': log.tmdb_id,
            'title': title,
            'poster_path': poster_path,
        })
    return result


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def swipe_discover(request):
    """Discover people by taste; same-city profiles come first, then other cities."""
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    city = (profile.location_city or '').strip().lower()

    followed_ids = Follow.objects.filter(
        follower=request.user
    ).values_list('following_id', flat=True)
    outgoing_ids = set(
        FriendRequest.objects
        .filter(sender=request.user, status='pending')
        .values_list('recipient_id', flat=True)
    )
    accepted_ids = set()
    for row in FriendRequest.objects.filter(
        Q(sender=request.user) | Q(recipient=request.user),
        status='accepted',
    ):
        accepted_ids.add(row.sender_id)
        accepted_ids.add(row.recipient_id)
    incoming_ids = set(
        FriendRequest.objects
        .filter(recipient=request.user, status='pending')
        .values_list('sender_id', flat=True)
    )

    excluded_ids = set(followed_ids) | outgoing_ids | accepted_ids

    candidates = (
        UserProfile.objects
        .exclude(user=request.user)
        .exclude(user_id__in=excluded_ids)
        .select_related('user')
        .order_by('-is_vip', 'user_id')[:200]
    )

    results = []
    for candidate in candidates:
        match = TasteMatch.objects.filter(
            user_a=request.user, user_b=candidate.user
        ).first()
        if match is None:
            try:
                match = calculate_taste_match(request.user, candidate.user)
            except Exception:
                match = None

        candidate_city = (candidate.location_city or '').strip()
        same_city = bool(city and candidate_city.lower() == city)
        stats = MovieLog.objects.filter(user=candidate.user).aggregate(
            avg_rating=Avg('rating'),
            total_logged=Count('id'),
        )
        results.append({
            'id': candidate.user_id,
            'username': candidate.user.username,
            'display_name': candidate.user.profile.display_name or candidate.user.username,
            'avatar_url': candidate.avatar_url,
            'location_city': candidate_city,
            'same_city': same_city,
            'likes_you': candidate.user_id in incoming_ids,
            'is_vip': bool(candidate.is_vip),
            'bio': candidate.bio,
            'fav_director_name': candidate.fav_director_name,
            'fav_actor_name': candidate.fav_actor_name,
            'avg_rating': float(stats['avg_rating']) if stats['avg_rating'] is not None else None,
            'total_logged': stats['total_logged'] or 0,
            'match_percentage': match.match_percentage if match else 50,
            'recent_logs': _recent_logs(candidate.user),
        })

    results.sort(
        key=lambda item: (1 if item['same_city'] else 0, item['match_percentage']),
        reverse=True,
    )
    return Response(results, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def swipe_action(request):
    """Record a swipe, enforcing the daily limit for non-VIP users."""
    target_user_id = request.data.get('target_user_id')
    action = request.data.get('action')

    if action not in ('left', 'right', 'super'):
        return Response(
            {'error': 'Invalid action.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        target_user_id = int(target_user_id)
    except (TypeError, ValueError):
        return Response(
            {'error': 'Invalid target_user_id.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if target_user_id == request.user.id:
        return Response(
            {'error': 'Cannot swipe on yourself.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not User.objects.filter(pk=target_user_id).exists():
        return Response(
            {'error': 'Target user not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    today = timezone.now().date()

    if profile.last_swipe_date != today:
        profile.daily_swipes_count = 0

    if action == 'super' and not profile.is_vip:
        return Response(
            {'error': 'Super swipe is a VIP perk.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not profile.is_vip and profile.daily_swipes_count >= 10:
        return Response(
            {'error': 'Daily swipe limit reached. Upgrade to VIP.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    profile.daily_swipes_count += 1
    profile.last_swipe_date = today
    profile.save(update_fields=['daily_swipes_count', 'last_swipe_date'])

    matched = False
    if action in ('right', 'super'):
        incoming = FriendRequest.objects.filter(
            sender_id=target_user_id,
            recipient=request.user,
            status='pending',
        ).first()
        if incoming is not None:
            incoming.status = 'accepted'
            incoming.responded_at = timezone.now()
            incoming.save(update_fields=['status', 'responded_at'])
            Follow.objects.get_or_create(follower=request.user, following_id=target_user_id)
            Follow.objects.get_or_create(follower_id=target_user_id, following=request.user)
            matched = True
        else:
            FriendRequest.objects.get_or_create(
                sender=request.user,
                recipient_id=target_user_id,
                defaults={'status': 'pending'},
            )

    swipes_remaining = (
        'unlimited' if profile.is_vip else max(0, 10 - profile.daily_swipes_count)
    )
    return Response(
        {'success': True, 'swipes_remaining': swipes_remaining, 'matched': matched},
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def tmdb_person_search(request):
    """Search TMDB people for actor/director pickers."""
    query = (request.GET.get('q') or '').strip()
    if not query:
        return Response([], status=status.HTTP_200_OK)

    data = make_tmdb_request('/search/person', {
        'query': query,
        'include_adult': 'false',
    })
    results = data.get('results', []) if isinstance(data, dict) else []

    return Response([
        {
            'id': person.get('id'),
            'name': person.get('name', ''),
            'profile_path': person.get('profile_path'),
            'known_for_department': person.get('known_for_department', ''),
        }
        for person in results[:20]
    ], status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def tmdb_person_details(request, person_id):
    """Fetch a TMDB person for favorite director/actor cards."""
    data = make_tmdb_request(f'/person/{person_id}')
    if not isinstance(data, dict) or data.get('error') or not data.get('id'):
        return Response({'error': 'Person not found'}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        'id': data.get('id'),
        'name': data.get('name', ''),
        'profile_path': data.get('profile_path'),
        'known_for_department': data.get('known_for_department', ''),
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def tmdb_movie_posters(request, movie_id):
    """Return alternative posters for a movie."""
    data = make_tmdb_request(f'/movie/{movie_id}/images')
    posters = data.get('posters', []) if isinstance(data, dict) else []

    return Response([
        {
            'file_path': poster.get('file_path'),
            'aspect_ratio': poster.get('aspect_ratio'),
        }
        for poster in posters
        if poster.get('file_path')
    ], status=status.HTTP_200_OK)


DEFAULT_COMMUNITIES = [
    {
        'slug': 'nolan-universe',
        'name': 'Nolan Universe',
        'description': 'Time loops, practical effects, and IMAX obsession.',
        'genre_tag': 'Sci-Fi',
    },
    {
        'slug': 'a24-horror-vault',
        'name': 'A24 Horror Vault',
        'description': 'Slow-burn dread, folk horror, and everything A24.',
        'genre_tag': 'Horror',
    },
    {
        'slug': 'desi-cinema-club',
        'name': 'Desi Cinema Club',
        'description': 'Lollywood, Bollywood, and regional gems.',
        'genre_tag': 'South Asian',
    },
    {
        'slug': 'criterion-corner',
        'name': 'Criterion Corner',
        'description': 'Classics, restorations, and arthouse deep cuts.',
        'genre_tag': 'Classics',
    },
]


def ensure_default_communities():
    for data in DEFAULT_COMMUNITIES:
        MovieCircle.objects.get_or_create(slug=data['slug'], defaults={
            'name': data['name'],
            'description': data['description'],
            'genre_tag': data['genre_tag'],
        })


def _sender_card(user):
    profile = getattr(user, 'profile', None)
    return {
        'username': user.username,
        'display_name': (profile.display_name if profile else '') or user.username,
        'avatar_url': profile.avatar_url if profile else '',
        'is_founding_member': bool(profile and profile.is_founding_member),
        'is_vip': bool(profile and profile.is_vip),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def community_list(request):
    """List all communities with member counts."""
    circles = (
        MovieCircle.objects
        .annotate(member_count=Count('memberships', distinct=True))
        .order_by('name')
    )
    member_ids = set(
        CircleMembership.objects
        .filter(user=request.user)
        .values_list('circle_id', flat=True)
    )

    return Response([
        _circle_card(circle, request.user, circle.id in member_ids)
        for circle in circles
    ], status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def community_messages(request, slug):
    """Paginated chat history for a community room."""
    circle = MovieCircle.objects.filter(slug=slug).first()
    if circle is None:
        return Response({'error': 'Community not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        page_number = max(1, int(request.GET.get('page', 1)))
    except (TypeError, ValueError):
        page_number = 1
    try:
        page_size = min(max(1, int(request.GET.get('page_size', 30))), 100)
    except (TypeError, ValueError):
        page_size = 30

    messages = (
        CircleMessage.objects
        .filter(circle=circle)
        .select_related('sender', 'sender__profile')
        .order_by('created_at')
    )
    paginator = Paginator(messages, page_size)
    page = paginator.get_page(page_number)

    return Response({
        'count': paginator.count,
        'page': page.number,
        'pages': paginator.num_pages,
        'results': [
            {
                'id': message.id,
                'created_at': message.created_at.isoformat(),
                **_sender_card(message.sender),
                'message': message.message,
                'tmdb_id': message.tmdb_id,
                'media_type': message.media_type,
            }
            for message in page.object_list
        ],
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dm_inbox(request):
    """Distinct recent conversations for the current user."""
    messages = (
        DirectMessage.objects
        .filter(Q(sender=request.user) | Q(recipient=request.user))
        .select_related('sender', 'recipient', 'sender__profile', 'recipient__profile')
        .order_by('-created_at')
    )

    unread_counts = {
        row['sender_id']: row['count']
        for row in DirectMessage.objects
        .filter(recipient=request.user, is_read=False)
        .values('sender_id')
        .annotate(count=Count('id'))
    }
    matches = {
        match.user_b_id: match.match_percentage
        for match in TasteMatch.objects.filter(user_a=request.user)
    }

    conversations = []
    seen = set()
    for message in messages:
        partner = message.recipient if message.sender_id == request.user.id else message.sender
        if partner.id in seen:
            continue
        seen.add(partner.id)
        conversations.append({
            'user': {
                'id': partner.id,
                **_sender_card(partner),
            },
            'match_percentage': matches.get(partner.id, 50),
            'last_message': message.message,
            'last_message_at': message.created_at.isoformat(),
            'last_message_is_mine': message.sender_id == request.user.id,
            'unread_count': unread_counts.get(partner.id, 0),
        })

    return Response(conversations, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dm_history(request, target_user_id):
    """Full conversation between request.user and target user."""
    try:
        partner = User.objects.get(pk=target_user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if partner.id == request.user.id:
        return Response({'error': 'Cannot message yourself'}, status=status.HTTP_400_BAD_REQUEST)

    queryset = (
        DirectMessage.objects
        .filter(
            Q(sender=request.user, recipient=partner)
            | Q(sender=partner, recipient=request.user)
        )
        .select_related('sender', 'sender__profile')
        .order_by('created_at')
    )

    DirectMessage.objects.filter(
        sender=partner, recipient=request.user, is_read=False
    ).update(is_read=True)

    return Response([
        {
            'id': message.id,
            'sender_id': message.sender_id,
            'sender_username': message.sender.username,
            'sender_avatar': _sender_card(message.sender)['avatar_url'],
            'message': message.message,
            'tmdb_id': message.tmdb_id,
            'media_type': message.media_type,
            'is_read': True if message.sender_id == partner.id else message.is_read,
            'created_at': message.created_at.isoformat(),
        }
        for message in queryset
    ], status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vip_checkout(request):
    """Simulated VIP checkout. Grants VIP server-side after basic validation."""
    plan = request.data.get('plan', 'monthly')
    if plan not in ('monthly', 'yearly'):
        return Response(
            {'error': 'Invalid plan.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment_method = (request.data.get('payment_method') or 'demo').strip()
    if not payment_method:
        return Response(
            {'error': 'Payment method required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if profile.is_vip:
        return Response({
            'success': True,
            'is_vip': True,
            'plan': plan,
            'message': 'You are already a VIP member.',
        }, status=status.HTTP_200_OK)

    profile.is_vip = True
    profile.save(update_fields=['is_vip'])

    return Response({
        'success': True,
        'is_vip': True,
        'plan': plan,
        'message': 'Welcome to Madflix VIP.',
    }, status=status.HTTP_200_OK)


def _notification_actor(user):
    profile = getattr(user, 'profile', None)
    return {
        'id': user.id,
        'username': user.username,
        'display_name': (profile.display_name if profile else '') or user.username,
        'avatar_url': profile.avatar_url if profile else '',
        'is_founding_member': bool(profile and profile.is_founding_member),
        'is_vip': bool(profile and profile.is_vip),
    }


def _media_link(log):
    prefix = 'show' if log.media_type == 'tv' else 'movie'
    return f'/{prefix}/{log.tmdb_id}'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_feed(request):
    """Recent activity involving the current user (follows, likes, replies, clips)."""
    try:
        limit = min(max(1, int(request.GET.get('limit', 30))), 100)
    except (TypeError, ValueError):
        limit = 30

    items = []

    pending_requests = (
        FriendRequest.objects
        .filter(recipient=request.user, status='pending')
        .select_related('sender', 'sender__profile')
        .order_by('-created_at')[:limit]
    )
    for friend_request in pending_requests:
        items.append({
            'id': f'friend-request-{friend_request.id}',
            'type': 'friend_request',
            'request_id': friend_request.id,
            'actor': _notification_actor(friend_request.sender),
            'message': 'sent you a friend request',
            'link': f'/user/{friend_request.sender.username}',
            'created_at': friend_request.created_at.isoformat(),
        })

    follows = (
        Follow.objects
        .filter(following=request.user)
        .select_related('follower', 'follower__profile')
        .order_by('-created_at')[:limit]
    )
    for follow in follows:
        items.append({
            'id': f'follow-{follow.id}',
            'type': 'follow',
            'actor': _notification_actor(follow.follower),
            'message': 'started following you',
            'link': f'/user/{follow.follower.username}',
            'created_at': follow.created_at.isoformat(),
        })

    diary_likes = (
        DiaryLike.objects
        .filter(movielog__user=request.user)
        .exclude(user=request.user)
        .select_related('user', 'user__profile', 'movielog')
        .order_by('-created_at')[:limit]
    )
    for like in diary_likes:
        items.append({
            'id': f'diary-like-{like.id}',
            'type': 'like',
            'actor': _notification_actor(like.user),
            'message': 'liked your review',
            'link': _media_link(like.movielog),
            'created_at': like.created_at.isoformat(),
        })

    replies = (
        ReviewReply.objects
        .filter(log__user=request.user)
        .exclude(user=request.user)
        .select_related('user', 'user__profile', 'log')
        .order_by('-created_at')[:limit]
    )
    for reply in replies:
        items.append({
            'id': f'reply-{reply.id}',
            'type': 'reply',
            'actor': _notification_actor(reply.user),
            'message': 'replied to your review',
            'link': _media_link(reply.log),
            'created_at': reply.created_at.isoformat(),
        })

    reply_likes = (
        ReviewReplyLike.objects
        .filter(reply__user=request.user)
        .exclude(user=request.user)
        .select_related('user', 'user__profile', 'reply__log')
        .order_by('-created_at')[:limit]
    )
    for like in reply_likes:
        items.append({
            'id': f'reply-like-{like.id}',
            'type': 'like',
            'actor': _notification_actor(like.user),
            'message': 'liked your reply',
            'link': _media_link(like.reply.log),
            'created_at': like.created_at.isoformat(),
        })

    clip_likes = (
        ClipLike.objects
        .filter(clip__user=request.user)
        .exclude(user=request.user)
        .select_related('user', 'user__profile', 'clip')
        .order_by('-created_at')[:limit]
    )
    for like in clip_likes:
        items.append({
            'id': f'clip-like-{like.id}',
            'type': 'like',
            'actor': _notification_actor(like.user),
            'message': 'liked your clip',
            'link': f'/clips/{like.clip_id}',
            'created_at': like.created_at.isoformat(),
        })

    clip_comments = (
        ClipComment.objects
        .filter(clip__user=request.user)
        .exclude(user=request.user)
        .select_related('user', 'user__profile', 'clip')
        .order_by('-created_at')[:limit]
    )
    for comment in clip_comments:
        items.append({
            'id': f'clip-comment-{comment.id}',
            'type': 'comment',
            'actor': _notification_actor(comment.user),
            'message': 'commented on your clip',
            'link': f'/clips/{comment.clip_id}',
            'created_at': comment.created_at.isoformat(),
        })

    items.sort(key=lambda item: item['created_at'], reverse=True)

    return Response({
        'count': len(items),
        'results': items[:limit],
    }, status=status.HTTP_200_OK)


def _circle_owner_card(circle):
    owner = circle.owner
    if owner is None:
        return None
    profile = getattr(owner, 'profile', None)
    return {
        'id': owner.id,
        'username': owner.username,
        'display_name': (profile.display_name if profile else '') or owner.username,
        'avatar_url': profile.avatar_url if profile else '',
    }


def _circle_card(circle, user, is_member):
    return {
        'id': circle.id,
        'name': circle.name,
        'slug': circle.slug,
        'description': circle.description,
        'genre_tag': circle.genre_tag,
        'image_url': circle.cover_image or '',
        'cover_image': circle.cover_image or '',
        'member_count': getattr(circle, 'member_count', circle.memberships.count()),
        'is_member': is_member,
        'owner': _circle_owner_card(circle),
        'is_owner': bool(circle.owner_id and circle.owner_id == user.id),
    }


def _save_community_cover(upload, slug):
    if upload is None:
        return None
    if upload.size > 8 * 1024 * 1024:
        return None
    content_type = getattr(upload, 'content_type', '') or ''
    if not content_type.startswith('image/'):
        return None
    extension = os.path.splitext(upload.name)[1].lower()
    if extension not in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
        extension = '.jpg'
    path = default_storage.save(
        f'community_covers/{slug}_{int(time.time())}{extension}',
        upload,
    )
    return default_storage.url(path)


def _circle_members(circle, limit=60):
    memberships = (
        circle.memberships
        .select_related('user__profile')
        .order_by('joined_at')[:limit]
    )
    return [
        {
            **_notification_actor(membership.user),
            'is_owner': membership.user_id == circle.owner_id,
            'joined_at': membership.joined_at.isoformat(),
        }
        for membership in memberships
    ]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def community_create(request):
    """Create an open community group; the creator becomes its admin."""
    name = (request.data.get('name') or request.data.get('title') or '').strip()
    about = (request.data.get('description') or request.data.get('about') or '').strip()
    genre_tag = (request.data.get('genre_tag') or request.data.get('genre') or 'General').strip()

    if len(name) < 3:
        return Response({'error': 'Title must be at least 3 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(name) > 100:
        return Response({'error': 'Title must be 100 characters or fewer.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(about) > 500:
        return Response({'error': 'About must be 500 characters or fewer.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(genre_tag) > 50:
        return Response({'error': 'Genre must be 50 characters or fewer.'}, status=status.HTTP_400_BAD_REQUEST)

    base_slug = slugify(name)[:50] or 'community'
    slug = base_slug
    suffix = 2
    while MovieCircle.objects.filter(slug=slug).exists():
        slug = f'{base_slug}-{suffix}'
        suffix += 1

    circle = MovieCircle.objects.create(
        name=name,
        slug=slug,
        description=about,
        genre_tag=genre_tag or 'General',
        owner=request.user,
    )
    CircleMembership.objects.get_or_create(circle=circle, user=request.user)

    cover = request.FILES.get('cover')
    if cover is not None:
        cover_url = _save_community_cover(cover, circle.slug)
        if cover_url:
            circle.cover_image = cover_url
            circle.save(update_fields=['cover_image'])

    return Response(
        _circle_card(circle, request.user, True),
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def community_join(request, slug):
    """Join an open community group."""
    circle = MovieCircle.objects.filter(slug=slug).first()
    if circle is None:
        return Response({'error': 'Community not found'}, status=status.HTTP_404_NOT_FOUND)

    membership, created = CircleMembership.objects.get_or_create(
        circle=circle,
        user=request.user,
    )

    return Response({
        'success': True,
        'joined': created,
        'slug': circle.slug,
        'name': circle.name,
        'member_count': circle.memberships.count(),
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_groups(request):
    """Communities the current user has joined, for the DM groups section."""
    circles = (
        MovieCircle.objects
        .filter(memberships__user=request.user)
        .annotate(member_count=Count('memberships', distinct=True))
        .order_by('name')
    )

    data = []
    for circle in circles:
        last = circle.messages.select_related('sender').order_by('-created_at').first()
        data.append({
            'id': circle.id,
            'name': circle.name,
            'slug': circle.slug,
            'description': circle.description,
            'genre_tag': circle.genre_tag,
            'member_count': circle.member_count,
            'last_message': last.message if last else '',
            'last_message_at': last.created_at.isoformat() if last else '',
            'last_sender': last.sender.username if last else '',
            'owner': _circle_owner_card(circle),
            'is_owner': bool(circle.owner_id and circle.owner_id == request.user.id),
        })
    return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def community_detail(request, slug):
    """Community about page data: description, admin, members."""
    circle = MovieCircle.objects.select_related('owner__profile').filter(slug=slug).first()
    if circle is None:
        return Response({'error': 'Community not found'}, status=status.HTTP_404_NOT_FOUND)

    is_member = CircleMembership.objects.filter(circle=circle, user=request.user).exists()
    data = _circle_card(circle, request.user, is_member)
    data['members'] = _circle_members(circle)
    data['member_count'] = circle.memberships.count()
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def community_cover_update(request, slug):
    """Admin-only cover image update."""
    circle = MovieCircle.objects.filter(slug=slug).first()
    if circle is None:
        return Response({'error': 'Community not found'}, status=status.HTTP_404_NOT_FOUND)
    if circle.owner_id != request.user.id and not request.user.is_staff:
        return Response({'error': 'Only the community admin can change the cover.'}, status=status.HTTP_403_FORBIDDEN)

    upload = request.FILES.get('cover')
    if upload is None:
        return Response({'error': 'No cover image provided.'}, status=status.HTTP_400_BAD_REQUEST)

    cover_url = _save_community_cover(upload, circle.slug)
    if not cover_url:
        return Response({'error': 'Cover must be an image up to 8MB.'}, status=status.HTTP_400_BAD_REQUEST)

    circle.cover_image = cover_url
    circle.save(update_fields=['cover_image'])
    return Response({'success': True, 'cover_image': cover_url}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def community_leave(request, slug):
    circle = MovieCircle.objects.filter(slug=slug).first()
    if circle is None:
        return Response({'error': 'Community not found'}, status=status.HTTP_404_NOT_FOUND)
    if circle.owner_id == request.user.id:
        return Response(
            {'error': 'Admins must delete the community instead of leaving.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    CircleMembership.objects.filter(circle=circle, user=request.user).delete()
    return Response({'success': True}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def community_delete(request, slug):
    circle = MovieCircle.objects.filter(slug=slug).first()
    if circle is None:
        return Response({'error': 'Community not found'}, status=status.HTTP_404_NOT_FOUND)
    if circle.owner_id != request.user.id and not request.user.is_staff:
        return Response(
            {'error': 'Only the community admin can delete it.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    circle.delete()
    return Response({'success': True}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def friend_request_accept(request, request_id):
    friend_request = FriendRequest.objects.filter(
        id=request_id, recipient=request.user, status='pending'
    ).select_related('sender').first()
    if friend_request is None:
        return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

    friend_request.status = 'accepted'
    friend_request.responded_at = timezone.now()
    friend_request.save(update_fields=['status', 'responded_at'])

    Follow.objects.get_or_create(follower=request.user, following=friend_request.sender)
    Follow.objects.get_or_create(follower=friend_request.sender, following=request.user)

    return Response({
        'success': True,
        'status': 'accepted',
        'user': _notification_actor(friend_request.sender),
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def friend_request_decline(request, request_id):
    friend_request = FriendRequest.objects.filter(
        id=request_id, recipient=request.user, status='pending'
    ).first()
    if friend_request is None:
        return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

    friend_request.delete()
    return Response({'success': True}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def friend_request_send(request, username):
    """Send a friend request by username (used by suggested people)."""
    try:
        target = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if target.id == request.user.id:
        return Response({'error': 'Cannot add yourself.'}, status=status.HTTP_400_BAD_REQUEST)

    incoming = FriendRequest.objects.filter(
        sender=target, recipient=request.user
    ).first()
    if incoming and incoming.status == 'accepted':
        return Response({'success': True, 'status': 'friends'}, status=status.HTTP_200_OK)
    if incoming and incoming.status == 'pending':
        incoming.status = 'accepted'
        incoming.responded_at = timezone.now()
        incoming.save(update_fields=['status', 'responded_at'])
        Follow.objects.get_or_create(follower=request.user, following=target)
        Follow.objects.get_or_create(follower=target, following=request.user)
        return Response({'success': True, 'status': 'friends'}, status=status.HTTP_200_OK)

    outgoing = FriendRequest.objects.filter(
        sender=request.user, recipient=target
    ).first()
    if outgoing:
        return Response({
            'success': True,
            'status': 'friends' if outgoing.status == 'accepted' else 'requested',
        }, status=status.HTTP_200_OK)

    FriendRequest.objects.create(
        sender=request.user,
        recipient=target,
        status='pending',
    )
    return Response({'success': True, 'status': 'requested'}, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def friend_remove(request, username):
    """Remove an accepted friendship and mutual follows."""
    try:
        target = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    FriendRequest.objects.filter(
        Q(sender=request.user, recipient=target) | Q(sender=target, recipient=request.user)
    ).delete()
    Follow.objects.filter(
        Q(follower=request.user, following=target) | Q(follower=target, following=request.user)
    ).delete()

    return Response({'success': True, 'status': 'none'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_report(request, username):
    try:
        target = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if target.id == request.user.id:
        return Response({'error': 'You cannot report yourself.'}, status=status.HTTP_400_BAD_REQUEST)

    reason = request.data.get('reason')
    valid_reasons = {choice[0] for choice in UserReport.REASON_CHOICES}
    if reason not in valid_reasons:
        return Response({'error': 'Choose a valid reason.'}, status=status.HTTP_400_BAD_REQUEST)

    detail = (request.data.get('detail') or '').strip()
    if len(detail) > 1000:
        return Response({'error': 'Details must be 1000 characters or fewer.'}, status=status.HTTP_400_BAD_REQUEST)

    report, _ = UserReport.objects.update_or_create(
        reporter=request.user,
        reported=target,
        defaults={'reason': reason, 'detail': detail, 'resolved': False},
    )
    return Response({'success': True, 'report_id': report.id}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def letterboxd_import(request):
    """Import diary, ratings, reviews, profile and watchlist from a Letterboxd ZIP."""
    import zipfile

    from .letterboxd import import_letterboxd_zip

    upload = request.FILES.get('file') or request.FILES.get('zip')
    if upload is None:
        return Response({'error': 'Upload your Letterboxd ZIP file.'}, status=status.HTTP_400_BAD_REQUEST)
    if not upload.name.lower().endswith('.zip'):
        return Response({'error': 'Please upload the .zip export from Letterboxd.'}, status=status.HTTP_400_BAD_REQUEST)
    if upload.size > 20 * 1024 * 1024:
        return Response({'error': 'ZIP must be 20MB or smaller.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        stats = import_letterboxd_zip(request.user, upload)
    except zipfile.BadZipFile:
        return Response({'error': 'That file is not a valid ZIP archive.'}, status=status.HTTP_400_BAD_REQUEST)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response(
            {'error': 'Import failed while reading the export. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({
        'success': True,
        'imported': stats,
        'message': (
            f"Imported {stats['logs_created']} new diary entries, "
            f"updated {stats['logs_updated']}, and added {stats['watchlist_added']} watchlist titles."
        ),
    }, status=status.HTTP_200_OK)
