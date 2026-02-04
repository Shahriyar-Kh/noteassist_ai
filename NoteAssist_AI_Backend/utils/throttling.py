from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


class BurstRateThrottle(UserRateThrottle):
    """Allow burst of requests"""
    scope = 'burst'
    rate = '60/min'


class SustainedRateThrottle(UserRateThrottle):
    """Sustained rate limit"""
    scope = 'sustained'
    rate = '1000/day'


class AIToolRateThrottle(UserRateThrottle):
    """Strict rate limit for AI tools"""
    scope = 'ai_tools'
    rate = '20/hour'


class AnonBurstRateThrottle(AnonRateThrottle):
    """Allow burst of requests for anonymous users"""
    scope = 'anon_burst'
    rate = '10/min'


class AnonSustainedRateThrottle(AnonRateThrottle):
    """Sustained rate limit for anonymous users"""
    scope = 'anon_sustained'
    rate = '100/day'
