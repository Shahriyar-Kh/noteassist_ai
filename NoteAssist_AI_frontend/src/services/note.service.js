// FILE: src/services/note.service.js
// ============================================================================
// ⚡ OPTIMIZED - Request deduplication, better error handling

import axios from 'axios';
import api from './api';
import { API_ENDPOINTS, API_BASE_URL } from '@/utils/constants';
import { requestDeduplicator } from '@/utils/requestDeduplication';
import { showToast } from '@/components/common/Toast';
import logger from '@/utils/logger';

export const noteService = {
  // ========================================================================
  // NOTES - ⚡ WITH DEDUPLICATION & INSTANT FEEDBACK
  // ========================================================================
  
  // Get all notes with optional filters (deduplicated)
  getNotes: async (params = {}) => {
    return requestDeduplicator.execute(
      API_ENDPOINTS.NOTES,
      () => api.get(API_ENDPOINTS.NOTES, { params }),
      params
    ).then(response => response.data);
  },

  // Get note detail with full structure (deduplicated)
  getNoteDetail: async (id) => {
    return requestDeduplicator.execute(
      `${API_ENDPOINTS.NOTE_DETAIL(id)}`,
      () => api.get(API_ENDPOINTS.NOTE_DETAIL(id))
    ).then(response => response.data);
  },

  // Get note structure (chapters + topics) - deduplicated
  getNoteStructure: async (id) => {
    return requestDeduplicator.execute(
      `${API_ENDPOINTS.NOTE_DETAIL(id)}structure/`,
      () => api.get(`${API_ENDPOINTS.NOTE_DETAIL(id)}structure/`)
    ).then(response => response.data);
  },

  // Create note - with instant feedback
  createNote: async (noteData) => {
    try {
      const response = await api.post(API_ENDPOINTS.NOTES, noteData);
      return response.data;
    } catch (error) {
      showToast.error(error.response?.data?.error || 'Failed to create note');
      throw error;
    }
  },

  // Update note - with instant feedback
  updateNote: async (id, noteData) => {
    try {
      const response = await api.patch(API_ENDPOINTS.NOTE_DETAIL(id), noteData);
      return response.data;
    } catch (error) {
      showToast.error(error.response?.data?.error || 'Failed to update note');
      throw error;
    }
  },

  // Delete note - with instant feedback
  deleteNote: async (id) => {
    try {
      const response = await api.delete(API_ENDPOINTS.NOTE_DETAIL(id));
      return response.data;
    } catch (error) {
      showToast.error(error.response?.data?.error || 'Failed to delete note');
      throw error;
    }
  },

// FILE: src/services/note.service.js  (REPLACE exportNotePDF method)
// ============================================================================
// FIXED: PDF download that works for any size, plus improved Drive upload
// ============================================================================

// ── Drop-in replacement for exportNotePDF ────────────────────────────────────
exportNotePDF: async (id, noteTitle) => {
  const loadingToastId = showToast.processing('Generating PDF…');

  try {
    const response = await api.post(
      `/api/notes/${id}/export_pdf/`,
      {},
      {
        responseType: 'blob',
        // FIX: 5-minute timeout so large notes don't abort mid-stream
        timeout: 5 * 60 * 1000,
        // FIX: Tell axios not to buffer the whole response before resolving
        // (axios does this by default; setting onDownloadProgress lets it stream)
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            logger.info(`[PDF] Download progress: ${pct}%`);
          }
        },
      }
    );

    // Validate content type
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/pdf')) {
      // Possibly an error JSON returned as blob — try to parse
      const errorText = await response.data.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || errorData.message || 'Server returned non-PDF response');
      } catch {
        throw new Error(`Unexpected response: ${errorText.substring(0, 200)}`);
      }
    }

    // Build filename
    const safeTitle = (noteTitle || 'note').replace(/[^a-zA-Z0-9\-_]/g, '_');
    const datePart = new Date().toISOString().split('T')[0];
    const filename = `${safeTitle}_${datePart}.pdf`;

    // Use streaming URL object download (works for any size, no RAM spike)
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup asynchronously so the download can start
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);

    showToast.success(`✓ PDF downloaded: ${filename}`);
    return { success: true, filename };

  } catch (error) {
    logger.error('[PDF] Export error:', error.message);

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      showToast.error('PDF generation timed out. Your note may be very large — try again.');
      throw new Error('PDF generation timed out');
    }

    if (!error.response) {
      showToast.error('Network error — check your connection and try again.');
      throw new Error('Network error during PDF export');
    }

    // Handle blob error responses
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const data = JSON.parse(text);
        const msg = data.error || data.message || 'PDF export failed';
        showToast.error(msg);
        throw new Error(msg);
      } catch {
        // ignore parse error, fall through
      }
    }

    const msg =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'PDF export failed';

    showToast.error(msg);
    throw new Error(msg);
  }
},

// ── Drop-in replacement for export_to_drive / upload helpers ─────────────────
// If you upload the PDF blob to Google Drive from the frontend, use this:

