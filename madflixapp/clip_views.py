import re
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.contrib.auth.models import User
from .models import HashTag, Clip, ClipLike, ClipComment, ClipReport
from .serializers import (
    ClipSerializer, ClipCreateSerializer, ClipCommentSerializer,
    ClipCommentCreateSerializer, ClipReportSerializer, ClipReportCreateSerializer
)
from .auth_views import log_audit


def extract_tags_and_mentions(text):
    tags = re.findall(r'#(\w+)', text)
    mentions = re.findall(r'@(\w+)', text)
    return tags, mentions


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


# =============================================================================
# CLIPS
# =============================================================================

def _rec_pairs_q(pairs):
    """Q filter matching clips tagged with any recommended (tmdb_id, media_type)."""
    movie_ids = [i for i, t in pairs if t == 'movie']
    tv_ids = [i for i, t in pairs if t == 'tv']
    all_ids = movie_ids + tv_ids
    q = Q()
    if movie_ids:
        q |= Q(tmdb_id__in=movie_ids, media_type='movie')
    if tv_ids:
        q |= Q(tmdb_id__in=tv_ids, media_type='tv')
    if all_ids:
        q |= Q(tmdb_id__in=all_ids, media_type='')
    return q


def _for_you_clips(request, base, limit):
    """
    Two-phase clips feed:
      1. Clips tagged with the user's recommended titles — max 2 per title,
         sorted newest first (the personal block).
      2. Once that block is exhausted, recently uploaded clips globally,
         never re-serving clips from the personal block.

    Cursors: 'p:<offset>' walks the personal block, 'g:<iso>' continues the
    global phase below a created_at anchor.
    """
    from .api_views import get_recommended_media_pairs

    rec_pairs = get_recommended_media_pairs(request.user)
    cursor = request.GET.get('cursor') or ''

    # Full personal block, built deterministically on every page.
    personal, per_id = [], {}
    if rec_pairs:
        personal_qs = base.filter(_rec_pairs_q(rec_pairs)).order_by('-created_at', '-id')
        for clip in personal_qs[:400]:
            if per_id.get(clip.tmdb_id, 0) >= 2:
                continue
            per_id[clip.tmdb_id] = per_id.get(clip.tmdb_id, 0) + 1
            personal.append(clip)

    served_ids = {c.id for c in personal}
    results, next_cursor = [], None

    def take_global(need, after=None):
        """Newest global clips not already served by the personal block."""
        qs = base.exclude(id__in=served_ids).order_by('-created_at', '-id')
        if after is not None:
            qs = qs.filter(created_at__lt=after)
        window = list(qs[:need + 1])
        return window[:need], len(window) > need

    if cursor.startswith('g:'):
        try:
            after = timezone.datetime.fromisoformat(cursor[2:].replace('Z', '+00:00'))
        except Exception:
            after = None
        results, more = take_global(limit, after)
        if more and results:
            next_cursor = f'g:{results[-1].created_at.isoformat()}'
    else:
        offset = 0
        if cursor.startswith('p:'):
            try:
                offset = max(int(cursor[2:]), 0)
            except ValueError:
                offset = 0
        results = personal[offset:offset + limit]
        if len(results) < limit:
            fill, more = take_global(limit - len(results))
            results.extend(fill)
            if fill and more:
                next_cursor = f'g:{fill[-1].created_at.isoformat()}'
        else:
            next_cursor = f'p:{offset + len(results)}'

    serializer = ClipSerializer(results, many=True, context={'request': request})
    data = serializer.data
    for item, clip in zip(data, results):
        item['recommended'] = clip.id in served_ids
    return Response({
        'results': data,
        'has_more': next_cursor is not None,
        'next_cursor': next_cursor,
        'personal_total': len(personal),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def clip_list(request):
    clips = Clip.objects.select_related('user__profile').prefetch_related('tags', 'mentions')

    tmdb_id = request.GET.get('tmdb_id')
    if tmdb_id:
        clips = clips.filter(tmdb_id=tmdb_id)

    media_type = request.GET.get('media_type')
    if media_type in ('movie', 'tv'):
        clips = clips.filter(media_type=media_type)

    tag = request.GET.get('tag')
    if tag:
        clips = clips.filter(tags__name__iexact=tag)

    username = request.GET.get('user')
    if username:
        clips = clips.filter(user__username__iexact=username)

    limit = min(int(request.GET.get('limit', 20)), 50)

    if request.GET.get('mode') == 'for_you' and request.user.is_authenticated:
        return _for_you_clips(request, clips, limit)

    # Cursor pagination (newest first)
    cursor = request.GET.get('cursor')
    if cursor:
        try:
            cursor_date = timezone.datetime.fromisoformat(cursor.replace('Z', '+00:00'))
            clips = clips.filter(created_at__lt=cursor_date)
        except Exception:
            pass

    clips = clips[:limit + 1]

    has_more = len(clips) > limit
    clips = clips[:limit]

    serializer = ClipSerializer(clips, many=True, context={'request': request})
    return Response({
        'results': serializer.data,
        'has_more': has_more,
        'next_cursor': clips[-1].created_at.isoformat() if has_more and clips else None,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clip_create(request):
    serializer = ClipCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    video = data['video']
    caption = data.get('caption', '')

    clip = Clip.objects.create(
        user=request.user,
        video=video,
        caption=caption,
        tmdb_id=data.get('tmdb_id'),
        media_type=data.get('media_type', ''),
        media_title=(data.get('media_title', '') or '').strip(),
    )

    # Parse and save hashtags
    tag_names = [t.lower() for t in re.findall(r'#(\w+)', caption)]
    if tag_names:
        tags = []
        for name in tag_names:
            tag, _ = HashTag.objects.get_or_create(name=name)
            tags.append(tag)
        clip.tags.set(tags)

    # Parse and save mentions
    mention_names = re.findall(r'@(\w+)', caption)
    if mention_names:
        users = User.objects.filter(username__in=mention_names)
        clip.mentions.set(users)

    clip_serializer = ClipSerializer(clip, context={'request': request})
    log_audit(request.user, 'clip', caption[:100], tmdb_id=clip.tmdb_id,
              media_type=clip.media_type, request=request)
    return Response(clip_serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def clip_detail(request, clip_id):
    try:
        clip = Clip.objects.select_related('user__profile').prefetch_related('tags', 'mentions').get(pk=clip_id)
    except Clip.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ClipSerializer(clip, context={'request': request})
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clip_delete(request, clip_id):
    try:
        clip = Clip.objects.get(pk=clip_id)
    except Clip.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if clip.user != request.user and not request.user.is_staff:
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    clip.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clip_update(request, clip_id):
    try:
        clip = Clip.objects.get(pk=clip_id)
    except Clip.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if clip.user != request.user and not request.user.is_staff:
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    if 'caption' in request.data:
        caption = (request.data.get('caption') or '').strip()
        if len(caption) > 2000:
            return Response({'caption': ['Keep it under 2000 characters.']}, status=status.HTTP_400_BAD_REQUEST)
        clip.caption = caption

    tag_updated = 'tmdb_id' in request.data or 'media_type' in request.data
    if 'tmdb_id' in request.data:
        raw = request.data.get('tmdb_id')
        if raw in (None, ''):
            clip.tmdb_id = None
        else:
            try:
                clip.tmdb_id = int(raw)
            except (TypeError, ValueError):
                return Response({'tmdb_id': ['Invalid tmdb_id.']}, status=status.HTTP_400_BAD_REQUEST)

    if 'media_type' in request.data:
        media_type = request.data.get('media_type') or ''
        if media_type and media_type not in ('movie', 'tv'):
            return Response({'media_type': ['Must be "movie" or "tv".']}, status=status.HTTP_400_BAD_REQUEST)
        clip.media_type = media_type

    if 'media_title' in request.data:
        clip.media_title = (request.data.get('media_title') or '').strip()[:200]
    elif tag_updated:
        clip.media_title = ''

    if clip.tmdb_id is None:
        clip.media_type = ''
    elif tag_updated and not clip.media_type:
        return Response({'media_type': ['media_type is required when tagging a title.']}, status=status.HTTP_400_BAD_REQUEST)

    clip.save()

    # Re-parse hashtags / mentions from the (possibly new) caption
    tag_names = [t.lower() for t in re.findall(r'#(\w+)', clip.caption)]
    if tag_names:
        tags = []
        for name in tag_names:
            tag, _ = HashTag.objects.get_or_create(name=name)
            tags.append(tag)
        clip.tags.set(tags)
    else:
        clip.tags.set([])

    mention_names = re.findall(r'@(\w+)', clip.caption)
    if mention_names:
        clip.mentions.set(User.objects.filter(username__in=mention_names))
    else:
        clip.mentions.set([])

    serializer = ClipSerializer(clip, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clip_like_toggle(request, clip_id):
    try:
        clip = Clip.objects.get(pk=clip_id)
    except Clip.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    like, created = ClipLike.objects.get_or_create(user=request.user, clip=clip)
    if not created:
        like.delete()
        liked = False
    else:
        liked = True

    return Response({
        'liked': liked,
        'likes_count': clip.likes.count(),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def clip_comments(request, clip_id):
    try:
        clip = Clip.objects.get(pk=clip_id)
    except Clip.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    comments = clip.comments.select_related('user__profile').all()
    serializer = ClipCommentSerializer(comments, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clip_comment_create(request, clip_id):
    try:
        clip = Clip.objects.get(pk=clip_id)
    except Clip.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ClipCommentCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    comment = ClipComment.objects.create(
        user=request.user,
        clip=clip,
        body=serializer.validated_data['body'],
    )

    serializer = ClipCommentSerializer(comment, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clip_comment_delete(request, clip_id, comment_id):
    try:
        comment = ClipComment.objects.get(pk=comment_id, clip_id=clip_id)
    except ClipComment.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if comment.user != request.user and not request.user.is_staff:
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    comment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clip_report(request, clip_id):
    try:
        clip = Clip.objects.get(pk=clip_id)
    except Clip.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ClipReportCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    report = ClipReport.objects.create(
        clip=clip,
        reporter=request.user,
        reason=serializer.validated_data['reason'],
        detail=serializer.validated_data.get('detail', ''),
    )
    log_audit(request.user, 'report',
              f"{report.reason}: clip #{clip.id}",
              tmdb_id=clip.tmdb_id, media_type=clip.media_type, request=request)

    serializer = ClipReportSerializer(report)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


from django.utils import timezone