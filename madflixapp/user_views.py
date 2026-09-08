from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q
from .models import Watchlist, WatchHistory, PlaybackSession, AuditLog, SearchLog
from .serializers import (
    WatchlistSerializer, WatchlistCreateSerializer,
    WatchHistorySerializer, WatchHistoryCreateSerializer,
    PlaybackSessionSerializer, PlaybackSessionCreateSerializer,
    PlaybackSessionUpdateSerializer,
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
