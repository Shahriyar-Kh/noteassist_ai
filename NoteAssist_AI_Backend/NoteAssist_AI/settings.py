import os
from pathlib import Path
from datetime import timedelta
from decouple import config
import dj_database_url
import logging

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent

# Create necessary directories
os.makedirs(BASE_DIR / 'static', exist_ok=True)
os.makedirs(BASE_DIR / 'logs', exist_ok=True)

# ============================================================================
# Production/Development Configuration
# ============================================================================
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
DEBUG = os.getenv('DEBUG', 'True' if ENVIRONMENT == 'development' else 'False') == 'True'

SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-key-change-in-production')

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1' if DEBUG else 'localhost,127.0.0.1',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

# Add Render hostname if exists
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'django_celery_beat',
    'accounts.apps.AccountsConfig',
    'profiles.apps.ProfilesConfig',
    'notes.apps.NotesConfig',
    'ai_tools',
    'dashboard',
    'admin_analytics',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # WhiteNoise for static files in production
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.gzip.GZipMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'accounts.middleware.guest_middleware.GuestSessionMiddleware',  # Guest session management
    'accounts.middleware.blocking_middleware.UserBlockingMiddleware',  # ✅ ADD THIS LINE
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'utils.middleware.CacheHeadersMiddleware',
    'utils.middleware.QueryCountDebugMiddleware',
]

ROOT_URLCONF = 'NoteAssist_AI.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'NoteAssist_AI.wsgi.application'

# ============================================================================
# Database Configuration - Supabase PostgreSQL via DATABASE_URL
# ============================================================================
import dj_database_url

DATABASE_URL = config('DATABASE_URL', default=None)

# ============================================================================
# Database Configuration - Production OPTIMIZED for Supabase PostgreSQL
# ============================================================================
if DATABASE_URL:
    # Parse DATABASE_URL using dj-database-url (Supabase/PostgreSQL)
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,                  # ⚡ IMPROVED: 10 min connection lifetime
            conn_health_checks=True,           # Keep connections alive
            ssl_require=True,                  # Force SSL for Supabase
        )
    }
    
    # ⚡ ADVANCED DATABASE OPTIMIZATIONS FOR SUPABASE + RENDER
    DATABASES['default']['ATOMIC_REQUESTS'] = False  # Allow more concurrency
    DATABASES['default']['AUTOCOMMIT'] = True         # Auto-commit for better concurrency
    DATABASES['default']['CONN_MAX_AGE'] = 600        # Connection pool timeout
    DATABASES['default']['OPTIONS'] = {
        'connect_timeout': 10,
        'options': '-c statement_timeout=30000 -c default_transaction_isolation=read_committed',
        'keepalives': 1,
        'keepalives_idle': 30,
        'keepalives_interval': 10,
        'keepalives_count': 5,
        'tcp_user_timeout': 30000,
        # ⚡ NEW: Connection pool options for better resource usage
        'sslmode': 'require',
        'application_name': 'noteassist_api',
    }
    
    # ⚡ NEW: Supabase-specific optimization - reduce connection overhead
    if 'supabase' in DATABASE_URL.lower():
        DATABASES['default']['OPTIONS']['connect_timeout'] = 5
        DATABASES['default']['CONN_MAX_AGE'] = 300  # Shorter for Supabase free-tier
        DATABASES['default']['OPTIONS']['application_name'] = 'noteassist_render'
else:
    # Development: SQLite3 (local)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ============================================================================
# Redis Configuration - For Caching & Celery (⚡ PRODUCTION OPTIMIZED)
# ============================================================================
REDIS_URL = config('REDIS_URL', default=None)

# ⚡ INTELLIGENT CACHING STRATEGY (production-ready with advanced pooling)
# Check if Redis is actually available (for Render free-tier compatibility)
REDIS_AVAILABLE = False
if REDIS_URL and 'redis' in REDIS_URL:
    try:
        import redis
        r = redis.from_url(REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
        r.ping()
        REDIS_AVAILABLE = True
    except Exception:
        REDIS_AVAILABLE = False

if ENVIRONMENT == 'production' and REDIS_AVAILABLE:
    # Production: Redis for speed & scalability with pgbouncer-like pooling
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'KEY_PREFIX': 'noteassist',
            'TIMEOUT': 300,  # 5 minutes default
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.HerdClient',  # ⚡ Prevent cache stampede
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'retry_on_timeout': True,
                    'socket_keepalive': True,
                    'socket_keepalive_options': {
                        1: 1,  # TCP_KEEPIDLE
                        2: 1,  # TCP_KEEPINTVL
                        3: 1,  # TCP_KEEPCNT
                    }
                },
                'SOCKET_TIMEOUT': 5,
                'SOCKET_KEEPALIVE': True,
                'SOCKET_KEEPALIVE_OPTIONS': {
                    1: 1,
                    2: 1,
                    3: 1,
                },
                'SOCKET_CONNECT_TIMEOUT': 5,
                'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
                'IGNORE_EXCEPTIONS': False,  # ⚡ Fail explicitly, don't hide errors
                'PARSER_KWARGS': {
                    'use_connection_pool': True,
                },
            },
        },
        'ai_cache': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'KEY_PREFIX': 'noteassist_ai',
            'TIMEOUT': 3600,  # 1 hour for AI results
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.HerdClient',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 30,
                    'retry_on_timeout': True,
                },
                'SOCKET_TIMEOUT': 5,
                'SOCKET_KEEPALIVE': True,
                'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            },
        },
        'session': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'KEY_PREFIX': 'noteassist_session',
            'TIMEOUT': 2592000,  # 30 days for sessions
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 25,
                    'retry_on_timeout': True,
                },
                'SOCKET_TIMEOUT': 5,
            },
        },
    }
    # Use Redis sessions for production
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
    SESSION_CACHE_ALIAS = 'session'
