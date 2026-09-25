from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.db.models import Count, Q, Avg, Sum, Max
from django.utils import timezone
from datetime import timedelta
from .models import (
    WatchHistory, Watchlist, PlaybackSession, AuditLog, SearchLog, BannedIP,
    Clip, ClipComment, ClipReport, MovieLog, ReviewReply, Follow,
)
from .serializers import ClipSerializer
from .auth_views import log_audit


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

    total_clips = Clip.objects.count()
    total_clip_comments = ClipComment.objects.count()
    total_reviews = MovieLog.objects.exclude(review='').count()
    total_replies = ReviewReply.objects.count()
    total_follows = Follow.objects.count()
    open_reports = ClipReport.objects.filter(resolved=False).count()
    resolved_reports = ClipReport.objects.filter(resolved=True).count()

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
        'total_clips': total_clips,
        'total_clip_comments': total_clip_comments,
        'total_reviews': total_reviews,
        'total_replies': total_replies,
        'total_follows': total_follows,
        'open_reports': open_reports,
        'resolved_reports': resolved_reports,
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
    # Aggregate per-user values in grouped queries first: combining multi-valued
    # joins in one annotate() would multiply Count/Sum across the cross join.
    watch_times = dict(
        PlaybackSession.objects.values('user_id').annotate(t=Sum('position_seconds')).values_list('user_id', 't')
    )
    last_sessions = dict(
        PlaybackSession.objects.values('user_id').annotate(t=Max('last_played')).values_list('user_id', 't')
    )
    last_watches = dict(
        WatchHistory.objects.values('user_id').annotate(t=Max('timestamp')).values_list('user_id', 't')
    )

    users = User.objects.annotate(
        play_count=Count('watch_history', distinct=True),
        watchlist_count=Count('watchlist', distinct=True),
        session_count=Count('playback_sessions', distinct=True),
    ).order_by('-date_joined')

    result = []
    for u in users:
        total_time = watch_times.get(u.id) or 0
        last_active = last_sessions.get(u.id) or last_watches.get(u.id)

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


# =============================================================================
# MODERATION (clips, reports, comments, review replies)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_moderation(request):
    """Reports queue plus recent community content, for the Moderation tab."""
    ctx = {'request': request}

    reports = []
    report_qs = (
        ClipReport.objects.select_related('clip__user', 'reporter')
        .annotate(clip_report_total=Count('clip__reports', distinct=True))
        .order_by('resolved', '-created_at')[:50]
    )
    for r in report_qs:
        reports.append({
            'id': r.id,
            'reason': r.reason,
            'detail': r.detail,
            'resolved': r.resolved,
            'created_at': r.created_at.isoformat(),
            'reporter': r.reporter.username,
            'clip_reports': r.clip_report_total,
            'clip': ClipSerializer(r.clip, context=ctx).data,
        })

    clips = []
    clip_qs = (
        Clip.objects.select_related('user')
        .prefetch_related('likes', 'comments', 'reports', 'tags')
        .order_by('-created_at')[:25]
    )
    for c in clip_qs:
        data = ClipSerializer(c, context=ctx).data
        all_reports = c.reports.all()
        data['report_count'] = len(all_reports)
        data['open_report_count'] = sum(1 for rep in all_reports if not rep.resolved)
        clips.append(data)

    comments = [
        {
            'id': c.id,
            'body': c.body,
            'username': c.user.username,
            'clip_id': c.clip_id,
            'clip_caption': c.clip.caption,
            'created_at': c.created_at.isoformat(),
        }
        for c in ClipComment.objects.select_related('user', 'clip').order_by('-created_at')[:25]
    ]

    replies = [
        {
            'id': r.id,
            'body': r.body,
            'username': r.user.username,
            'log_id': r.log_id,
            'log_tmdb_id': r.log.tmdb_id,
            'log_media_type': r.log.media_type,
            'like_count': r.likes.count(),
            'created_at': r.created_at.isoformat(),
        }
        for r in ReviewReply.objects.select_related('user', 'log').prefetch_related('likes')
        .order_by('-created_at')[:25]
    ]

    counts = {
        'reports': ClipReport.objects.count(),
        'open_reports': ClipReport.objects.filter(resolved=False).count(),
        'resolved_reports': ClipReport.objects.filter(resolved=True).count(),
        'clips': Clip.objects.count(),
        'comments': ClipComment.objects.count(),
        'replies': ReviewReply.objects.count(),
    }

    return Response({
        'counts': counts,
        'reports': reports,
        'clips': clips,
        'comments': comments,
        'replies': replies,
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_report_resolve(request, report_id):
    """Mark a clip report resolved (or reopen it when resolved is omitted/toggled)."""
    try:
        rep = ClipReport.objects.select_related('clip').get(pk=report_id)
    except ClipReport.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    resolved = request.data.get('resolved')
    rep.resolved = (not rep.resolved) if resolved is None else bool(resolved)
    rep.save(update_fields=['resolved'])
    log_audit(
        request.user, 'moderation',
        f"{'Resolved' if rep.resolved else 'Reopened'} report #{rep.id} ({rep.reason})",
        tmdb_id=rep.clip.tmdb_id, media_type=rep.clip.media_type, request=request,
    )
    return Response({'id': rep.id, 'resolved': rep.resolved})


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_clip(request, clip_id):
    """Remove a clip; its reports cascade away with it."""
    try:
        clip = Clip.objects.get(pk=clip_id)
    except Clip.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    caption = (clip.caption or '').strip()[:80] or f'clip #{clip.id}'
    open_reports = clip.reports.filter(resolved=False).count()
    tmdb_id, media_type = clip.tmdb_id, clip.media_type
    clip.delete()
    log_audit(
        request.user, 'moderation', f"Removed clip: {caption}",
        tmdb_id=tmdb_id, media_type=media_type, request=request,
    )
    return Response({'id': clip_id, 'reports_resolved': open_reports})


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_comment(request, comment_id):
    """Remove a clip comment."""
    try:
        comment = ClipComment.objects.select_related('clip', 'user').get(pk=comment_id)
    except ClipComment.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    body = (comment.body or '').strip()[:80]
    clip_id = comment.clip_id
    author = comment.user.username
    comment.delete()
    log_audit(
        request.user, 'moderation',
        f"Removed comment by @{author}: {body or 'empty'} on clip #{clip_id}",
        request=request,
    )
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_reply(request, reply_id):
    """Remove a review reply."""
    try:
        reply = ReviewReply.objects.select_related('log').get(pk=reply_id)
    except ReviewReply.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    body = (reply.body or '').strip()[:80]
    tmdb_id, media_type = reply.log.tmdb_id, reply.log.media_type
    reply.delete()
    log_audit(
        request.user, 'moderation', f"Removed reply: {body or 'empty'}",
        tmdb_id=tmdb_id, media_type=media_type, request=request,
    )
    return Response(status=status.HTTP_204_NO_CONTENT)
