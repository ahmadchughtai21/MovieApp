from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q
from django.utils import timezone
from .models import Watchlist, WatchHistory, PlaybackSession, AuditLog, SearchLog, MovieLog, DiaryLike, ReviewReply, ReviewReplyLike, Follow
from .serializers import (
    WatchlistSerializer, WatchlistCreateSerializer,
    WatchHistorySerializer, WatchHistoryCreateSerializer,
    PlaybackSessionSerializer, PlaybackSessionCreateSerializer,
    PlaybackSessionUpdateSerializer,
    MovieLogSerializer, MovieLogCreateSerializer,
    ReviewReplySerializer, ReviewReplyCreateSerializer,
)


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def get_user_agent(request):
    return request.META.get('HTTP_USER_AGENT', '')[:500]


# =============================================================================
# WATCHLIST
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def watchlist_list(request):
    items = Watchlist.objects.filter(user=request.user)
    media_type = request.GET.get('media_type')
    if media_type in ('movie', 'tv'):
        items = items.filter(media_type=media_type)
    return Response(WatchlistSerializer(items, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def watchlist_add(request):
    serializer = WatchlistCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    item, created = Watchlist.objects.get_or_create(
        user=request.user,
        tmdb_id=data['tmdb_id'],
        media_type=data['media_type'],
        defaults={
            'title': data.get('title', ''),
            'poster_path': data.get('poster_path', ''),
        },
    )

    if created:
        AuditLog.objects.create(
            user=request.user, action='watchlist_add',
            detail=data.get('title', '') or str(data['tmdb_id']),
            tmdb_id=data['tmdb_id'], media_type=data['media_type'],
            ip_address=get_client_ip(request),
        )

    return Response(
        WatchlistSerializer(item).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def watchlist_remove(request, item_id):
    try:
        item = Watchlist.objects.get(id=item_id, user=request.user)
        AuditLog.objects.create(
            user=request.user, action='watchlist_remove',
            detail=item.title or str(item.tmdb_id),
            tmdb_id=item.tmdb_id, media_type=item.media_type,
            ip_address=get_client_ip(request),
        )
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Watchlist.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def watchlist_check(request):
    tmdb_id = request.GET.get('tmdb_id')
    media_type = request.GET.get('media_type')
    if not tmdb_id or not media_type:
        return Response({'error': 'tmdb_id and media_type required'}, status=status.HTTP_400_BAD_REQUEST)

    in_watchlist = Watchlist.objects.filter(
        user=request.user, tmdb_id=int(tmdb_id), media_type=media_type
    ).exists()
    return Response({'in_watchlist': in_watchlist})


# =============================================================================
# WATCH HISTORY
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def history_list(request):
    items = WatchHistory.objects.filter(user=request.user)[:50]
    return Response(WatchHistorySerializer(items, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def history_add(request):
    serializer = WatchHistoryCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    item = WatchHistory.objects.create(
        user=request.user,
        tmdb_id=data['tmdb_id'],
        media_type=data['media_type'],
        title=data.get('title', ''),
        poster_path=data.get('poster_path', ''),
        season=data.get('season'),
        episode=data.get('episode'),
        progress_seconds=data.get('progress_seconds', 0),
        duration_seconds=data.get('duration_seconds', 0),
        ip_address=get_client_ip(request),
    )

    AuditLog.objects.create(
        user=request.user, action='watch',
        detail=data.get('title', '') or str(data['tmdb_id']),
        tmdb_id=data['tmdb_id'], media_type=data['media_type'],
        ip_address=get_client_ip(request),
    )

    return Response(WatchHistorySerializer(item).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def history_latest(request):
    """Get the most recent watch entry for each unique tmdb_id+media_type+season+episode combo."""
    seen = set()
    items = []
    for item in WatchHistory.objects.filter(user=request.user).order_by(
        'tmdb_id', 'media_type', 'season', 'episode', '-timestamp'
    ):
        key = (item.tmdb_id, item.media_type, item.season, item.episode)
        if key not in seen:
            seen.add(key)
            items.append(item)
        if len(items) >= 20:
            break
    return Response(WatchHistorySerializer(items, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_as_watched(request):
    """Toggle watched status for a movie/show."""
    tmdb_id = request.data.get('tmdb_id')
    media_type = request.data.get('media_type')
    season = request.data.get('season')
    episode = request.data.get('episode')
    completed = request.data.get('completed', True)

    if not tmdb_id or not media_type:
        return Response({'error': 'tmdb_id and media_type required'}, status=status.HTTP_400_BAD_REQUEST)

    updated = WatchHistory.objects.filter(
        user=request.user,
        tmdb_id=tmdb_id,
        media_type=media_type,
        season=season,
        episode=episode,
    ).update(completed=completed)

    if updated == 0 and completed:
        WatchHistory.objects.create(
            user=request.user,
            tmdb_id=tmdb_id,
            media_type=media_type,
            season=season,
            episode=episode,
            title=request.data.get('title', ''),
            poster_path=request.data.get('poster_path', ''),
            completed=True,
            ip_address=get_client_ip(request),
        )

    return Response({'ok': True, 'completed': completed})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_watched(request):
    """Check if a movie/show episode is marked as watched."""
    tmdb_id = request.GET.get('tmdb_id')
    media_type = request.GET.get('media_type')
    season = request.GET.get('season')
    episode = request.GET.get('episode')

    if not tmdb_id or not media_type:
        return Response({'error': 'tmdb_id and media_type required'}, status=status.HTTP_400_BAD_REQUEST)

    exists = WatchHistory.objects.filter(
        user=request.user,
        tmdb_id=tmdb_id,
        media_type=media_type,
        season=int(season) if season else None,
        episode=int(episode) if episode else None,
        completed=True,
    ).exists()

    return Response({'watched': exists})
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sessions_list(request):
    items = PlaybackSession.objects.filter(user=request.user, active=True)[:20]
    return Response(PlaybackSessionSerializer(items, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_create(request):
    serializer = PlaybackSessionCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    session, _ = PlaybackSession.objects.update_or_create(
        user=request.user,
        tmdb_id=data['tmdb_id'],
        media_type=data['media_type'],
        season=data.get('season'),
        episode=data.get('episode'),
        defaults={
            'title': data.get('title', ''),
            'poster_path': data.get('poster_path', ''),
            'position_seconds': data.get('position_seconds', 0),
            'duration_seconds': data.get('duration_seconds', 0),
            'ip_address': get_client_ip(request),
            'user_agent': get_user_agent(request),
            'active': True,
        },
    )

    AuditLog.objects.create(
        user=request.user, action='watch',
        detail=data.get('title', '') or str(data['tmdb_id']),
        tmdb_id=data['tmdb_id'], media_type=data['media_type'],
        ip_address=get_client_ip(request),
    )

    return Response(PlaybackSessionSerializer(session).data, status=status.HTTP_201_CREATED)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def session_update(request, session_id):
    try:
        session = PlaybackSession.objects.get(id=session_id, user=request.user)
    except PlaybackSession.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = PlaybackSessionUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    if 'position_seconds' in data:
        session.position_seconds = data['position_seconds']
    if 'duration_seconds' in data:
        session.duration_seconds = data['duration_seconds']
    if 'active' in data:
        session.active = data['active']
    session.save()

    return Response(PlaybackSessionSerializer(session).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_resume(request):
    """Get the most recent active session for a specific tmdb_id+media_type+season+episode."""
    tmdb_id = request.GET.get('tmdb_id')
    media_type = request.GET.get('media_type')
    season = request.GET.get('season')
    episode = request.GET.get('episode')

    if not tmdb_id or not media_type:
        return Response({'error': 'tmdb_id and media_type required'}, status=status.HTTP_400_BAD_REQUEST)

    qs = PlaybackSession.objects.filter(
        user=request.user, tmdb_id=int(tmdb_id), media_type=media_type
    )
    if season:
        qs = qs.filter(season=int(season))
    if episode:
        qs = qs.filter(episode=int(episode))

    session = qs.first()
    if session:
        return Response(PlaybackSessionSerializer(session).data)
    return Response({'active': False})


# =============================================================================
# CONTINUE WATCHING (for home page)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def continue_watching(request):
    """Get recently watched items (last 30 days) for the home page."""
    from django.utils import timezone
    from datetime import timedelta
    cutoff = timezone.now() - timedelta(days=30)

    seen = set()
    items = []
    for item in WatchHistory.objects.filter(
        user=request.user, timestamp__gte=cutoff, completed=False
    ).order_by('tmdb_id', 'media_type', 'season', 'episode', '-timestamp'):
        key = (item.tmdb_id, item.media_type, item.season, item.episode)
        if key not in seen:
            seen.add(key)
            items.append(item)
        if len(items) >= 12:
            break
    return Response(WatchHistorySerializer(items, many=True).data)


# =============================================================================
# MOVIE LOGS (Rating + Watch tracking)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def log_list(request):
    items = MovieLog.objects.filter(user=request.user).prefetch_related('likes', 'replies')
    media_type = request.GET.get('media_type')
    if media_type in ('movie', 'tv'):
        items = items.filter(media_type=media_type)
    return Response(MovieLogSerializer(items, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_create(request):
    serializer = MovieLogCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    log, created = MovieLog.objects.update_or_create(
        user=request.user,
        tmdb_id=data['tmdb_id'],
        media_type=data['media_type'],
        defaults={
            'rating': data.get('rating'),
            'review': data.get('review', ''),
            'watched_date': data.get('watched_date') or timezone.now().date(),
        },
    )
    AuditLog.objects.create(
        user=request.user, action='log',
        detail=f"{'Created' if created else 'Updated'} log for {data['tmdb_id']}",
        tmdb_id=data['tmdb_id'], media_type=data['media_type'],
        ip_address=get_client_ip(request),
    )
    return Response(
        MovieLogSerializer(log, context={'request': request}).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def log_delete(request, log_id):
    try:
        log = MovieLog.objects.get(id=log_id, user=request.user)
        log.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except MovieLog.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([AllowAny])
def log_for_movie(request, tmdb_id):
    logs = MovieLog.objects.filter(tmdb_id=tmdb_id).select_related('user').prefetch_related('likes', 'replies')
    media_type = request.GET.get('media_type')
    if media_type in ('movie', 'tv'):
        logs = logs.filter(media_type=media_type)
    return Response(MovieLogSerializer(logs[:50], many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def log_for_user(request, username):
    from django.contrib.auth.models import User as DjangoUser
    try:
        target_user = DjangoUser.objects.get(username=username)
    except DjangoUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    logs = MovieLog.objects.filter(user=target_user).select_related('user').prefetch_related('likes', 'replies')[:100]
    return Response(MovieLogSerializer(logs, many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def log_stats(request, tmdb_id):
    from django.db.models import Avg, Count as DCount
    stats = MovieLog.objects.filter(tmdb_id=tmdb_id).aggregate(
        avg_rating=Avg('rating'),
        total_logs=DCount('id'),
    )
    distribution = {}
    for i in range(1, 6):
        distribution[str(i)] = MovieLog.objects.filter(tmdb_id=tmdb_id, rating=i).count()
    stats['distribution'] = distribution
    return Response(stats)


# =============================================================================
# DIARY LIKES + PUBLIC PROFILES
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_toggle(request, log_id):
    """Toggle like on a diary entry. Returns {liked, like_count}."""
    try:
        log = MovieLog.objects.get(id=log_id)
    except MovieLog.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    existing = DiaryLike.objects.filter(user=request.user, movielog=log)
    if existing.exists():
        existing.delete()
        liked = False
    else:
        DiaryLike.objects.create(user=request.user, movielog=log)
        liked = True

    return Response({'liked': liked, 'like_count': log.likes.count()})


@api_view(['GET'])
@permission_classes([AllowAny])
def review_replies(request, log_id):
    """List replies for a review (diary entry)."""
    try:
        log = MovieLog.objects.get(id=log_id)
    except MovieLog.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    replies = log.replies.select_related('user__profile').prefetch_related('likes').all()
    return Response(ReviewReplySerializer(replies, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_reply_create(request, log_id):
    """Reply to a review (diary entry)."""
    try:
        log = MovieLog.objects.get(id=log_id)
    except MovieLog.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ReviewReplyCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    reply = ReviewReply.objects.create(
        user=request.user,
        log=log,
        body=serializer.validated_data['body'],
    )
    AuditLog.objects.create(
        user=request.user, action='reply',
        detail=reply.body[:100],
        tmdb_id=log.tmdb_id, media_type=log.media_type,
        ip_address=get_client_ip(request),
    )
    return Response(ReviewReplySerializer(reply, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_reply_like_toggle(request, log_id, reply_id):
    """Toggle like on a review reply. Returns {liked, like_count}."""
    try:
        reply = ReviewReply.objects.get(id=reply_id, log_id=log_id)
    except ReviewReply.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    existing = ReviewReplyLike.objects.filter(user=request.user, reply=reply)
    if existing.exists():
        existing.delete()
        liked = False
    else:
        ReviewReplyLike.objects.create(user=request.user, reply=reply)
        liked = True

    return Response({'liked': liked, 'like_count': reply.likes.count()})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def review_reply_delete(request, log_id, reply_id):
    """Delete your own reply to a review (staff may delete any)."""
    try:
        reply = ReviewReply.objects.get(id=reply_id, log_id=log_id)
    except ReviewReply.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if reply.user != request.user and not request.user.is_staff:
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    reply.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_profile(request, username):
    """Public profile: info + stats + 10 recent diary entries."""
    from django.contrib.auth.models import User as DjangoUser
    from django.db.models import Avg as DAvg
    try:
        target_user = DjangoUser.objects.get(username=username)
    except DjangoUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    profile = getattr(target_user, 'profile', None)
    logs = MovieLog.objects.filter(user=target_user)
    total = logs.count()
    avg = logs.aggregate(avg=DAvg('rating'))['avg']
    this_year = logs.filter(watched_date__year=timezone.now().year).count()
    recent = logs.select_related('user').prefetch_related('likes', 'replies')[:10]

    return Response({
        'username': target_user.username,
        'display_name': (profile.display_name if profile else '') or target_user.username,
        'avatar_url': profile.avatar_url if profile else '',
        'date_joined': target_user.date_joined,
        'is_me': request.user.is_authenticated and request.user.id == target_user.id,
        'followers_count': target_user.followers.count(),
        'following_count': target_user.following.count(),
        'is_following': (
            request.user.is_authenticated
            and Follow.objects.filter(follower=request.user, following=target_user).exists()
        ),
        'stats': {
            'total_logged': total,
            'avg_rating': float(avg) if avg is not None else None,
            'this_year': this_year,
        },
        'recent': MovieLogSerializer(recent, many=True, context={'request': request}).data,
    })


def _follow_list_response(request, users):
    """Public list of users, with is_following relative to the viewer if logged in."""
    viewer_following = set()
    if request.user.is_authenticated:
        viewer_following = set(
            Follow.objects.filter(follower=request.user).values_list('following_id', flat=True)
        )
    return Response([
        {
            **_user_card(u),
            'is_me': request.user.is_authenticated and u.id == request.user.id,
            'is_following': u.id in viewer_following,
        }
        for u in users
    ])


@api_view(['GET'])
@permission_classes([AllowAny])
def profile_followers(request, username):
    """Public list of accounts that follow this user."""
    from django.contrib.auth.models import User as DjangoUser
    try:
        target = DjangoUser.objects.get(username=username)
    except DjangoUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    # Users who have a Follow row with following=target
    users = (
        DjangoUser.objects.filter(following__following=target)
        .select_related('profile')
        .order_by('following__created_at')
    )
    return _follow_list_response(request, users)


@api_view(['GET'])
@permission_classes([AllowAny])
def profile_following(request, username):
    """Public list of accounts this user follows."""
    from django.contrib.auth.models import User as DjangoUser
    try:
        target = DjangoUser.objects.get(username=username)
    except DjangoUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    # Users who have a Follow row with follower=target
    users = (
        DjangoUser.objects.filter(followers__follower=target)
        .select_related('profile')
        .order_by('followers__created_at')
    )
    return _follow_list_response(request, users)


# =============================================================================
# SOCIAL: FOLLOWS + FEED
# =============================================================================

def _user_card(u):
    profile = getattr(u, 'profile', None)
    return {
        'username': u.username,
        'display_name': (profile.display_name if profile else '') or u.username,
        'avatar_url': profile.avatar_url if profile else '',
    }


def _actor_card(u, following_ids=None):
    card = _user_card(u)
    if following_ids is not None:
        card['is_me'] = u.id == following_ids.get('me_id')
        card['is_following'] = u.id in following_ids.get('ids', set())
    return card


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def follow_toggle(request, username):
    """Follow/unfollow a user. Returns {following, followers_count}."""
    from django.contrib.auth.models import User as DjangoUser
    try:
        target = DjangoUser.objects.get(username=username)
    except DjangoUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if target.id == request.user.id:
        return Response({'error': 'Cannot follow yourself'}, status=status.HTTP_400_BAD_REQUEST)

    existing = Follow.objects.filter(follower=request.user, following=target)
    if existing.exists():
        existing.delete()
        following = False
    else:
        Follow.objects.create(follower=request.user, following=target)
        following = True

    return Response({'following': following, 'followers_count': target.followers.count()})


@api_view(['GET'])
@permission_classes([AllowAny])
def feed(request):
    """Chronological activity: diary logs that carry a review or a rating.

    Plain "watched X" logs, review-like activities and reply events are
    excluded — they would just clutter the feed.

    scope=friends (default) → only users the current user follows.
    scope=global → every user on the platform.
    Guests always see the global feed.
    """
    is_auth = request.user.is_authenticated
    scope = request.query_params.get('scope', 'friends')
    if not is_auth:
        scope = 'global'
        followed_ids = set()
    else:
        followed_ids = set(
            Follow.objects.filter(follower=request.user).values_list('following_id', flat=True)
        )

    if scope == 'global':
        user_filter = {}  # no user filter → all logs
        actor_ctx = {'me_id': request.user.id if is_auth else None, 'ids': followed_ids}
    else:
        if not followed_ids:
            return Response([])
        user_filter = {'user_id__in': list(followed_ids)}
        actor_ctx = {'me_id': request.user.id, 'ids': followed_ids}

    logs = (
        MovieLog.objects.filter(**user_filter)
        .filter(Q(rating__isnull=False) | ~Q(review=''))
        .select_related('user', 'user__profile')
        .prefetch_related('likes', 'replies')
        .order_by('-updated_at')[:40]
    )

    items = [
        {
            'type': 'log',
            'timestamp': log.updated_at,
            'actor': _actor_card(log.user, actor_ctx),
            'log': MovieLogSerializer(log, context={'request': request}).data,
        }
        for log in logs
    ]
    return Response(items)


@api_view(['GET'])
@permission_classes([AllowAny])
def suggested_users(request):
    """Most active users the current user doesn't follow yet."""
    from django.contrib.auth.models import User as DjangoUser
    from django.db.models import Count as DCount
    if request.user.is_authenticated:
        already = set(
            Follow.objects.filter(follower=request.user).values_list('following_id', flat=True)
        )
        already.add(request.user.id)
    else:
        already = set()
    users = (
        DjangoUser.objects.annotate(log_count=DCount('movie_logs'))
        .filter(log_count__gt=0)
        .exclude(id__in=already)
        .order_by('-log_count')[:8]
    )
    return Response([
        {**_user_card(u), 'log_count': u.log_count} for u in users
    ])


@api_view(['GET'])
@permission_classes([AllowAny])
def search_users(request):
    """Search Madflix members by username or display name."""
    from django.contrib.auth.models import User as DjangoUser
    q = (request.GET.get('query') or request.GET.get('q') or '').strip()
    if not q:
        return Response([])
    users = (
        DjangoUser.objects.filter(
            Q(username__icontains=q) | Q(profile__display_name__icontains=q)
        )
        .select_related('profile')
        .order_by('username')[:12]
    )
    return _follow_list_response(request, users)
