from django.http import JsonResponse
from django.core.cache import cache


class IPBanMiddleware:
    """Block requests from banned IPs. Caches bans for 5 minutes."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip = self._get_ip(request)
        if ip and self._is_banned(ip):
            return JsonResponse({'error': 'Access denied'}, status=403)
        return self._get_response(request)

    def _get_response(self, request):
        return self.get_response(request)

    def _get_ip(self, request):
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    def _is_banned(self, ip):
        cache_key = f'banned_ip_{ip}'
        result = cache.get(cache_key)
        if result is not None:
            return result

        from .models import BannedIP
        banned = BannedIP.objects.filter(ip_address=ip).exists()
        cache.set(cache_key, banned, 300)
        return banned
