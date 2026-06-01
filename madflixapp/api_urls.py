from django.urls import path, include
from . import api_views

# API URL patterns - organized by functionality
urlpatterns = [
    # =============================================================================
    # HOME AND GENERAL ENDPOINTS
    # =============================================================================
    path('', api_views.api_endpoints_list, name='api-endpoints-list'),
    path('endpoints/', api_views.api_endpoints_list, name='api-endpoints-list'),
    path('home/', api_views.api_home_data, name='api-home-data'),

    # =============================================================================
    # MOVIE ENDPOINTS
    # =============================================================================
    # General movie data
    path('movies/', api_views.api_movies_data, name='api-movies-data'),
    path('movies/trending/', api_views.api_movie_trending, name='api-movie-trending'),
    path('movies/popular/', api_views.api_movie_popular, name='api-movie-popular'),
    path('movies/top-rated/', api_views.api_movie_top_rated, name='api-movie-top-rated'),
    path('movies/upcoming/', api_views.api_movie_upcoming, name='api-movie-upcoming'),
    path('movies/now-playing/', api_views.api_movie_now_playing, name='api-movie-now-playing'),

    # Movie search and details
    path('movies/search/', api_views.api_movie_search, name='api-movie-search'),
    path('movies/<int:movie_id>/', api_views.api_movie_details, name='api-movie-details'),
    path('movies/genre/', api_views.api_movies_by_genre, name='api-movies-by-genre'),

    # =============================================================================
    # TV SHOWS ENDPOINTS
    # =============================================================================
    # General TV show data
    path('shows/', api_views.api_shows_data, name='api-shows-data'),
    path('shows/trending/', api_views.api_show_trending, name='api-show-trending'),
    path('shows/popular/', api_views.api_show_popular, name='api-show-popular'),
    path('shows/top-rated/', api_views.api_show_top_rated, name='api-show-top-rated'),
    path('shows/airing-today/', api_views.api_show_airing_today, name='api-show-airing-today'),
    path('shows/on-the-air/', api_views.api_show_on_the_air, name='api-show-on-the-air'),

    # TV show search and details
    path('shows/search/', api_views.api_show_search, name='api-show-search'),
    path('shows/<int:show_id>/', api_views.api_show_details, name='api-show-details'),
    path('shows/genre/', api_views.api_shows_by_genre, name='api-shows-by-genre'),

    # Season and episode details
    path('shows/<int:show_id>/season/<int:season_number>/', api_views.api_season_details, name='api-season-details'),
    path('shows/<int:show_id>/season/<int:season_number>/episode/<int:episode_number>/', api_views.api_episode_details, name='api-episode-details'),

    # =============================================================================
    # GENRE ENDPOINTS
    # =============================================================================
    path('genres/', api_views.api_all_genres, name='api-all-genres'),
    path('genres/movies/', api_views.api_movie_genres, name='api-movie-genres'),
    path('genres/shows/', api_views.api_show_genres, name='api-show-genres'),

    # =============================================================================
    # UTILITY ENDPOINTS
    # =============================================================================
    path('search/', api_views.api_multi_search, name='api-multi-search'),
    path('config/', api_views.api_configuration, name='api-configuration'),
]
