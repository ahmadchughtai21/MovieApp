from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=100, blank=True, default='')
    avatar_url = models.URLField(blank=True, default='')

    def __str__(self):
        return self.display_name or self.user.username


class Watchlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watchlist')
    tmdb_id = models.IntegerField()
    media_type = models.CharField(max_length=10)
    title = models.CharField(max_length=255, blank=True, default='')
    poster_path = models.CharField(max_length=255, blank=True, default='')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'tmdb_id', 'media_type')
        ordering = ['-added_at']

    def __str__(self):
        return f'{self.user.username} - {self.title or self.tmdb_id}'


class WatchHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watch_history')
    tmdb_id = models.IntegerField()
    media_type = models.CharField(max_length=10)
    title = models.CharField(max_length=255, blank=True, default='')
    poster_path = models.CharField(max_length=255, blank=True, default='')
    season = models.IntegerField(null=True, blank=True)
    episode = models.IntegerField(null=True, blank=True)
    progress_seconds = models.IntegerField(default=0)
    duration_seconds = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.user.username} - {self.title or self.tmdb_id}'


class PlaybackSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='playback_sessions')
    tmdb_id = models.IntegerField()
    media_type = models.CharField(max_length=10)
    title = models.CharField(max_length=255, blank=True, default='')
    poster_path = models.CharField(max_length=255, blank=True, default='')
    season = models.IntegerField(null=True, blank=True)
    episode = models.IntegerField(null=True, blank=True)
    position_seconds = models.IntegerField(default=0)
    duration_seconds = models.IntegerField(default=0)
    active = models.BooleanField(default=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True, default='')
    last_played = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-last_played']

    def __str__(self):
        return f'{self.user.username} - {self.title or self.tmdb_id}'


class SearchLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='search_logs')
    query = models.CharField(max_length=255)
    results_count = models.IntegerField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.query} ({self.results_count} results)'


class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=50)
    detail = models.CharField(max_length=255, blank=True, default='')
    tmdb_id = models.IntegerField(null=True, blank=True)
    media_type = models.CharField(max_length=10, blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.user} - {self.action}'


class BannedIP(models.Model):
    ip_address = models.GenericIPAddressField(unique=True)
    reason = models.CharField(max_length=255, blank=True, default='')
    banned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.ip_address