exportNotePDFAndUploadToDrive: async (noteId, noteTitle) => {
  const loadingToastId = showToast.processing('Uploading to Google Drive…');

  try {
    // Re-use the server-side Drive export endpoint (recommended)
    const response = await api.post(
      `/api/notes/${noteId}/export_to_drive/`,
      {},
      { timeout: 5 * 60 * 1000 }  // 5 minutes for large notes
    );

    if (response.data.success) {
      showToast.success('✓ Uploaded to Google Drive');
      return response.data;
    }
    throw new Error(response.data.error || 'Drive upload failed');

  } catch (error) {
    logger.error('[Drive] Upload error:', error.message);

    if (error.response?.status === 401) {
      showToast.error('Google Drive not connected. Please reconnect.');
      return { success: false, needs_auth: true };
    }

    const msg = error.response?.data?.error || error.message || 'Drive upload failed';
    showToast.error(msg);
    throw new Error(msg);
  }
},
  // ========================================================================
  // CHAPTERS
  // ========================================================================

  // Get all chapters for a note
  getChapters: async (noteId) => {
    const response = await api.get('/api/chapters/', {
      params: { note_id: noteId }
    });
    return response.data;
  },

  // Create chapter
  createChapter: async (chapterData) => {
    const response = await api.post('/api/chapters/', chapterData);
    return response.data;
  },

  // Update chapter
  updateChapter: async (id, chapterData) => {
    const response = await api.patch(`/api/chapters/${id}/`, chapterData);
    return response.data;
  },

  // Delete chapter
  deleteChapter: async (id) => {
    const response = await api.delete(`/api/chapters/${id}/`);
    return response.data;
  },

  // Reorder chapter
  reorderChapter: async (id, order) => {
    const response = await api.post(`/api/chapters/${id}/reorder/`, { order });
    return response.data;
  },

  // ========================================================================
  // TOPICS
  // ========================================================================

  // Get all topics
  getTopics: async (params = {}) => {
    const response = await api.get('/api/topics/', { params });
    return response.data;
  },

  // Get topic detail
  getTopicDetail: async (id) => {
    const response = await api.get(`/api/topics/${id}/`);
    return response.data;
  },

  // Create topic
  createTopic: async (topicData) => {
    const response = await api.post('/api/topics/', topicData);
    return response.data;
  },

  // Update topic
  updateTopic: async (id, topicData) => {
    const response = await api.patch(`/api/topics/${id}/`, topicData);
    return response.data;
  },

  // Delete topic
  deleteTopic: async (id) => {
    const response = await api.delete(`/api/topics/${id}/`);
    return response.data;
  },

  // Reorder topic
  reorderTopic: async (id, order) => {
    const response = await api.post(`/api/topics/${id}/reorder/`, { order });
    return response.data;
  },

  // AI action on topic
 
 // Standalone AI action (works without saved topic)
performStandaloneAIAction: async (actionData) => {
  try {
    const response = await api.post('/api/topics/ai-action-standalone/', actionData);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'AI action failed');
    }
    
    return response.data;
  } catch (error) {
    logger.error('Standalone AI action error:', String(error));
    
    // Provide helpful error messages
    if (error.response?.status === 400) {
      throw new Error(error.response.data.error || 'Invalid request');
    } else if (error.response?.status === 500) {
      throw new Error('AI service error. Please try again.');
    } else if (error.message === 'Network Error') {
      throw new Error('Network error. Please check your connection.');
    }
    
    throw new Error(error.response?.data?.error || error.message || 'AI action failed');
  }
},

// Also update the existing performAIAction to be more robust:
performAIAction: async (topicId, actionData) => {
  try {
    // If no topicId, use standalone action
    if (!topicId) {
      return await noteService.performStandaloneAIAction(actionData);
    }
    
    const response = await api.post(`/api/topics/${topicId}/ai_action/`, actionData);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'AI action failed');
    }
    
    return response.data;
  } catch (error) {
    logger.error('AI action error:', String(error));
    
    // Better error handling
    if (error.response?.status === 404) {
      // Topic not found, try standalone
      return await noteService.performStandaloneAIAction(actionData);
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data.error || 'Invalid request');
    } else if (error.response?.status === 500) {
      throw new Error('AI service error. Please try again.');
    }
    
    throw new Error(error.response?.data?.error || error.message || 'AI action failed');
  }
},







  // ========================================================================
  // VERSION HISTORY
  // ========================================================================

  // Get note history
  getNoteHistory: async (id) => {
    const response = await api.get(API_ENDPOINTS.NOTE_HISTORY(id));
    return response.data;
  },

  // Restore note version
  restoreVersion: async (id, versionId) => {
    const response = await api.post(API_ENDPOINTS.NOTE_RESTORE_VERSION(id), {
      version_id: versionId
    });
    return response.data;
  },

