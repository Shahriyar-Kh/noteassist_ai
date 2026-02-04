import api from './api';

const AI_TOOLS_BASE = '/api/ai-tools';

const aiToolsService = {
  // Generate topic explanation
  generate: async (data) => {
    const response = await api.post(`${AI_TOOLS_BASE}/generate/`, data);
    return response.data;
  },

  // Improve existing topic
  improve: async (data) => {
    const response = await api.post(`${AI_TOOLS_BASE}/improve/`, data);
    return response.data;
  },

  // Summarize content
  summarize: async (data) => {
    const response = await api.post(`${AI_TOOLS_BASE}/summarize/`, data);
    return response.data;
  },

  // Generate code snippet
  generateCode: async (data) => {
    const response = await api.post(`${AI_TOOLS_BASE}/code/`, data);
    return response.data;
  },

  // Get all AI outputs
  getOutputs: async (params = {}) => {
    const response = await api.get(`${AI_TOOLS_BASE}/outputs/`, { params });
    return response.data;
  },

  // Get single output
  getOutput: async (id) => {
    const response = await api.get(`${AI_TOOLS_BASE}/outputs/${id}/`);
    return response.data;
  },

  // Save output to note
  saveToNote: async (id, data) => {
    const response = await api.post(`${AI_TOOLS_BASE}/outputs/${id}/save/`, data);
    return response.data;
  },

  // Download output
  downloadOutput: async (id) => {
    const response = await api.get(`${AI_TOOLS_BASE}/outputs/${id}/download/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Delete output
  deleteOutput: async (id) => {
    await api.delete(`${AI_TOOLS_BASE}/outputs/${id}/`);
  },

  // Upload output to Google Drive
  uploadToDrive: async (id, folderId = 'root') => {
    const response = await api.post(
      `${AI_TOOLS_BASE}/outputs/${id}/upload-to-drive/`,
      null,
      { params: { folder_id: folderId } }
    );
    return response.data;
  },

  // Get usage history
  getUsageHistory: async (params = {}) => {
    const response = await api.get(`${AI_TOOLS_BASE}/usage-history/`, { params });
    return response.data;
  },

  // Get quota status
  getQuota: async () => {
    const response = await api.get(`${AI_TOOLS_BASE}/quota/`);
    return response.data;
  },
};

export default aiToolsService;
