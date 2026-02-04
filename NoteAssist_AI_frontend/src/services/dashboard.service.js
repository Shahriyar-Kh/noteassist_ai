import api from './api';

const DASHBOARD_BASE = '/api/dashboard';

const dashboardService = {
  // Get dashboard overview with cached statistics
  getOverview: async () => {
    const response = await api.get(`${DASHBOARD_BASE}/overview/`);
    return response.data;
  },

  // Get recent 5 notes with metadata
  getRecentNotes: async () => {
    const response = await api.get(`${DASHBOARD_BASE}/recent_notes/`);
    return response.data;
  },

  // Get last 20 activity log entries
  getActivity: async () => {
    const response = await api.get(`${DASHBOARD_BASE}/activity/`);
    return response.data;
  },

  // Get AI usage stats by type with 7-day trend
  getAIStats: async () => {
    const response = await api.get(`${DASHBOARD_BASE}/ai_stats/`);
    return response.data;
  },
};

export default dashboardService;