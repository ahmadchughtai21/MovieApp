from django.urls import path, include
from . import api_views
from . import auth_views
from . import user_views
from . import admin_views
from . import clip_views

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
    path('admin/moderation/', admin_views.admin_moderation, name='admin-moderation'),
    path('admin/reports/<int:report_id>/resolve/', admin_views.admin_report_resolve, name='admin-report-resolve'),
    path('admin/clips/<int:clip_id>/', admin_views.admin_delete_clip, name='admin-clip-delete'),
    path('admin/comments/<int:comment_id>/', admin_views.admin_delete_comment, name='admin-comment-delete'),
    path('admin/replies/<int:reply_id>/', admin_views.admin_delete_reply, name='admin-reply-delete'),

    # =============================================================================
    # RECOMMENDATIONS ENDPOINTS
    # =============================================================================
    path('recommendations/', api_views.api_recommendations, name='api-recommendations'),
    path('recommendations/for-movie/<int:movie_id>/', api_views.api_movie_recommendations, name='api-movie-recommendations'),
    path('recommendations/for-show/<int:show_id>/', api_views.api_show_recommendations, name='api-show-recommendations'),

    # =============================================================================
    # MOVIE LOGS (Rating + Watch tracking)
    # =============================================================================
    path('logs/', user_views.log_list, name='log-list'),
    path('logs/add/', user_views.log_create, name='log-create'),
    path('logs/<int:log_id>/', user_views.log_delete, name='log-delete'),
    path('logs/for-movie/<int:tmdb_id>/', user_views.log_for_movie, name='log-for-movie'),
    path('logs/for-user/<str:username>/', user_views.log_for_user, name='log-for-user'),
    path('logs/stats/<int:tmdb_id>/', user_views.log_stats, name='log-stats'),
    path('logs/<int:log_id>/like/', user_views.like_toggle, name='log-like-toggle'),
    path('logs/<int:log_id>/replies/', user_views.review_replies, name='review-replies'),
    path('logs/<int:log_id>/replies/create/', user_views.review_reply_create, name='review-reply-create'),
    path('logs/<int:log_id>/replies/<int:reply_id>/delete/', user_views.review_reply_delete, name='review-reply-delete'),
    path('logs/<int:log_id>/replies/<int:reply_id>/like/', user_views.review_reply_like_toggle, name='review-reply-like'),

    # =============================================================================
    # PUBLIC PROFILES
    # =============================================================================
    path('profile/<str:username>/', user_views.public_profile, name='public-profile'),
    path('profile/<str:username>/followers/', user_views.profile_followers, name='profile-followers'),
    path('profile/<str:username>/following/', user_views.profile_following, name='profile-following'),

    # =============================================================================
    # SOCIAL: FOLLOWS + FEED
    # =============================================================================
    path('follow/<str:username>/', user_views.follow_toggle, name='follow-toggle'),
    path('feed/', user_views.feed, name='feed'),
    path('users/suggested/', user_views.suggested_users, name='suggested-users'),
    path('users/search/', user_views.search_users, name='user-search'),

    # =============================================================================
    # CLIPS ENDPOINTS
    # =============================================================================
    path('clips/', clip_views.clip_list, name='clip-list'),
    path('clips/create/', clip_views.clip_create, name='clip-create'),
    path('clips/<int:clip_id>/', clip_views.clip_detail, name='clip-detail'),
    path('clips/<int:clip_id>/delete/', clip_views.clip_delete, name='clip-delete'),
    path('clips/<int:clip_id>/update/', clip_views.clip_update, name='clip-update'),
    path('clips/<int:clip_id>/like/', clip_views.clip_like_toggle, name='clip-like-toggle'),
    path('clips/<int:clip_id>/comments/', clip_views.clip_comments, name='clip-comments'),
    path('clips/<int:clip_id>/comments/create/', clip_views.clip_comment_create, name='clip-comment-create'),
    path('clips/<int:clip_id>/comments/<int:comment_id>/delete/', clip_views.clip_comment_delete, name='clip-comment-delete'),
    path('clips/<int:clip_id>/report/', clip_views.clip_report, name='clip-report'),
]
