from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile, Watchlist, WatchHistory, PlaybackSession, SearchLog, AuditLog, BannedIP, MovieLog, DiaryLike,
    ReviewReply, HashTag, Clip, ClipLike, ClipComment, ClipReport
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
    email = serializers.EmailField(required=False, allow_blank=True)
    display_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    avatar_url = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_avatar_url(self, value):
        if not value:
            return ''
        if value.startswith('/avatars/') and value.endswith('.svg') and '..' not in value:
            return value
        from urllib.parse import urlparse
        parsed = urlparse(value)
        if parsed.scheme in ('http', 'https') and parsed.netloc:
            return value
        raise serializers.ValidationError(
            'Avatar must be an http(s) URL or a built-in /avatars/*.svg path'
        )


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


# =============================================================================
# MOVIE LOG SERIALIZERS
# =============================================================================

class MovieLogSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = MovieLog
        fields = ['id', 'tmdb_id', 'media_type', 'rating', 'review', 'watched_date', 'created_at',
                  'username', 'display_name', 'avatar_url', 'like_count', 'liked_by_me', 'reply_count']

    def get_reply_count(self, obj):
        return obj.replies.count()

    def get_username(self, obj):
        return obj.user.username

    def get_display_name(self, obj):
        profile = getattr(obj.user, 'profile', None)
        return (profile.display_name if profile else '') or obj.user.username

    def get_avatar_url(self, obj):
        profile = getattr(obj.user, 'profile', None)
        return profile.avatar_url if profile else ''

    def get_like_count(self, obj):
        return obj.likes.count()

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False


class MovieLogCreateSerializer(serializers.Serializer):
    tmdb_id = serializers.IntegerField()
    media_type = serializers.ChoiceField(['movie', 'tv'])
    rating = serializers.DecimalField(max_digits=2, decimal_places=1, min_value=0.5, max_value=5, required=False, allow_null=True)
    review = serializers.CharField(required=False, allow_blank=True, default='')
    watched_date = serializers.DateField(required=False)


# =============================================================================
# CLIP SERIALIZERS
# =============================================================================

class HashTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = HashTag
        fields = ['id', 'name']


class UserBriefSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'avatar_url']

    def get_display_name(self, obj):
        profile = getattr(obj, 'profile', None)
        return (profile.display_name if profile else '') or obj.username

    def get_avatar_url(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.avatar_url if profile else ''


class ReviewReplySerializer(serializers.ModelSerializer):
    user = UserBriefSerializer(read_only=True)
    like_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = ReviewReply
        fields = ['id', 'user', 'body', 'created_at', 'like_count', 'liked_by_me']

    def get_like_count(self, obj):
        return obj.likes.count()

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False


class ReviewReplyCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=2000)


class ClipSerializer(serializers.ModelSerializer):
    user = UserBriefSerializer(read_only=True)
    tags = HashTagSerializer(many=True, read_only=True)
    mentions = UserBriefSerializer(many=True, read_only=True)
    like_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()

    class Meta:
        model = Clip
        fields = ['id', 'user', 'video_url', 'caption', 'tmdb_id', 'media_type', 'media_title',
                  'duration_seconds', 'created_at', 'tags', 'mentions', 'like_count', 'liked_by_me', 'comment_count']

    def get_like_count(self, obj):
        return obj.likes.count()

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_video_url(self, obj):
        request = self.context.get('request')
        if obj.video:
            return request.build_absolute_uri(obj.video.url) if request else obj.video.url
        return ''


class ClipCreateSerializer(serializers.Serializer):
    video = serializers.FileField()
    caption = serializers.CharField(required=False, allow_blank=True, default='')
    tmdb_id = serializers.IntegerField(required=False, allow_null=True)
    media_type = serializers.ChoiceField(['movie', 'tv'], required=False, default='')
    media_title = serializers.CharField(required=False, allow_blank=True, default='', max_length=200)

    def validate_video(self, value):
        if value.size > 150 * 1024 * 1024:
            raise serializers.ValidationError('Video file must be 150MB or less.')
        ext = value.name.split('.')[-1].lower()
        if ext not in ('mp4', 'mov', 'm4v', 'webm'):
            raise serializers.ValidationError('Video must be MP4, MOV, M4V, or WebM format.')
        return value


class ClipCommentSerializer(serializers.ModelSerializer):
    user = UserBriefSerializer(read_only=True)

    class Meta:
        model = ClipComment
        fields = ['id', 'user', 'body', 'created_at', 'updated_at']


class ClipCommentCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=2000)


class ClipReportSerializer(serializers.ModelSerializer):
    reporter = UserBriefSerializer(read_only=True)

    class Meta:
        model = ClipReport
        fields = ['id', 'reporter', 'reason', 'detail', 'created_at', 'resolved']


class ClipReportCreateSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(['spam', 'inappropriate', 'copyright', 'harassment', 'other'])
    detail = serializers.CharField(required=False, allow_blank=True, default='')
