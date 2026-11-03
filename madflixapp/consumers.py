import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.db.models import Q

from .models import CircleMessage, DirectMessage, FriendRequest, MovieCircle


def parse_dm_room(room_name):
    if not room_name.startswith('dm_'):
        return None
    parts = room_name.split('_')
    if len(parts) != 3:
        return None
    try:
        user_a, user_b = int(parts[1]), int(parts[2])
    except ValueError:
        return None
    return min(user_a, user_b), max(user_a, user_b)


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if user is None or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.dm_user_ids = parse_dm_room(self.room_name)
        self.is_dm = self.room_name.startswith('dm_')

        if self.is_dm:
            if self.dm_user_ids is None:
                await self.close(code=4001)
                return
            if user.id not in self.dm_user_ids:
                await self.close(code=4001)
                return
            min_id, max_id = self.dm_user_ids
            self.room_group_name = f'chat_dm_{min_id}_{max_id}'
        else:
            self.room_group_name = f'chat_{self.room_name}'

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        message = (data.get('message') or '').strip()
        if not message:
            return

        tmdb_id = data.get('tmdb_id')
        if tmdb_id is not None:
            try:
                tmdb_id = int(tmdb_id)
            except (TypeError, ValueError):
                tmdb_id = None

        media_type = data.get('media_type') or 'movie'
        user = self.scope.get('user')

        if user is None or not user.is_authenticated:
            return

        saved = await self.save_message(user, message, tmdb_id, media_type)
        if saved is None:
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'sender_id': user.id,
                'sender_username': user.username,
                'sender_is_founding_member': saved['is_founding_member'],
                'sender_is_vip': saved.get('is_vip', False),
                'message': message,
                'tmdb_id': tmdb_id,
                'media_type': media_type,
                'created_at': saved['created_at'],
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username'],
            'sender_is_founding_member': event.get('sender_is_founding_member', False),
            'sender_is_vip': event.get('sender_is_vip', False),
            'message': event['message'],
            'tmdb_id': event['tmdb_id'],
            'media_type': event['media_type'],
            'created_at': event['created_at'],
        }))

    @database_sync_to_async
    def save_message(self, user, message, tmdb_id, media_type):
        if self.is_dm:
            if not self.dm_user_ids or user.id not in self.dm_user_ids:
                return None
            min_id, max_id = self.dm_user_ids
            recipient_id = max_id if user.id == min_id else min_id
            User = get_user_model()
            try:
                recipient = User.objects.get(pk=recipient_id)
            except User.DoesNotExist:
                return None

            friends = FriendRequest.objects.filter(
                Q(sender=user, recipient=recipient) | Q(sender=recipient, recipient=user),
                status='accepted',
            ).exists()
            if not friends:
                return None

            dm = DirectMessage.objects.create(
                sender=user,
                recipient=recipient,
                message=message,
                tmdb_id=tmdb_id,
                media_type=media_type,
            )
            profile = getattr(user, 'profile', None)
            return {
                'created_at': dm.created_at.isoformat(),
                'is_founding_member': bool(profile and profile.is_founding_member),
                'is_vip': bool(profile and profile.is_vip),
            }

        circle = MovieCircle.objects.filter(slug=self.room_name).first()
        if circle is None:
            return None

        circle_message = CircleMessage.objects.create(
            circle=circle,
            sender=user,
            message=message,
            tmdb_id=tmdb_id,
            media_type=media_type,
        )
        profile = getattr(user, 'profile', None)
        return {
            'created_at': circle_message.created_at.isoformat(),
            'is_founding_member': bool(profile and profile.is_founding_member),
        }