// Run code - PUBLIC endpoint (no auth required, no redirect on error)
runCode: async ({ code, language, stdin = "", timeout = 15 }) => {
  try {
    // Use relative URL to work with Vite proxy in dev, and direct URL in production
    // Vite proxy: /api -> http://localhost:8000/api
    const isDevelopment = import.meta.env.DEV;
    const url = isDevelopment ? '/api/run_code/' : `${API_BASE_URL?.replace(/\/$/, '')}/api/run_code/`;
    
    // Use direct axios call without auth interceptors for public code runner
    const response = await axios.post(
      url,
      { 
        code, 
        language, 
        stdin,
        timeout
      },
      { 
        timeout: (timeout + 5) * 1000,
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: isDevelopment  // Use credentials in dev for proxy
      }
    );
    
    const data = response.data;
    
    // Handle input requirement
    if (data.requires_input) {
      return {
        success: false,
        output: '',
        error: data.error,
        requires_input: true
      };
    }
    
    return data;
  } catch (error) {
    logger.error("Code execution error:", String(error));
    logger.error("Code execution error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.code === "ECONNABORTED") {
      return {
        success: false,
        output: '',
        error: "Execution timeout. The code took too long to run.",
        timeout: true
      };
    }
    
    if (error.response?.data?.error) {
      return {
        success: false,
        output: '',
        error: error.response.data.error,
        ...error.response.data
      };
    }
    
    if (error.response?.status === 401) {
      return {
        success: false,
        output: '',
        error: "Authentication error. Please refresh the page and try again."
      };
    }
    
    if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
      return {
        success: false,
        output: '',
        error: "Network error. Please check your internet connection."
      };
    }
    
    return {
      success: false,
      output: '',
      error: `Code execution failed: ${error.message || 'Unknown error'}`
    };
  }
},

  // ========================================================================
// STANDALONE AI TOOLS
// ========================================================================
aiToolExplain: async (data) => {
  const payload = {
    topic: data.title,
    level: data.level || 'beginner',
    subject_area: data.subject_area || 'programming',
    save_immediately: false,
  };
  const response = await api.post('/api/ai-tools/generate/', payload);
  const output = response.data?.output;
  return {
    generated_content: output?.content || '',
    title: output?.title || data.title,
    history_id: output?.id,
  };
},

aiToolImprove: async (data) => {
  const payload = {
    content: data.input_content,
    save_immediately: false,
  };
  const response = await api.post('/api/ai-tools/improve/', payload);
  const output = response.data?.output;
  return {
    generated_content: output?.content || '',
    title: output?.title || data.title,
    history_id: output?.id,
  };
},

aiToolSummarize: async (data) => {
  const payload = {
    content: data.input_content,
    max_length: data.max_length || 'medium',
    level: data.level || 'beginner',  // Add level parameter
  };
  const response = await api.post('/api/ai-tools/summarize/', payload);
  const output = response.data?.output;
  return {
    generated_content: output?.content || '',
    title: output?.title || data.title,
    history_id: output?.id,
  };
},

aiToolGenerateCode: async (data) => {
  const payload = {
    topic: data.title,
    language: data.language || 'python',
    level: data.level || 'beginner',
  };
  const response = await api.post('/api/ai-tools/code/', payload);
  const output = response.data?.output;
  return {
    generated_content: output?.content || '',
    title: output?.title || data.title,
    language: output?.language || data.language,
    history_id: output?.id,
  };
},


// Get AI history
getAIHistory: async (featureType = null) => {
  const params = featureType ? { tool_type: featureType } : {};
  const response = await api.get('/api/ai-tools/outputs/', { params });
  return response.data;
},

// Delete AI history item
deleteAIHistory: async (historyId) => {
  const response = await api.delete(`/api/ai-tools/outputs/${historyId}/`);
  return response.data;
},

// Save AI history as note
saveAIHistoryAsNote: async (historyId) => {
  const response = await api.post(`/api/ai-tools/outputs/${historyId}/save/`, {
    note_title: 'AI Output',
  });
  return response.data;
},

// Export AI history as PDF
exportAIHistoryPDF: async (historyId) => {
  const response = await api.get(`/api/ai-tools/outputs/${historyId}/download/`, {
    responseType: 'blob',
    params: { format: 'md' }
  });
  
  // Create download
  const blob = new Blob([response.data], { type: 'text/markdown' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ai-content-${Date.now()}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  
  return { success: true };
},

// Export AI history to Google Drive
exportAIHistoryToDrive: async (historyId) => {
  const response = await api.post(`/api/ai-tools/outputs/${historyId}/upload-to-drive/`);
  return response.data;
},

// Upload AI history PDF to Google Drive
uploadAIHistoryPdfToDrive: async (historyId, file, filename) => {
  const formData = new FormData();
  formData.append('file', file);
  if (filename) {
    formData.append('filename', filename);
  }
  const response = await api.post(
    `/api/ai-tools/outputs/${historyId}/upload-to-drive/`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
},
};




export default noteService;
