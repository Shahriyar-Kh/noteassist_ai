#!/usr/bin/env python
"""Test Judge0 code execution"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'NoteAssist_AI_Backend'))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'NoteAssist_AI.settings')

import django
django.setup()

from notes.code_execution_service import CodeExecutionService

print("=" * 60)
print("Testing Judge0 Code Execution")
print("=" * 60)

# Test 1: Simple Python
print("\n✓ Test 1: Simple Python")
result = CodeExecutionService.execute_code('print("Hello from Judge0!")', 'python')
print(f"Success: {result['success']}")
print(f"Output: {result['output']}")
if result['error']:
    print(f"Error: {result['error']}")
print(f"Runtime: {result['runtime_ms']}ms")

# Test 2: With input
print("\n✓ Test 2: Python with stdin")
result = CodeExecutionService.execute_code('name = input()\nprint(f"Hello {name}")', 'python', stdin='World')
print(f"Success: {result['success']}")
print(f"Output: {result['output']}")
if result['error']:
    print(f"Error: {result['error']}")

# Test 3: JavaScript
print("\n✓ Test 3: JavaScript")
result = CodeExecutionService.execute_code('console.log("Hello from JavaScript!");', 'javascript')
print(f"Success: {result['success']}")
print(f"Output: {result['output']}")
if result['error']:
    print(f"Error: {result['error']}")

print("\n" + "=" * 60)
print("All tests completed!")
print("=" * 60)
