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
    // ✅ Transform API response to include breakdown by tool type
    const data = response.data;
    
    // Ensure we have the tool breakdown structure
    if (data.ai_usage && !data.usage_by_tool) {
      data.usage_by_tool = {
        generate: data.generate_count || 0,
        improve: data.improve_count || 0,
        summarize: data.summarize_count || 0,
        code: data.code_count || 0,
        total: data.ai_usage
      };
    }
    
    return data;
  },

  // Get AI usage breakdown by tool type
  getAIToolBreakdown: async () => {
    try {
      const response = await api.get(`${DASHBOARD_BASE}/ai_stats/`);
      const data = response.data;
      
      return {
        generate: {
          name: 'Generate Topic',
          count: data.generate_count || 0,
          icon: 'sparkles',
          color: 'bg-blue-100 text-blue-800'
        },
        improve: {
          name: 'Improve Content',
          count: data.improve_count || 0,
          icon: 'zap',
          color: 'bg-purple-100 text-purple-800'
        },
        summarize: {
          name: 'Summarize',
          count: data.summarize_count || 0,
          icon: 'file-text',
          color: 'bg-green-100 text-green-800'
        },
        code: {
          name: 'Generate Code',
          count: data.code_count || 0,
          icon: 'code',
          color: 'bg-orange-100 text-orange-800'
        },
        total: data.ai_usage || 0
      };
    } catch (error) {
      console.error('Error getting AI tool breakdown:', error);
      return {
        generate: { name: 'Generate Topic', count: 0, icon: 'sparkles', color: 'bg-blue-100 text-blue-800' },
        improve: { name: 'Improve Content', count: 0, icon: 'zap', color: 'bg-purple-100 text-purple-800' },
        summarize: { name: 'Summarize', count: 0, icon: 'file-text', color: 'bg-green-100 text-green-800' },
        code: { name: 'Generate Code', count: 0, icon: 'code', color: 'bg-orange-100 text-orange-800' },
        total: 0
      };
    }
  },

  // Get user's plan and quota information
  getPlanInfo: async () => {
    try {
      const response = await api.get(`${DASHBOARD_BASE}/plan_info/`);
      return response.data;
    } catch (error) {
      console.error('Error getting plan info:', error);
      return null;
    }
  },
};

export default dashboardService;