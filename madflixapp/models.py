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


class MovieLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='movie_logs')
    tmdb_id = models.IntegerField()
    media_type = models.CharField(max_length=10, choices=[('movie', 'Movie'), ('tv', 'TV')])
    rating = models.DecimalField(null=True, blank=True, max_digits=2, decimal_places=1)
    review = models.TextField(blank=True, default='')
    watched_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'tmdb_id', 'media_type')
        ordering = ['-watched_date']

    def __str__(self):
        return f'{self.user.username} - {self.tmdb_id} ({self.media_type})'


class DiaryLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='diary_likes')
    movielog = models.ForeignKey(MovieLog, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'movielog')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} likes log {self.movielog_id}'


class ReviewReply(models.Model):
    log = models.ForeignKey(MovieLog, on_delete=models.CASCADE, related_name='replies')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='review_replies')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Reply by {self.user.username} on log {self.log_id}'


class ReviewReplyLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='review_reply_likes')
    reply = models.ForeignKey(ReviewReply, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'reply')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} likes reply {self.reply_id}'


class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.follower.username} follows {self.following.username}'


class HashTag(models.Model):
    name = models.CharField(max_length=100, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'#{self.name}'


class Clip(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clips')
    video = models.FileField(upload_to='clips/%Y/%m/')
    caption = models.TextField(blank=True, default='')
    tmdb_id = models.IntegerField(null=True, blank=True)
    media_type = models.CharField(max_length=10, blank=True, default='')
    media_title = models.CharField(max_length=200, blank=True, default='')
    duration_seconds = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    tags = models.ManyToManyField(HashTag, related_name='clips', blank=True)
    mentions = models.ManyToManyField(User, related_name='mentioned_in_clips', blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Clip {self.id} by {self.user.username}'


class ClipLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clip_likes')
    clip = models.ForeignKey(Clip, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'clip')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} likes clip {self.clip_id}'


class ClipComment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clip_comments')
    clip = models.ForeignKey(Clip, on_delete=models.CASCADE, related_name='comments')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Comment by {self.user.username} on clip {self.clip_id}'


class ClipReport(models.Model):
    REASON_CHOICES = [
        ('spam', 'Spam'),
        ('inappropriate', 'Inappropriate content'),
        ('copyright', 'Copyright violation'),
        ('harassment', 'Harassment'),
        ('other', 'Other'),
    ]
    clip = models.ForeignKey(Clip, on_delete=models.CASCADE, related_name='reports')
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clip_reports')
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    detail = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Report on clip {self.clip_id} by {self.reporter.username}'