elif ENVIRONMENT == 'production':
    # 🆓 Render Free-Tier: Database-backed caching (no Redis)
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
            'LOCATION': 'django_cache_table',
            'TIMEOUT': 300,
        },
        'ai_cache': {
            'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
            'LOCATION': 'django_cache_table',
            'TIMEOUT': 3600,
        },
        'session': {
            'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
            'LOCATION': 'django_cache_table',
            'TIMEOUT': 2592000,
        },
    }
    # Database sessions for free tier
    SESSION_ENGINE = 'django.contrib.sessions.backends.db'
else:
    # Development: In-memory caching (no external dependencies)
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'studynotes-cache',
            'TIMEOUT': 300,
        },
        'ai_cache': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'ai-cache',
            'TIMEOUT': 3600,
        },
        'session': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'session-cache',
            'TIMEOUT': 2592000,
        },
    }
    # Development: Database sessions
    SESSION_ENGINE = 'django.contrib.sessions.backends.db'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ============================================================================
# Static and Media Files
# ============================================================================
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [BASE_DIR / 'static']

if ENVIRONMENT == 'production':
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
else:
    STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Create media directories
os.makedirs(os.path.join(MEDIA_ROOT, 'avatars'), exist_ok=True)
os.makedirs(os.path.join(MEDIA_ROOT, 'notes', 'images'), exist_ok=True)
os.makedirs(os.path.join(MEDIA_ROOT, 'notes', 'pdfs'), exist_ok=True)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'accounts.User'

# Authentication Backends
AUTHENTICATION_BACKENDS = [
    'accounts.backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# REST Framework - ⚡ OPTIMIZED FOR PERFORMANCE
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,                               # ⚡ Increased from 20 for fewer requests
    'MAX_PAGE_SIZE': 100,
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'utils.throttling.BurstRateThrottle',
        'utils.throttling.SustainedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'burst': '100/min',            # ⚡ Increased for better UX
        'sustained': '10000/day',      # ⚡ Increased for scaling
        'ai_tools': '30/hour',          # ⚡ Increased for AI tools
    },
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ] if not DEBUG else [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_METADATA_CLASS': 'rest_framework.metadata.SimpleMetadata',  # ⚡ Less overhead
    'COMPACT_JSON': True,                  # ⚡ Reduce response size
    'NUM_PROXIES': 1 if ENVIRONMENT == 'production' else None,  # ⚡ For Render proxy
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
}

# ============================================================================
# CORS Settings
# ============================================================================
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:5173',
    ]
else:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [
        'https://noteassistai.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000',
    ]

# Only override with config if not in DEBUG mode
if not DEBUG:
    CORS_ALLOWED_ORIGINS = config(
        'CORS_ALLOWED_ORIGINS',
        default=','.join(CORS_ALLOWED_ORIGINS),
        cast=lambda v: [s.strip() for s in v.split(',')]
    )

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
CORS_EXPOSE_HEADERS = ['Content-Disposition', 'Content-Length']  # Expose headers for file downloads
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'access-control-allow-credentials',
    'access-control-allow-origin',
]
CORS_PREFLIGHT_MAX_AGE = 86400

# Celery Configuration - ⚡ OPTIMIZED FOR RENDER FREE-TIER
if REDIS_AVAILABLE:
    # Use Redis if available
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
else:
    # 🆓 Free-tier: Use database as broker (slower but works)
    CELERY_BROKER_URL = f"sqla+{DATABASE_URL}" if DATABASE_URL else 'sqla://sqlite:///celery.db'
    CELERY_RESULT_BACKEND = f"db+{DATABASE_URL}" if DATABASE_URL else 'db+sqlite:///celery.db'

CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# ⚡ ADVANCED CELERY OPTIMIZATIONS
CELERY_TASK_TRACK_STARTED = True              # Track when tasks start
CELERY_TASK_TIME_LIMIT = 30 * 60              # 30 min hard timeout
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60         # 25 min soft timeout
CELERY_WORKER_PREFETCH_MULTIPLIER = 4         # ⚡ Reduce for limited resources
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000      # Restart worker after 1000 tasks
CELERY_BROKER_CONNECTION_RETRY = True
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_CONNECTION_MAX_RETRIES = 10
CELERY_BROKER_RETRY_ON_TIMEOUT = True

# ⚡ Task routing for priority handling
CELERY_TASK_ROUTES = {
    'notes.tasks.send_daily_digest': {'queue': 'high_priority'},
    'accounts.tasks.send_reset_email': {'queue': 'high_priority'},
    'ai_tools.tasks.generate_ai_content': {'queue': 'default'},
    'notes.tasks.sync_google_drive': {'queue': 'low_priority'},
}

# ⚡ Task defaults for faster execution
CELERY_TASK_DEFAULT_RETRY_DELAY = 60          # 1 min initial retry
CELERY_TASK_MAX_RETRIES = 3                   # Max 3 retries
CELERY_RESULT_EXPIRES = 3600                  # Results expire after 1 hour

# GZip Settings
GZIP_COMPRESSION_LEVEL = 6
GZIP_MINIMUM_SIZE = 1024

# Email Configuration
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000' if DEBUG else 'https://noteassistai.vercel.app')
SENDGRID_API_KEY = config('SENDGRID_API_KEY', default='').strip()
SENDGRID_FROM_EMAIL = config('SENDGRID_FROM_EMAIL', default='').strip()
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
EMAIL_TIMEOUT = 30
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@noteassist.ai')
EMAIL_SUBJECT_PREFIX = '[NoteAssist AI] '
MAX_EMAIL_RETRIES = 3
EMAIL_RETRY_DELAY = 2

if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    if SENDGRID_API_KEY and len(SENDGRID_API_KEY) > 20:
        EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
        EMAIL_HOST = 'smtp.sendgrid.net'
        EMAIL_PORT = 587
        EMAIL_USE_TLS = True
        EMAIL_HOST_USER = 'apikey'
        EMAIL_HOST_PASSWORD = SENDGRID_API_KEY
    elif EMAIL_HOST and EMAIL_PORT:
        EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    else:
        EMAIL_BACKEND = 'django.core.mail.backends.dummy.EmailBackend'

# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID = config('GOOGLE_OAUTH_CLIENT_ID', default='')
GOOGLE_OAUTH_CLIENT_SECRET = config('GOOGLE_OAUTH_CLIENT_SECRET', default='')
GOOGLE_OAUTH_CONFIGURED = bool(GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET)
BACKEND_URL = config('BACKEND_URL', default='http://localhost:8000' if DEBUG else 'https://noteassist-ai.onrender.com')
GOOGLE_DRIVE_REDIRECT_URI = f"{BACKEND_URL}/api/notes/google-callback/"

# AI Configuration
GROQ_API_KEY = config('GROQ_API_KEY', default='')
OPENAI_API_KEY = config('OPENAI_API_KEY', default='')
AI_SETTINGS = {
    'DEFAULT_MODEL': 'llama-3.3-70b-versatile',
    'MAX_TOKENS': 2000,
    'TEMPERATURE': 0.7,
    'CACHE_TIMEOUT': 3600,
}

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt']

# Session Settings
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_NAME = 'noteassist_sessionid'
SESSION_COOKIE_AGE = 1209600
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
CSRF_COOKIE_SAMESITE = 'Lax'

if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
else:
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose'
        },
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'accounts': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'google.auth': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# API Docs
SPECTACULAR_SETTINGS = {
    'TITLE': 'NoteAssist AI Backend',
    'VERSION': '1.0.0',
    'DESCRIPTION': 'AI-Powered Study Notes Platform',
}

# Custom 404 Handler
def custom_404(request, exception=None):
    from django.http import JsonResponse
    return JsonResponse({
        'error': 'Not Found',
        'message': 'The requested resource was not found on this server.',
        'status_code': 404,
        'available_endpoints': {
            'root': '/',
            'admin': '/admin/',
            'token_obtain': '/api/token/',
            'token_refresh': '/api/token/refresh/',
            'auth': '/api/auth/',
            'profile': '/api/profile/',
            'dashboard': '/api/dashboard/',
            'notes': '/api/',
            'ai_tools': '/api/ai-tools/',
        }
    }, status=404)

handler404 = 'NoteAssist_AI.settings.custom_404'

# ============================================================================
# Security Settings
# ============================================================================
if ENVIRONMENT == 'production':
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
else:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

logger.info(f"✅ NoteAssist AI Settings loaded successfully (Environment: {ENVIRONMENT}, Debug: {DEBUG})")
