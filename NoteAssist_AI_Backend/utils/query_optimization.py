# FILE: utils/query_optimization.py
# ============================================================================
# Query Optimization Utilities - Eliminate N+1 queries & improve DB performance
# ============================================================================

from django.db.models import Prefetch, Q, Count, Sum, Avg
from django.core.cache import cache
from functools import wraps
import hashlib
import logging

logger = logging.getLogger(__name__)


class QueryOptimizer:
    """Centralized query optimization for better performance"""
    
    # ==== NOTE QUERIES ====
    @staticmethod
    def get_notes_for_list(user, filters=None):
        """
        Optimized queryset for note listing.
        Uses select_related + prefetch_related to eliminate N+1 queries.
        """
        queryset = (
            user.notes
            .select_related('user')  # FK to user
            .prefetch_related(
                Prefetch('chapters', queryset=QueryOptimizer.get_chapters_optimized())
            )
            .annotate(
                chapters_count=Count('chapters', distinct=True),
                topics_count=Count('chapters__topics', distinct=True),
                versions_count=Count('versions', distinct=True)
            )
            .order_by('-updated_at')
            .only(
                'id', 'user_id', 'title', 'slug', 'status', 'tags',
                'created_at', 'updated_at', 'session_date'
            )
        )
        
        # Apply filters if provided
        if filters:
            if status := filters.get('status'):
                queryset = queryset.filter(status=status)
            if tags := filters.get('tags'):
                for tag in tags:
                    queryset = queryset.filter(tags__contains=[tag.strip()])
            if search := filters.get('search'):
                queryset = queryset.filter(
                    Q(title__icontains=search) |
                    Q(tags__contains=[search])
                )
        
        return queryset
    
    @staticmethod
    def get_note_detail(note_id, user):
        """
        Optimized queryset for single note with full structure.
        Includes chapters and topics with all related data.
        """
        from notes.models import Note, Chapter, ChapterTopic
        
        # Get optimized chapters
        chapters = QueryOptimizer.get_chapters_optimized()
        
        queryset = (
            Note.objects
            .filter(id=note_id, user=user)
            .select_related('user')
            .prefetch_related(
                Prefetch('chapters', queryset=chapters),
                'versions'
            )
        )
        
        return queryset.first()
    
    @staticmethod
    def get_chapters_optimized():
        """Get optimized chapter queryset with topics"""
        from notes.models import Chapter, ChapterTopic
        
        topics = (
            ChapterTopic.objects
            .select_related(
                'explanation',    # OneToOne
                'code_snippet',   # OneToOne
                'source'          # OneToOne
            )
            .order_by('order', 'created_at')
            .only(
                'id', 'chapter_id', 'name', 'order', 'created_at', 'updated_at',
                'explanation_id', 'code_snippet_id', 'source_id'
            )
        )
        
        chapters = (
            Chapter.objects
            .prefetch_related(Prefetch('topics', queryset=topics))
            .order_by('order', 'created_at')
            .only('id', 'note_id', 'title', 'order', 'created_at', 'updated_at')
        )
        
        return chapters
    
    @staticmethod
    def get_topics_optimized(chapter_id=None):
        """Get optimized topic queryset"""
        from notes.models import ChapterTopic
        
        queryset = (
            ChapterTopic.objects
            .select_related(
                'chapter',
                'explanation',
                'code_snippet',
                'source'
            )
            .only(
                'id', 'chapter_id', 'name', 'order', 'created_at', 'updated_at',
                'explanation_id', 'code_snippet_id', 'source_id'
            )
            .order_by('order', 'created_at')
        )
        
        if chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)
        
        return queryset
    
    # ==== AUTHENTICATION QUERIES ====
    @staticmethod
    def get_user_with_profile(user_id):
        """Optimized user query with profile data"""
        from accounts.models import User
        from profiles.models import Profile
        
        user = (
            User.objects
            .select_related('profile')  # If OneToOne exists
            .filter(id=user_id)
            .first()
        )
        
        return user
    
    # ==== DASHBOARD QUERIES ====
    @staticmethod
    def get_dashboard_data(user):
        """
        Get optimized dashboard data - single efficient query.
        Includes notes summary, recent activity, etc.
        """
        from notes.models import Note, Chapter, ChapterTopic
        from dashboard.models import ActivityLog
        
        dashboard_data = {
            'total_notes': Note.objects.filter(user=user).count(),
            'total_chapters': Chapter.objects.filter(note__user=user).count(),
            'total_topics': ChapterTopic.objects.filter(chapter__note__user=user).count(),
            'recent_notes': Note.objects.filter(user=user).order_by('-updated_at')[:5],
            'recent_activity': ActivityLog.objects.filter(user=user).order_by('-timestamp')[:10],
        }
        
        return dashboard_data
    
    # ==== ADMIN QUERIES ====
    @staticmethod
    def get_users_for_admin(page=1, page_size=20):
        """Optimized admin user listing"""
        from accounts.models import User
        from django.db.models import Count
        
        queryset = (
            User.objects
            .select_related('profile')
            .annotate(
                notes_count=Count('notes'),
                last_login_display=Count('last_login')
            )
            .order_by('-date_joined')
        )
        
        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        
        return queryset[start:end]
    
    # ==== AI QUERY OPTIMIZATIONS ====
    @staticmethod
    def get_ai_history(user, limit=50):
        """Optimized AI history query"""
        from ai_tools.models import AIHistory
        
        queryset = (
            AIHistory.objects
            .filter(user=user)
            .select_related('note', 'chapter', 'topic')
            .order_by('-created_at')
            .only(
                'id', 'user_id', 'note_id', 'chapter_id', 'topic_id',
                'action_type', 'created_at', 'result_summary'
            )
        )
        
        return queryset[:limit]


