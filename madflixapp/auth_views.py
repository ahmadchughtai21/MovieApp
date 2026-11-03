from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
import os
import time
from django.core.files.storage import default_storage
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer, ProfileUpdateSerializer
)


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_audit(user, action, detail='', tmdb_id=None, media_type='', request=None):
    from .models import AuditLog
    ip = get_client_ip(request) if request else None
    AuditLog.objects.create(
        user=user, action=action, detail=detail,
        tmdb_id=tmdb_id, media_type=media_type, ip_address=ip,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    user = User.objects.create_user(
        username=data['username'],
        email=data.get('email', ''),
        password=data['password'],
    )
    from .models import UserProfile
    UserProfile.objects.create(
        user=user,
        display_name=data.get('display_name', '') or data['username'],
        location_city=data.get('location_city') or 'Lahore',
        location_country=data.get('location_country') or 'Pakistan',
        age=data.get('age'),
        is_founding_member=User.objects.filter(id__lte=user.id).count() <= 100,
    )
    token, _ = Token.objects.get_or_create(user=user)
    log_audit(user, 'register', request=request)
    return Response({
        'token': token.key,
        'user': UserSerializer(user).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(
        username=serializer.validated_data['username'],
        password=serializer.validated_data['password'],
    )
    if not user:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    token, _ = Token.objects.get_or_create(user=user)

    from .models import PlaybackSession
    PlaybackSession.objects.filter(user=user).update(active=False)

    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
    log_audit(user, 'login', request=request)

    return Response({
        'token': token.key,
        'user': UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    log_audit(request.user, 'logout', request=request)
    request.user.auth_token.delete()
    return Response({'message': 'Logged out'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def avatar_upload_view(request):
    """Upload a profile photo and store its media URL on the profile."""
    upload = request.FILES.get('avatar')
    if upload is None:
        return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)

    if upload.size > 5 * 1024 * 1024:
        return Response({'error': 'Image must be 5MB or smaller.'}, status=status.HTTP_400_BAD_REQUEST)

    content_type = getattr(upload, 'content_type', '') or ''
    if not content_type.startswith('image/'):
        return Response({'error': 'Please upload an image file.'}, status=status.HTTP_400_BAD_REQUEST)

    extension = os.path.splitext(upload.name)[1].lower()
    if extension not in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
        extension = '.jpg'

    path = default_storage.save(
        f'avatars/user_{request.user.id}_{int(time.time())}{extension}',
        upload,
    )
    avatar_url = default_storage.url(path)

    from .models import UserProfile
    profile, _ = UserProfile.objects.get_or_create(
        user=request.user,
        defaults={'display_name': request.user.username},
    )
    profile.avatar_url = avatar_url
    profile.save(update_fields=['avatar_url'])

    return Response({'avatar_url': avatar_url}, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_update_view(request):
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)

    serializer = ProfileUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    user = request.user

    if 'email' in data:
        user.email = data['email'] or ''
        user.save()

    from .models import UserProfile
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={'display_name': user.username},
    )
    if 'display_name' in data:
        profile.display_name = data['display_name'] or user.username
    if 'avatar_url' in data:
        profile.avatar_url = data['avatar_url']
    # City is fixed once a profile has one; it can only be set on creation.
    if 'location_city' in data and data['location_city'] and not profile.location_city:
        profile.location_city = data['location_city']
    if 'location_country' in data and data['location_country'] and not profile.location_country:
        profile.location_country = data['location_country']
    if 'bio' in data:
        profile.bio = data['bio']
    if 'letterboxd_username' in data:
        profile.letterboxd_username = data['letterboxd_username']
    for field in ('fav_film_1_id', 'fav_film_2_id', 'fav_film_3_id', 'fav_film_4_id'):
        if field in data:
            setattr(profile, field, data[field])
    for field in (
        'fav_film_1_poster', 'fav_film_2_poster',
        'fav_film_3_poster', 'fav_film_4_poster',
    ):
        if field in data:
            setattr(profile, field, data[field])
    for field in ('fav_director_id', 'fav_director_name', 'fav_actor_id', 'fav_actor_name'):
        if field in data:
            setattr(profile, field, data[field])
    if 'profile_accent_color' in data and data['profile_accent_color']:
        profile.profile_accent_color = data['profile_accent_color']
    profile.save()

    return Response(UserSerializer(user).data)
