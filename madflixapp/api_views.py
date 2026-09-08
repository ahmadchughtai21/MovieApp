from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.core.cache import cache
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
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

    try:
        url = f"{TMDB_BASE_URL}{endpoint}"
        if params is None:
            params = {}
        params['api_key'] = TMDB_API_KEY

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        cache.set(cache_key, data, 300)  # Cache for 5 minutes
        return data
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}

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
