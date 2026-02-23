import logging
import time

from django.conf import settings
from django.db import connection

logger = logging.getLogger(__name__)


class CoopMiddleware:
    """
    Override Django's default Cross-Origin-Opener-Policy header.

    Django (via SecurityMiddleware) sets COOP to 'same-origin', which blocks
    window.postMessage calls from popup windows (e.g. Google OAuth flow).

    This middleware relaxes COOP to 'same-origin-allow-popups' so that the
    Google Drive / Google Auth callback popup can communicate back to the
    opener tab via postMessage without being blocked.

    Must be FIRST in the MIDDLEWARE list (outermost wrapper):
        MIDDLEWARE = [
            'utils.middleware.CoopMiddleware',   # <- first
            'corsheaders.middleware.CorsMiddleware',
            'django.middleware.security.SecurityMiddleware',
            ...
        ]

    NOTE: This fixes COOP for Django API responses only.
    The Vite dev server (localhost:5173) needs its own COOP header —
    see vite.config.js server.headers settings.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
        return response

class CorsOnErrorMiddleware:
    """
    Guarantee that CORS headers are present on every response, including
    Django's bare 500 error responses that bypass django-cors-headers.
    """

    CORS_HEADER = 'Access-Control-Allow-Origin'

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        self._ensure_cors(request, response)
        return response

    def process_exception(self, request, exception):
        """
        Called by Django when a view raises an unhandled exception.
        Return None so Django continues with its normal exception handling,
        but we'll patch the CORS header in __call__ when the response comes back.
        """
        return None

    # ── helpers ──────────────────────────────────────────────────────────────

    def _ensure_cors(self, request, response):
        """Add CORS header if missing and the request came from a known origin."""
        if self.CORS_HEADER in response:
            return  # already handled by django-cors-headers

        origin = request.META.get('HTTP_ORIGIN')
        if not origin:
            return

        from django.conf import settings
        allowed = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        allow_all = getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False)

        if allow_all or origin in allowed:
            response[self.CORS_HEADER] = origin
            if getattr(settings, 'CORS_ALLOW_CREDENTIALS', False):
                response['Access-Control-Allow-Credentials'] = 'true'





class CacheHeadersMiddleware:
    """
    Add appropriate Cache-Control headers to API and static responses.
    Mutating requests (POST/PUT/PATCH/DELETE) are never cached.
    GET requests get a short private cache window.
    Static/media files get long-lived public cache headers.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            response['Cache-Control'] = 'public, max-age=31536000, immutable'

        elif request.path.startswith('/api/'):
            if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
                response['Cache-Control'] = 'no-store, no-cache, must-revalidate'
                response['Pragma'] = 'no-cache'
                response['Expires'] = '0'
            elif request.method == 'GET':
                response['Cache-Control'] = 'private, max-age=60'

        return response


class QueryCountDebugMiddleware:
    """
    Log a warning when a single request triggers an unusually high number of
    database queries. Only active when DEBUG=True.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)

        if settings.DEBUG and request.path.startswith('/api/'):
            duration_ms = (time.monotonic() - start) * 1000
            query_count = len(connection.queries)
            if query_count > 20:
                logger.warning(
                    f'HIGH QUERY COUNT: {request.method} {request.path} '
                    f'— {query_count} queries in {duration_ms:.1f}ms'
                )
                for i, query in enumerate(connection.queries, 1):
                    logger.debug(f'Query {i}: {query["sql"][:200]}')

        return response