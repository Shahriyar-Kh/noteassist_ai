from functools import wraps

from rest_framework import status
from rest_framework.response import Response

from .models import AIToolQuota


def reserve_ai_request(view_method):
    """Share the free allowance with legacy note and topic AI actions."""
    @wraps(view_method)
    def guarded(view, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({'error': 'Please sign in to use AI.'}, status=status.HTTP_401_UNAUTHORIZED)
        quota, _ = AIToolQuota.objects.get_or_create(user=request.user)
        if not quota.try_reserve():
            return Response(
                {'error': 'Free AI allowance reached. Try again after the daily or monthly reset.',
                 'daily_limit': quota.daily_limit, 'monthly_limit': quota.monthly_limit},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return view_method(view, request, *args, **kwargs)
    return guarded
