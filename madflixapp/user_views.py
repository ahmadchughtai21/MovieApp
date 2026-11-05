from collections import Counter

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q
from django.utils import timezone
from .models import Watchlist, WatchHistory, PlaybackSession, AuditLog, SearchLog, MovieLog, DiaryLike, ReviewReply, ReviewReplyLike, Follow, FriendRequest, DirectMessage, TasteMatch
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
    from .api_views import make_tmdb_request

    items = list(Watchlist.objects.filter(user=request.user))
    media_type = request.GET.get('media_type')
    if media_type in ('movie', 'tv'):
        items = [item for item in items if item.media_type == media_type]

    # Repair imported rows that were saved without poster metadata.
    for item in items[:80]:
        if item.poster_path:
            continue
        endpoint = f'/tv/{item.tmdb_id}' if item.media_type == 'tv' else f'/movie/{item.tmdb_id}'
        data = make_tmdb_request(endpoint)
        if isinstance(data, dict) and not data.get('error'):
            poster = data.get('poster_path') or ''
            title = data.get('title') or data.get('name') or item.title
            if poster or title:
                item.poster_path = poster
                item.title = title
                item.save(update_fields=['poster_path', 'title'])

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

    replies = (
        log.replies
        .filter(parent__isnull=True)
        .select_related('user__profile')
        .prefetch_related('likes', 'children__user__profile', 'children__likes')
        .order_by('created_at')
    )
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

    parent_id = request.data.get('parent_id')
    parent = None
    if parent_id:
        try:
            parent = ReviewReply.objects.get(id=int(parent_id), log=log)
        except (TypeError, ValueError, ReviewReply.DoesNotExist):
            return Response({'error': 'Invalid parent reply.'}, status=status.HTTP_400_BAD_REQUEST)

    reply = ReviewReply.objects.create(
        user=request.user,
        log=log,
        parent=parent,
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
    """Public profile: info + stats + recent diary entries."""
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
    reviews_count = logs.exclude(Q(review='') | Q(review__isnull=True)).count()
    recent = (
        logs.order_by('-watched_date', '-created_at')
        .select_related('user')
        .prefetch_related('likes', 'replies')[:20]
    )

    profile_extras = {
        field: getattr(profile, field, None)
        for field in (
            'bio',
            'letterboxd_username',
            'fav_film_1_id',
            'fav_film_2_id',
            'fav_film_3_id',
            'fav_film_4_id',
            'fav_film_1_poster',
            'fav_film_2_poster',
            'fav_film_3_poster',
            'fav_film_4_poster',
            'fav_director_id',
            'fav_director_name',
            'fav_actor_id',
            'fav_actor_name',
            'profile_accent_color',
            'is_founding_member',
            'age',
        )
    } if profile else {}

    friend_status = 'none'
    friend_request_id = None
    if request.user.is_authenticated and request.user.id != target_user.id:
        incoming = FriendRequest.objects.filter(
            sender=target_user, recipient=request.user
        ).first()
        outgoing = FriendRequest.objects.filter(
            sender=request.user, recipient=target_user
        ).first()
        if incoming and incoming.status == 'pending':
            friend_status = 'pending_incoming'
            friend_request_id = incoming.id
        elif incoming and incoming.status == 'accepted':
            friend_status = 'friends'
        elif outgoing and outgoing.status == 'accepted':
            friend_status = 'friends'
        elif outgoing and outgoing.status == 'pending':
            friend_status = 'pending_outgoing'

    return Response({
        'username': target_user.username,
        'friend_status': friend_status,
        'friend_request_id': friend_request_id,
        'display_name': (profile.display_name if profile else '') or target_user.username,
        'avatar_url': profile.avatar_url if profile else '',
        'is_vip': bool(profile and profile.is_vip),
        'location_city': profile.location_city if profile else '',
        'location_country': profile.location_country if profile else '',
        **profile_extras,
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
            'reviews': reviews_count,
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
        'is_founding_member': bool(profile and profile.is_founding_member),
        'is_vip': bool(profile and profile.is_vip),
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
def suggested_users(request):
    """People to follow, prioritising mutual friends and the same city."""
    from django.contrib.auth.models import User as DjangoUser
    from django.db.models import Count as DCount

    following_ids = set(
        Follow.objects.filter(follower=request.user).values_list('following_id', flat=True)
    )
    request_ids = set()
    for row in FriendRequest.objects.filter(
        Q(sender=request.user) | Q(recipient=request.user)
    ):
        request_ids.add(row.sender_id)
        request_ids.add(row.recipient_id)

    excluded = following_ids | request_ids | {request.user.id}

    mutual_counts = Counter(
        Follow.objects
        .filter(follower_id__in=following_ids)
        .exclude(following_id__in=excluded)
        .values_list('following_id', flat=True)
    )

    my_profile = getattr(request.user, 'profile', None)
    my_city = (my_profile.location_city if my_profile else '') or ''

    candidates = (
        DjangoUser.objects
        .exclude(id__in=excluded)
        .select_related('profile')
        .annotate(log_count=DCount('movie_logs'))
    )

    scored = []
    for candidate in candidates:
        profile = getattr(candidate, 'profile', None)
        same_city = bool(
            my_city and profile and profile.location_city
            and profile.location_city.lower() == my_city.lower()
        )
        mutual = mutual_counts.get(candidate.id, 0)
        if mutual == 0 and not same_city and candidate.log_count == 0:
            continue

        if mutual > 0:
            reason = f'{mutual} mutual friend' + ('s' if mutual > 1 else '')
        elif same_city:
            reason = f'From {profile.location_city}'
        else:
            reason = 'Active on Madflix'

        scored.append((
            mutual,
            1 if same_city else 0,
            candidate.log_count,
            {
                'id': candidate.id,
                'username': candidate.username,
                'display_name': (profile.display_name if profile else '') or candidate.username,
                'avatar_url': profile.avatar_url if profile else '',
                'is_founding_member': bool(profile and profile.is_founding_member),
                'is_vip': bool(profile and profile.is_vip),
                'location_city': profile.location_city if profile else '',
                'log_count': candidate.log_count,
                'mutual_count': mutual,
                'same_city': same_city,
                'reason': reason,
            },
        ))

    scored.sort(key=lambda row: (-row[0], -row[1], -row[2]))
    return Response([row[3] for row in scored[:8]])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def social_followers(request):
    """Accepted connections for DMs (mutual swipes or accepted friend requests)."""
    from django.contrib.auth.models import User as DjangoUser

    accepted = FriendRequest.objects.filter(
        Q(sender=request.user) | Q(recipient=request.user),
        status='accepted',
    )
    accepted_ids = set()
    for row in accepted:
        accepted_ids.add(row.sender_id)
        accepted_ids.add(row.recipient_id)
    accepted_ids.discard(request.user.id)

    dm_partner_ids = set(
        DirectMessage.objects
        .filter(Q(sender=request.user) | Q(recipient=request.user))
        .values_list('sender_id', 'recipient_id')
    )
    dm_ids = set()
    for sender_id, recipient_id in dm_partner_ids:
        dm_ids.add(sender_id)
        dm_ids.add(recipient_id)
    dm_ids.discard(request.user.id)

    partner_ids = accepted_ids | dm_ids

    matches = {
        match.user_b_id: match.match_percentage
        for match in TasteMatch.objects.filter(user_a=request.user)
    }

    users = (
        DjangoUser.objects.filter(id__in=partner_ids)
        .select_related('profile')
        .order_by('username')
    )

    data = []
    for user in users:
        profile = getattr(user, 'profile', None)
        last = (
            DirectMessage.objects
            .filter(Q(sender=request.user, recipient=user) | Q(sender=user, recipient=request.user))
            .order_by('-created_at')
            .first()
        )
        data.append({
            'id': user.id,
            'username': user.username,
            'display_name': (profile.display_name if profile else '') or user.username,
            'avatar_url': profile.avatar_url if profile else '',
            'is_founding_member': bool(profile and profile.is_founding_member),
            'can_message': user.id in accepted_ids,
            'match_percentage': matches.get(user.id, 50),
            'last_message': last.message if last else '',
            'last_message_at': last.created_at.isoformat() if last else '',
            'unread_count': DirectMessage.objects.filter(
                sender=user, recipient=request.user, is_read=False
            ).count(),
        })

    data.sort(key=lambda item: item['last_message_at'] or '', reverse=True)
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dm_conversation(request, user_id):
    """Conversation history between the current user and another user."""
    from django.contrib.auth.models import User as DjangoUser

    try:
        other = DjangoUser.objects.get(pk=user_id)
    except DjangoUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    from .api_views import _dm_message_payload

    messages = (
        DirectMessage.objects
        .filter(Q(sender=request.user, recipient=other) | Q(sender=other, recipient=request.user))
        .select_related('sender', 'reply_to__sender', 'clip')
        .order_by('created_at')
    )

    DirectMessage.objects.filter(
        sender=other, recipient=request.user, is_read=False
    ).update(is_read=True)

    return Response([_dm_message_payload(message) for message in messages])


@api_view(['GET'])
@permission_classes([AllowAny])
def review_detail(request, log_id):
    """Single review with its nested reply tree."""
    try:
        log = MovieLog.objects.select_related('user__profile').get(id=log_id)
    except MovieLog.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    replies = (
        log.replies
        .filter(parent__isnull=True)
        .select_related('user__profile')
        .prefetch_related('likes', 'children__user__profile', 'children__likes')
        .order_by('created_at')
    )

    data = MovieLogSerializer(log, context={'request': request}).data
    data['replies'] = ReviewReplySerializer(
        replies, many=True, context={'request': request}
    ).data
    return Response(data, status=status.HTTP_200_OK)
