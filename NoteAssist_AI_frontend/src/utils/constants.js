// FILE: src/utils/constants.js
// ============================================================================

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/token/',
  REFRESH: '/api/token/refresh/',
  REGISTER: '/api/auth/register/',
  LOGOUT: '/api/auth/logout/',
  ME: '/api/auth/users/me/',
 
    // Profile endpoints
  PROFILE: '/api/profile/',
  PROFILE_AVATAR: '/api/profile/avatar/',
  PROFILE_DELETE_AVATAR: '/api/profile/delete-avatar/',
  PROFILE_PREFERENCES: '/api/profile/preferences/',
  PROFILE_NOTIFICATIONS: '/api/profile/notifications/',
  PROFILE_CHANGE_PASSWORD: '/api/profile/change-password/',
  PROFILE_ACTIVITY: '/api/profile/activity/',
  PROFILE_ACTIVITY_LOG: '/api/profile/activity-log/',

  
    // Notes
  NOTES: '/api/notes/',
  NOTE_DETAIL: (id) => `/api/notes/${id}/`,
  NOTE_HISTORY: (id) => `/api/notes/${id}/versions/`,
  NOTE_RESTORE_VERSION: (id) => `/api/notes/${id}/restore_version/`,
  NOTE_DUPLICATE: (id) => `/api/notes/${id}/duplicate/`,
  NOTE_AI_ACTION: '/api/notes/ai_action/',
  NOTE_APPROVE_AI: '/api/notes/approve_ai_content/',
  NOTE_IMPORT_YOUTUBE: '/api/notes/import_youtube/',
  NOTE_EXPORT_PDF: (id) => `/api/notes/${id}/export_pdf/`,
  NOTE_DAILY: '/api/notes/daily_notes/',
};

export const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High School' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'professional', label: 'Professional' },
];

export const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner', color: 'green' },
  { value: 'intermediate', label: 'Intermediate', color: 'yellow' },
  { value: 'advanced', label: 'Advanced', color: 'red' },
];

export const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'gray' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'high', label: 'High', color: 'red' },
];
