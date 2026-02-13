#!/usr/bin/env python
import os
import sys
import django

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'NoteAssist_AI_Backend'))

os.chdir(os.path.join(os.path.dirname(__file__), 'NoteAssist_AI_Backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'NoteAssist_AI.settings')
django.setup()

from django.db import connection
from django.core.cache import cache

# Check if cache table exists
try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM django_cache_table LIMIT 1")
        result = cursor.fetchone()
        print("✅ Cache table exists!")
except Exception as e:
    print(f"❌ Cache table error: {e}")

# Test cache functionality
try:
    cache.set('test_key', 'test_value', 60)
    value = cache.get('test_key')
    print(f"✅ Cache working! Value: {value}")
except Exception as e:
    print(f"❌ Cache error: {e}")
