// FILE: src/services/note.service.js
// ============================================================================
// ⚡ OPTIMIZED - Request deduplication, better error handling

import api from './api';
import { API_ENDPOINTS } from '@/utils/constants';
import { requestDeduplicator } from '@/utils/requestDeduplication';
import { showToast } from '@/components/common/Toast';

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

 // Export note to PDF - FIXED VERSION with feedback
exportNotePDF: async (id, noteTitle) => {
  const loadingToastId = showToast.processing('Generating PDF... This may take a moment');
  
  try {
    const response = await api.post(`/api/notes/${id}/export_pdf/`, {}, {
      responseType: 'blob',
      timeout: 30000
    });

    // Check if it's a PDF by checking the content type or data type
    const contentType = response.headers['content-type'];
    const isPDF = contentType && contentType.includes('application/pdf');
    
    // Check if response status is successful (200-299)
    const isSuccess = response.status >= 200 && response.status < 300;
    
    if (!isSuccess || !isPDF) {
      // Try to parse as error JSON
      const errorText = await response.data.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || errorData.message || 'Failed to export PDF');
      } catch {
        throw new Error(`Server returned ${response.status}: ${errorText.substring(0, 100)}`);
      }
    }

    // Create filename
    const safeTitle = (noteTitle || 'note').replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0];
    const filename = `${safeTitle}_${date}.pdf`;

    // Create blob and download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);

    showToast.success('✓ PDF exported successfully');
    return { success: true, filename };

  } catch (error) {
    console.error('PDF export error:', error);
    
    // Check if it's a timeout error
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      showToast.error('PDF generation took too long. Please try again.');
      throw new Error('PDF generation is taking too long. Please try again.');
    }
    
    // Check if it's a network error vs server error
    if (error.message === 'Network Error' || !error.response) {
      showToast.error('Network error. Please check your connection.');
      throw new Error('Network error. Please check your connection.');
    }
    
    // Try to get error message from response
    if (error.response && error.response.data) {
      try {
        // If it's a blob, convert to text
        if (error.response.data instanceof Blob) {
          const errorText = await error.response.data.text();
          const errorData = JSON.parse(errorText);
          const errorMsg = errorData.error || errorData.message || 'Failed to export PDF';
          showToast.error(errorMsg);
          throw new Error(errorMsg);
        }
        // If it's already an object
        else if (typeof error.response.data === 'object') {
          const errorMsg = error.response.data.error || error.response.data.message || 'Failed to export PDF';
          showToast.error(errorMsg);
          throw new Error(errorMsg);
        }
      } catch (e) {
        // If we can't parse as JSON, use the original error
        showToast.error(error.message || 'Failed to export PDF');
        throw new Error(error.message || 'Failed to export PDF');
      }
    }
    
    showToast.error('Failed to export PDF');
    throw error;
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
    console.error('Standalone AI action error:', error);
    
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
    console.error('AI action error:', error);
    
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

// Update the runCode function
runCode: async ({ code, language, stdin = "", timeout = 15 }) => {
  try {
    const response = await api.post(
      "/api/notes/run_code/",
      { 
        code, 
        language, 
        stdin,
        timeout
      },
      { 
        timeout: (timeout + 5) * 1000, // Add buffer
        headers: {
          'Content-Type': 'application/json'
        }
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
    console.error("Code execution error:", error);
    
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
    
    if (error.message === "Network Error") {
      return {
        success: false,
        output: '',
        error: "Network error. Please check your internet connection."
      };
    }
    
    return {
      success: false,
      output: '',
      error: "Code execution failed. Please try again."
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
