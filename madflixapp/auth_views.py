from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
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


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def profile_update_view(request):
    serializer = ProfileUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    user = request.user

    if 'email' in data:
        user.email = data['email']
        user.save()

    profile = user.profile
    if 'display_name' in data:
        profile.display_name = data['display_name']
    if 'avatar_url' in data:
        profile.avatar_url = data['avatar_url']
    profile.save()

    return Response(UserSerializer(user).data)
