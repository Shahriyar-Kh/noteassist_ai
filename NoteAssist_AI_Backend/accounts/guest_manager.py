"""
Guest User Session Manager
Handles guest user sessions and usage limits for free trial access
"""
from django.conf import settings
import uuid


class GuestSessionManager:
    """
    Manages guest user sessions and tracks usage limits.
    Uses Django sessions to maintain state across requests.
    """
    
    # Session keys
    SESSION_KEY_GUEST = 'is_guest_user'
    SESSION_KEY_GUEST_ID = 'guest_user_id'
    SESSION_KEY_NOTES_CREATED = 'guest_notes_created'
    SESSION_KEY_AI_USAGE = 'guest_ai_usage'
    
    # Guest limits
    MAX_NOTES = 1
    MAX_AI_TOOL_ATTEMPTS = {
        'generate_topic': 1,
        'improve_topic': 1,
        'summarize_topic': 1,
        'generate_code': 1,
    }
    
    @staticmethod
    def initialize_guest_session(request):
        """Initialize a new guest session"""
        request.session[GuestSessionManager.SESSION_KEY_GUEST] = True
        request.session[GuestSessionManager.SESSION_KEY_GUEST_ID] = str(uuid.uuid4())
        request.session[GuestSessionManager.SESSION_KEY_NOTES_CREATED] = 0
        request.session[GuestSessionManager.SESSION_KEY_AI_USAGE] = {
            'generate_topic': 0,
            'improve_topic': 0,
            'summarize_topic': 0,
            'generate_code': 0,
        }
        request.session.modified = True
        return request.session[GuestSessionManager.SESSION_KEY_GUEST_ID]
    
    @staticmethod
    def is_guest(request):
        """Check if current session is a guest user"""
        return request.session.get(GuestSessionManager.SESSION_KEY_GUEST, False)
    
    @staticmethod
    def get_guest_id(request):
        """Get guest user ID from session"""
        return request.session.get(GuestSessionManager.SESSION_KEY_GUEST_ID)
    
    @staticmethod
    def can_create_note(request):
        """Check if guest can create a note"""
        if not GuestSessionManager.is_guest(request):
            return True  # Not a guest, no restrictions
        
        notes_created = request.session.get(GuestSessionManager.SESSION_KEY_NOTES_CREATED, 0)
        return notes_created < GuestSessionManager.MAX_NOTES
    
    @staticmethod
    def increment_note_count(request):
        """Increment guest's note creation count"""
        if GuestSessionManager.is_guest(request):
            notes_created = request.session.get(GuestSessionManager.SESSION_KEY_NOTES_CREATED, 0)
            request.session[GuestSessionManager.SESSION_KEY_NOTES_CREATED] = notes_created + 1
            request.session.modified = True
    
    @staticmethod
    def get_note_count(request):
        """Get number of notes created by guest"""
        return request.session.get(GuestSessionManager.SESSION_KEY_NOTES_CREATED, 0)
    
    @staticmethod
    def can_use_ai_tool(request, tool_name):
        """Check if guest can use a specific AI tool"""
        if not GuestSessionManager.is_guest(request):
            return True  # Not a guest, no restrictions
        
        ai_usage = request.session.get(GuestSessionManager.SESSION_KEY_AI_USAGE, {})
        current_usage = ai_usage.get(tool_name, 0)
        max_attempts = GuestSessionManager.MAX_AI_TOOL_ATTEMPTS.get(tool_name, 0)
        
        return current_usage < max_attempts
    
    @staticmethod
    def increment_ai_tool_usage(request, tool_name):
        """Increment guest's AI tool usage count"""
        if GuestSessionManager.is_guest(request):
            ai_usage = request.session.get(GuestSessionManager.SESSION_KEY_AI_USAGE, {})
            ai_usage[tool_name] = ai_usage.get(tool_name, 0) + 1
            request.session[GuestSessionManager.SESSION_KEY_AI_USAGE] = ai_usage
            request.session.modified = True
    
    @staticmethod
    def get_ai_tool_usage(request, tool_name):
        """Get AI tool usage count for guest"""
        ai_usage = request.session.get(GuestSessionManager.SESSION_KEY_AI_USAGE, {})
        return ai_usage.get(tool_name, 0)
    
    @staticmethod
    def get_guest_stats(request):
        """Get all guest usage statistics"""
        if not GuestSessionManager.is_guest(request):
            return None
        
        return {
            'guest_id': GuestSessionManager.get_guest_id(request),
            'notes_created': GuestSessionManager.get_note_count(request),
            'notes_limit': GuestSessionManager.MAX_NOTES,
            'can_create_note': GuestSessionManager.can_create_note(request),
            'ai_usage': request.session.get(GuestSessionManager.SESSION_KEY_AI_USAGE, {}),
            'ai_limits': GuestSessionManager.MAX_AI_TOOL_ATTEMPTS,
        }
    
    @staticmethod
    def clear_guest_session(request):
        """Clear guest session data"""
        keys_to_remove = [
            GuestSessionManager.SESSION_KEY_GUEST,
            GuestSessionManager.SESSION_KEY_GUEST_ID,
            GuestSessionManager.SESSION_KEY_NOTES_CREATED,
            GuestSessionManager.SESSION_KEY_AI_USAGE,
        ]
        for key in keys_to_remove:
            if key in request.session:
                del request.session[key]
        request.session.modified = True
