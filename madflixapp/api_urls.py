from django.urls import path, include
from . import api_views
from . import auth_views
from . import user_views
from . import admin_views

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
    path('movies/<int:movie_id>/watch-providers/', api_views.api_movie_watch_providers, name='api-movie-watch-providers'),
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
    path('shows/<int:show_id>/watch-providers/', api_views.api_show_watch_providers, name='api-show-watch-providers'),
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

    # =============================================================================
    # AUTH ENDPOINTS
    # =============================================================================
    path('auth/register/', auth_views.register_view, name='auth-register'),
    path('auth/login/', auth_views.login_view, name='auth-login'),
    path('auth/logout/', auth_views.logout_view, name='auth-logout'),
    path('auth/me/', auth_views.me_view, name='auth-me'),
    path('auth/profile/', auth_views.profile_update_view, name='auth-profile'),

    # =============================================================================
    # USER ENDPOINTS (Watchlist, History, Sessions)
    # =============================================================================
    path('watchlist/', user_views.watchlist_list, name='watchlist-list'),
    path('watchlist/add/', user_views.watchlist_add, name='watchlist-add'),
    path('watchlist/check/', user_views.watchlist_check, name='watchlist-check'),
    path('watchlist/<int:item_id>/', user_views.watchlist_remove, name='watchlist-remove'),

    path('history/', user_views.history_list, name='history-list'),
    path('history/add/', user_views.history_add, name='history-add'),
    path('history/latest/', user_views.history_latest, name='history-latest'),
    path('history/mark-watched/', user_views.mark_as_watched, name='history-mark-watched'),
    path('history/check-watched/', user_views.check_watched, name='history-check-watched'),
    path('continue-watching/', user_views.continue_watching, name='continue-watching'),

    path('sessions/create/', user_views.session_create, name='session-create'),
    path('sessions/<int:session_id>/update/', user_views.session_update, name='session-update'),
    path('sessions/resume/', user_views.session_resume, name='session-resume'),

    # =============================================================================
    # ADMIN ENDPOINTS
    # =============================================================================
    path('admin/stats/', admin_views.admin_stats, name='admin-stats'),
    path('admin/activity/', admin_views.admin_activity, name='admin-activity'),
    path('admin/users/', admin_views.admin_users, name='admin-users'),
    path('admin/top-content/', admin_views.admin_top_content, name='admin-top-content'),
    path('admin/live/', admin_views.admin_live, name='admin-live'),
    path('admin/searches/', admin_views.admin_searches, name='admin-searches'),
    path('admin/search-stats/', admin_views.admin_search_stats, name='admin-search-stats'),
    path('admin/banned-ips/', admin_views.admin_banned_ips, name='admin-banned-ips'),
    path('admin/ban-ip/', admin_views.admin_ban_ip, name='admin-ban-ip'),
    path('admin/unban-ip/<int:ban_id>/', admin_views.admin_unban_ip, name='admin-unban-ip'),
]
