// FILE: src/services/adminAnalytics.service.js
// Comprehensive Admin Analytics Service - User Management + AI Analytics
// ============================================================================

import api from './api';

const ADMIN_BASE = '/api/admin/analytics';
const USER_MGMT_BASE = '/api/accounts/admin/user-management';

const adminAnalyticsService = {

  // =========================================================================
  // OVERVIEW / EXISTING ENDPOINTS
  // =========================================================================

  /** Get platform overview metrics */
  getOverview: async () => {
    const response = await api.get(`${ADMIN_BASE}/overview/`);
    return response.data;
  },

  /** Get AI usage metrics */
  getAIMetrics: async () => {
    const response = await api.get(`${ADMIN_BASE}/ai_metrics/`);
    return response.data;
  },

  // =========================================================================
  // USER MANAGEMENT
  // =========================================================================

  /**
   * Get paginated list of all users with optional filters
   * @param {Object} params - { page, search, plan_type, status, sort_by }
   * @returns {{ results: [], count: number, pages: number }}
   */
  getAllUsers: async (params = {}) => {
    const response = await api.get(`${USER_MGMT_BASE}/all_users/`, { params });
    return response.data;
  },

  /**
   * Get user statistics overview for the management page stats cards
   * @returns {Object} stats with totals, growth percentages, trends
   */
  getUserStats: async () => {
    const response = await api.get(`${USER_MGMT_BASE}/stats/`);
    return response.data;
  },

  /**
   * Get insight data for leaderboards / analytics cards
   * @param {string} type - 'top_creators' | 'ai_power_users' | 'most_published' | 'new_users' | 'active_users'
   * @param {number} limit - number of records to return (default 10)
   */
  getUserInsights: async (filter, limit = 10) => {
    const response = await api.get(`${USER_MGMT_BASE}/insights/`, {
      params: { filter, limit },
    });
    return response.data;
  },

  /**
   * Get detailed profile for a single user
   * @param {number|string} userId
   */
  getUserDetail: async (userId) => {
    const response = await api.get(`${USER_MGMT_BASE}/${userId}/user_detail/`);
    return response.data;
  },

  // =========================================================================
  // USER ACTIONS
  // =========================================================================

  /**
   * Block a user account
   * @param {number|string} userId
   * @param {string} reason - optional reason for blocking
   */
  blockUser: async (userId, reason = '') => {
    const response = await api.post(`${USER_MGMT_BASE}/${userId}/block_user/`, { reason });
    return response.data;
  },

  /**
   * Unblock a user account
   * @param {number|string} userId
   */
  unblockUser: async (userId) => {
    const response = await api.post(`${USER_MGMT_BASE}/${userId}/unblock_user/`);
    return response.data;
  },

  /**
   * Update AI usage limits for a user
   * @param {number|string} userId
   * @param {Object} limits - { daily_limit, weekly_limit, monthly_limit }
   */
  updateLimits: async (userId, limits) => {
    const response = await api.post(`${USER_MGMT_BASE}/${userId}/update_limits/`, limits);
    return response.data;
  },

  /**
   * Toggle feature access for a user
   * @param {number|string} userId
   * @param {string} feature - 'ai_tools' | 'export_pdf' | 'google_drive'
   * @param {boolean} enabled
   */
  toggleFeatureAccess: async (userId, feature, enabled) => {
    const response = await api.post(`${USER_MGMT_BASE}/${userId}/toggle_feature_access/`, {
      feature,
      enabled,
    });
    return response.data;
  },

  /**
   * Change a user's subscription plan
   * @param {number|string} userId
   * @param {string} plan - 'free' | 'basic' | 'premium'
   */
  changePlan: async (userId, plan) => {
    const response = await api.post(`${USER_MGMT_BASE}/${userId}/change_plan/`, {
      plan_type: plan,
    });
    return response.data;
  },

  /**
   * Send an automated email notification to a user
   * @param {number|string} userId
   * @param {string} emailType - 'account_blocked' | 'limits_changed' | 'ai_revoked' | 'plan_updated'
   * @param {Object} extra - optional extra data for the email template
   */
  sendUserEmail: async (userId, emailType, extra = {}) => {
    const response = await api.post(`${USER_MGMT_BASE}/${userId}/send_email/`, {
      email_type: emailType,
      ...extra,
    });
    return response.data;
  },

  // =========================================================================
  // EXPORT
  // =========================================================================

  /**
   * Export user list as CSV (triggers download)
   * @param {Object} params - same filter params as getAllUsers
   */
  exportUsersCSV: async (params = {}) => {
    const response = await api.get(`${USER_MGMT_BASE}/export/`, {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  },

  // =========================================================================
  // REFRESH
  // =========================================================================

  /** Force refresh the system statistics cache */
  refresh: async () => {
    const response = await api.post(`${ADMIN_BASE}/refresh/`);
    return response.data;
  },
};

export default adminAnalyticsService;