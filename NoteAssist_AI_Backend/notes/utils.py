# FILE: notes/utils.py - Backward compatibility wrappers
# ============================================================================
"""
Legacy utility functions for backward compatibility.
New code should use the specialized services directly:
- notes.ai_service for AI operations
- notes.pdf_service for PDF exports
"""

from html import unescape
import re

# Import from specialized services
from .pdf_service import export_note_to_pdf
from .ai_service import (
    generate_ai_explanation,
    improve_explanation,
    summarize_explanation,
    generate_ai_code,
    get_ai_service
)


def format_text_for_pdf(html_content):
    """
    Convert HTML content to plain text suitable for PDF fallback rendering.
    Strips HTML tags and decodes HTML entities.
    Previously imported from pdf_service; now lives here.
    """
    if not html_content:
        return ""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', html_content)
    # Decode HTML entities
    text = unescape(text)
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


__all__ = [
    # PDF Export
    'export_note_to_pdf',
    'format_text_for_pdf',

    # AI Functions
    'generate_ai_explanation',
    'improve_explanation',
    'summarize_explanation',
    'generate_ai_code',
    'get_ai_service',
]