from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.db.models import Count, Q, Avg, Sum
from django.utils import timezone
from datetime import timedelta
from .models import WatchHistory, Watchlist, PlaybackSession, AuditLog, SearchLog, BannedIP


def parse_ua(ua_string):
    """Extract device/browser from user agent string."""
    if not ua_string:
        return 'Unknown'
    ua = ua_string.lower()
    if 'mobile' in ua or 'android' in ua:
        if 'iphone' in ua:
            return 'iPhone'
        if 'android' in ua:
            return 'Android'
        return 'Mobile'
    if 'mac' in ua:
        return 'Mac'
    if 'windows' in ua:
        return 'Windows'
    if 'linux' in ua:
        return 'Linux'
    if 'ipad' in ua:
        return 'iPad'
    return 'Desktop'


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_stats(request):
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_users = User.objects.count()
    active_users = User.objects.filter(
        Q(playback_sessions__last_played__gte=week_ago) |
        Q(watch_history__timestamp__gte=week_ago)
    ).distinct().count()

    total_plays = WatchHistory.objects.count()
    plays_today = WatchHistory.objects.filter(timestamp__gte=today_start).count()
    plays_this_week = WatchHistory.objects.filter(timestamp__gte=week_ago).count()
    total_watchlist = Watchlist.objects.count()

    total_watch_time = PlaybackSession.objects.aggregate(
        total=Sum('position_seconds')
    )['total'] or 0

    avg_session = PlaybackSession.objects.aggregate(
        avg=Avg('position_seconds')
    )['avg'] or 0

    new_users_today = User.objects.filter(date_joined__gte=today_start).count()
    new_users_week = User.objects.filter(date_joined__gte=week_ago).count()

    currently_watching = PlaybackSession.objects.filter(
        active=True, last_played__gte=now - timedelta(minutes=30)
    ).values('tmdb_id', 'media_type', 'title').annotate(
        viewer_count=Count('user', distinct=True)
    ).order_by('-viewer_count')[:10]

    unique_content = WatchHistory.objects.values('tmdb_id').distinct().count()

    devices = list(
        PlaybackSession.objects.filter(last_played__gte=month_ago)
        .values_list('user_agent', flat=True)
    )
    device_counts = {}
    for ua in devices:
        device = parse_ua(ua)
        device_counts[device] = device_counts.get(device, 0) + 1

    daily_plays = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_start = timezone.make_aware(timezone.datetime.combine(day, timezone.datetime.min.time()))
        day_end = day_start + timedelta(days=1)
        count = WatchHistory.objects.filter(timestamp__gte=day_start, timestamp__lt=day_end).count()
        daily_plays.append({'date': day.isoformat(), 'count': count})

    return Response({
        'total_users': total_users,
        'active_users_7d': active_users,
        'total_plays': total_plays,
        'plays_today': plays_today,
        'plays_this_week': plays_this_week,
        'total_watchlist': total_watchlist,
        'total_watch_time_seconds': total_watch_time,
        'avg_session_seconds': round(avg_session),
        'new_users_today': new_users_today,
        'new_users_week': new_users_week,
        'currently_watching': list(currently_watching),
        'unique_content': unique_content,
        'devices': device_counts,
        'daily_plays': daily_plays,
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_activity(request):
    limit = min(int(request.GET.get('limit', 50)), 100)

    audit_items = list(AuditLog.objects.select_related('user').order_by('-timestamp')[:limit])

    anon_searches = list(
        SearchLog.objects.filter(user__isnull=True)
        .order_by('-timestamp')[:limit]
    )

    merged = []
    for item in audit_items:
        merged.append({
            'id': f'audit_{item.id}',
            'username': item.user.username if item.user else 'Anonymous',
            'action': item.action,
            'detail': item.detail,
            'tmdb_id': item.tmdb_id,
            'media_type': item.media_type,
            'timestamp': item.timestamp.isoformat(),
            'ip_address': item.ip_address,
            'is_anonymous': item.user is None,
        })
    for item in anon_searches:
        merged.append({
            'id': f'search_{item.id}',
            'username': 'Anonymous',
            'action': 'search',
            'detail': item.query,
            'tmdb_id': None,
            'media_type': None,
            'timestamp': item.timestamp.isoformat(),
            'ip_address': item.ip_address,
            'is_anonymous': True,
        })

    merged.sort(key=lambda x: x['timestamp'], reverse=True)

    seen = set()
    deduped = []
    for item in merged:
        key = (item.get('action'), item.get('detail'), item.get('ip_address'))
        ts = item['timestamp'][:19]
        full_key = (*key, ts)
        if full_key not in seen:
            seen.add(full_key)
            deduped.append(item)
        if len(deduped) >= limit:
            break

    return Response(deduped)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_users(request):
    users = User.objects.annotate(
        play_count=Count('watch_history'),
        watchlist_count=Count('watchlist'),
        session_count=Count('playback_sessions'),
    ).order_by('-date_joined')

    result = []
    for u in users:
        total_time = PlaybackSession.objects.filter(user=u).aggregate(
            total=Sum('position_seconds')
        )['total'] or 0

        last_active = PlaybackSession.objects.filter(user=u).order_by('-last_played').values_list('last_played', flat=True).first()
        if not last_active:
            last_active = WatchHistory.objects.filter(user=u).order_by('-timestamp').values_list('timestamp', flat=True).first()

        result.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'display_name': getattr(u.profile, 'display_name', '') if hasattr(u, 'profile') else '',
            'is_staff': u.is_staff,
            'date_joined': u.date_joined.isoformat(),
            'last_login': u.last_login.isoformat() if u.last_login else None,
            'last_active': last_active.isoformat() if last_active else None,
            'play_count': u.play_count,
            'watchlist_count': u.watchlist_count,
            'session_count': u.session_count,
            'total_watch_seconds': total_time,
        })

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_top_content(request):
    limit = min(int(request.GET.get('limit', 20)), 50)

    movies = (
        WatchHistory.objects.filter(media_type='movie')
        .values('tmdb_id', 'title')
        .annotate(
            play_count=Count('id'),
            unique_viewers=Count('user', distinct=True),
            total_time=Sum('progress_seconds'),
        )
        .order_by('-play_count')[:limit]
    )

    shows = (
        WatchHistory.objects.filter(media_type='tv')
        .values('tmdb_id', 'title', 'season', 'episode')
        .annotate(
            play_count=Count('id'),
            unique_viewers=Count('user', distinct=True),
            total_time=Sum('progress_seconds'),
        )
        .order_by('-play_count')[:limit]
    )

    return Response({
        'movies': list(movies),
        'shows': list(shows),
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_live(request):
    """Get currently active sessions (last 30 minutes)."""
    cutoff = timezone.now() - timedelta(minutes=30)
    sessions = (
        PlaybackSession.objects.filter(active=True, last_played__gte=cutoff)
        .select_related('user')
        .order_by('-last_played')
    )

    return Response([
        {
            'id': s.id,
            'username': s.user.username,
            'tmdb_id': s.tmdb_id,
            'media_type': s.media_type,
            'title': s.title,
            'season': s.season,
            'episode': s.episode,
            'position_seconds': s.position_seconds,
            'duration_seconds': s.duration_seconds,
            'progress_pct': round((s.position_seconds / s.duration_seconds * 100)) if s.duration_seconds > 0 else 0,
            'last_played': s.last_played.isoformat(),
            'ip_address': s.ip_address,
            'device': parse_ua(s.user_agent),
        }
        for s in sessions
    ])


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_searches(request):
    """Get recent search queries, deduped by query within 5s window."""
    limit = min(int(request.GET.get('limit', 50)), 100)
    items = list(SearchLog.objects.select_related('user').order_by('-timestamp')[:limit * 3])

    seen = []
    deduped = []
    for s in items:
        ts = s.timestamp.timestamp() if s.timestamp else 0
        is_dup = False
        for sq, st in seen:
            if s.query == sq and abs(ts - st) < 5:
                is_dup = True
                break
        if not is_dup:
            seen.append((s.query, ts))
            deduped.append(s)
        if len(deduped) >= limit:
            break

    return Response([
        {
            'id': s.id,
            'query': s.query,
            'username': s.user.username if s.user else 'Anonymous',
            'results_count': s.results_count,
            'timestamp': s.timestamp.isoformat(),
            'ip_address': s.ip_address,
        }
        for s in deduped
    ])


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_search_stats(request):
    """Get top search queries, deduped by query within 5s window."""
    raw = list(
        SearchLog.objects.filter(timestamp__gte=timezone.now() - timedelta(hours=24))
        .order_by('-timestamp')
    )

    seen = []
    deduped = []
    for s in raw:
        ts = s.timestamp.timestamp()
        is_dup = False
        for sq, st in seen:
            if s.query == sq and abs(ts - st) < 5:
                is_dup = True
                break
        if not is_dup:
            seen.append((s.query, ts))
            deduped.append(s)

    from collections import Counter
    query_counts = Counter(s.query for s in deduped)
    top = sorted(query_counts.items(), key=lambda x: -x[1])[:20]

    return Response({
        'top_queries': [{'query': q, 'count': c} for q, c in top],
        'searches_today': len(deduped),
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_banned_ips(request):
    """List all banned IPs."""
    items = BannedIP.objects.select_related('banned_by').all()
    return Response([
        {
            'id': b.id,
            'ip_address': b.ip_address,
            'reason': b.reason,
            'banned_by': b.banned_by.username if b.banned_by else 'System',
            'created_at': b.created_at.isoformat(),
        }
        for b in items
    ])


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_ban_ip(request):
    """Ban an IP address."""
    ip = request.data.get('ip_address', '').strip()
    reason = request.data.get('reason', '').strip()

    if not ip:
        return Response({'error': 'ip_address required'}, status=status.HTTP_400_BAD_REQUEST)

    ban, created = BannedIP.objects.get_or_create(
        ip_address=ip,
        defaults={'reason': reason, 'banned_by': request.user},
    )

    if not created:
        return Response({'error': 'IP already banned'}, status=status.HTTP_409_CONFLICT)

    from django.core.cache import cache
    cache.delete(f'banned_ip_{ip}')
    PlaybackSession.objects.filter(ip_address=ip, active=True).update(active=False)

    return Response({
        'id': ban.id,
        'ip_address': ban.ip_address,
        'reason': ban.reason,
        'banned_by': ban.banned_by.username,
        'created_at': ban.created_at.isoformat(),
    }, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_unban_ip(request, ban_id):
    """Unban an IP address."""
    try:
        ban = BannedIP.objects.get(id=ban_id)
        from django.core.cache import cache
        cache.delete(f'banned_ip_{ban.ip_address}')
        ban.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except BannedIP.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
