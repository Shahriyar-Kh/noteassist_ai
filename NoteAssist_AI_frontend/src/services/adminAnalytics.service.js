import api from './api';

const ADMIN_BASE = '/api/admin/analytics';

const adminAnalyticsService = {
  // Get overview metrics
  getOverview: async () => {
    const response = await api.get(`${ADMIN_BASE}/overview/`);
    return response.data;
  },

  // Get user metrics
  getUserMetrics: async () => {
    const response = await api.get(`${ADMIN_BASE}/user_metrics/`);
    return response.data;
  },

  // Get AI usage metrics
  getAIMetrics: async () => {
    const response = await api.get(`${ADMIN_BASE}/ai_metrics/`);
    return response.data;
  },
};

export default adminAnalyticsService;
