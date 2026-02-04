import logging
from django.conf import settings
from django.db import connection
from django.utils.deprecation import MiddlewareMixin


logger = logging.getLogger(__name__)


class QueryCountDebugMiddleware(MiddlewareMixin):
    """
    Middleware to log database query counts
    Use only in development/staging
    """

    def process_response(self, request, response):
        if settings.DEBUG:
            query_count = len(connection.queries)

            if query_count > 20:
                logger.warning(
                    f'High query count: {query_count} queries for {request.path}'
                )

                for i, query in enumerate(connection.queries, 1):
                    logger.debug(f"Query {i}: {query['sql'][:200]}")

        return response


class CacheHeadersMiddleware(MiddlewareMixin):
    """
    Add cache headers for static content
    """

    def process_response(self, request, response):
        if request.path.startswith('/static/') or request.path.startswith('/media/'):
            response['Cache-Control'] = 'public, max-age=31536000'

        elif request.path.startswith('/api/'):
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'

        return response
