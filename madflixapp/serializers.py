from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile, Watchlist, WatchHistory, PlaybackSession, SearchLog, AuditLog, BannedIP
)


class GenreSerializer(serializers.Serializer):
    """Serializer for genre data"""
    id = serializers.IntegerField()
    name = serializers.CharField(max_length=100)

class MovieSearchSerializer(serializers.Serializer):
    """Serializer for movie search input"""
    query = serializers.CharField(max_length=255)
    page = serializers.IntegerField(default=1, min_value=1)

class TVSearchSerializer(serializers.Serializer):
    """Serializer for TV show search input"""
    query = serializers.CharField(max_length=255)
    page = serializers.IntegerField(default=1, min_value=1)

class MoviePlayerSerializer(serializers.Serializer):
    """Serializer for movie player data"""
    id = serializers.IntegerField()

class ShowPlayerSerializer(serializers.Serializer):
    """Serializer for show player data"""
    id = serializers.IntegerField()
    season = serializers.IntegerField(default=1, min_value=1)
    episode = serializers.IntegerField(default=1, min_value=1)

class GenreDiscoverSerializer(serializers.Serializer):
    """Serializer for genre-based discovery"""
    genre_id = serializers.IntegerField()
    page = serializers.IntegerField(default=1, min_value=1)


# =============================================================================
# USER / AUTH SERIALIZERS
# =============================================================================

class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'display_name', 'avatar_url', 'date_joined']

    def get_display_name(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.display_name
        return ''

    def get_avatar_url(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.avatar_url
        return ''


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, min_length=3)
    password = serializers.CharField(min_length=6, write_only=True)
    password2 = serializers.CharField(min_length=6, write_only=True)
    display_name = serializers.CharField(max_length=100, required=False, default='')
    email = serializers.EmailField(required=False, default='')

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already taken')
        return value

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match'})
        return data


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class ProfileUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    display_name = serializers.CharField(max_length=100, required=False)
    avatar_url = serializers.URLField(required=False)


# =============================================================================
# WATCHLIST SERIALIZERS
# =============================================================================

class WatchlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Watchlist
        fields = ['id', 'tmdb_id', 'media_type', 'title', 'poster_path', 'added_at']


class WatchlistCreateSerializer(serializers.Serializer):
    tmdb_id = serializers.IntegerField()
    media_type = serializers.ChoiceField(['movie', 'tv'])
    title = serializers.CharField(max_length=255, required=False, default='')
    poster_path = serializers.CharField(max_length=255, required=False, default='')


# =============================================================================
# WATCH HISTORY SERIALIZERS
# =============================================================================

class WatchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WatchHistory
        fields = [
            'id', 'tmdb_id', 'media_type', 'title', 'poster_path',
            'season', 'episode', 'progress_seconds', 'duration_seconds',
            'completed', 'timestamp'
        ]


class WatchHistoryCreateSerializer(serializers.Serializer):
    tmdb_id = serializers.IntegerField()
    media_type = serializers.ChoiceField(['movie', 'tv'])
    title = serializers.CharField(max_length=255, required=False, default='')
    poster_path = serializers.CharField(max_length=255, required=False, default='')
    season = serializers.IntegerField(required=False, allow_null=True)
    episode = serializers.IntegerField(required=False, allow_null=True)
    progress_seconds = serializers.IntegerField(default=0)
    duration_seconds = serializers.IntegerField(default=0)


# =============================================================================
# PLAYBACK SESSION SERIALIZERS
# =============================================================================

class PlaybackSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlaybackSession
        fields = [
            'id', 'tmdb_id', 'media_type', 'title', 'poster_path',
            'season', 'episode', 'position_seconds', 'duration_seconds',
            'active', 'last_played'
        ]


class PlaybackSessionCreateSerializer(serializers.Serializer):
    tmdb_id = serializers.IntegerField()
    media_type = serializers.ChoiceField(['movie', 'tv'])
    title = serializers.CharField(max_length=255, required=False, default='')
    poster_path = serializers.CharField(max_length=255, required=False, default='')
    season = serializers.IntegerField(required=False, allow_null=True)
    episode = serializers.IntegerField(required=False, allow_null=True)
    position_seconds = serializers.IntegerField(default=0)
    duration_seconds = serializers.IntegerField(default=0)


class PlaybackSessionUpdateSerializer(serializers.Serializer):
    position_seconds = serializers.IntegerField(required=False)
    duration_seconds = serializers.IntegerField(required=False)
    active = serializers.BooleanField(required=False)