class CacheOptimizer:
    """Cache management for frequently accessed data"""
    
    # Cache key prefixes
    CACHE_PREFIX = {
        'user': 'user_{user_id}',
        'note': 'note_{note_id}',
        'dashboard': 'dashboard_{user_id}',
        'ai_history': 'ai_history_{user_id}',
        'user_stats': 'user_stats_{user_id}',
    }
    
    CACHE_TIMEOUT = {
        'user_profile': 300,      # 5 minutes
        'note_detail': 300,       # 5 minutes
        'dashboard': 180,          # 3 minutes
        'ai_history': 600,         # 10 minutes
        'user_stats': 900,         # 15 minutes
        'ai_results': 3600,        # 1 hour
    }
    
    @staticmethod
    def get_cache_key(prefix, **kwargs):
        """Generate cache key from prefix and arguments"""
        key = prefix
        for pl, value in kwargs.items():
            key = key.replace('{' + pl + '}', str(value))
        return key
    
    @staticmethod
    def invalidate_user_cache(user_id):
        """Invalidate all user-related caches"""
        cache_keys = [
            CacheOptimizer.get_cache_key(CacheOptimizer.CACHE_PREFIX['user'], user_id=user_id),
            CacheOptimizer.get_cache_key(CacheOptimizer.CACHE_PREFIX['dashboard'], user_id=user_id),
            CacheOptimizer.get_cache_key(CacheOptimizer.CACHE_PREFIX['ai_history'], user_id=user_id),
            CacheOptimizer.get_cache_key(CacheOptimizer.CACHE_PREFIX['user_stats'], user_id=user_id),
        ]
        cache.delete_many(cache_keys)
    
    @staticmethod
    def invalidate_note_cache(note_id, user_id=None):
        """Invalidate note-related caches"""
        cache_keys = [
            CacheOptimizer.get_cache_key(CacheOptimizer.CACHE_PREFIX['note'], note_id=note_id),
        ]
        if user_id:
            cache_keys.append(
                CacheOptimizer.get_cache_key(CacheOptimizer.CACHE_PREFIX['dashboard'], user_id=user_id)
            )
        cache.delete_many(cache_keys)


def cached_query(prefix, timeout=None, key_args=None):
    """
    Decorator for caching query results.
    
    Usage:
        @cached_query('user_profile', timeout=300, key_args=['user_id'])
        def get_user_data(user_id):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key
            cache_key = prefix
            if key_args:
                for arg_name in key_args:
                    if arg_name in kwargs:
                        cache_key = f"{cache_key}_{kwargs[arg_name]}"
            else:
                # Use hash of all arguments
                arg_hash = hashlib.md5(
                    str((args, sorted(kwargs.items()))).encode()
                ).hexdigest()
                cache_key = f"{cache_key}_{arg_hash}"
            
            # Check cache
            result = cache.get(cache_key)
            if result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Store in cache
            cache_timeout = timeout or 300
            cache.set(cache_key, result, cache_timeout)
            logger.debug(f"Cache set for {cache_key} ({cache_timeout}s)")
            
            return result
        
        return wrapper
    return decorator


def batch_query(queryset, batch_size=500):
    """
    Batch query execution for large datasets.
    Reduces memory usage and improves performance.
    
    Usage:
        for batch in batch_query(User.objects.all(), batch_size=1000):
            process_batch(batch)
    """
    total = queryset.count()
    for start in range(0, total, batch_size):
        end = min(start + batch_size, total)
        yield queryset[start:end]
