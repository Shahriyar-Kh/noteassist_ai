// FILE: AdminUserDetailPage.jsx
// Detailed User View with Controls
// ============================================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, Globe, GraduationCap, Calendar,
  FileText, Brain, Eye, Lock, Unlock, Settings, Clock,
  TrendingUp, BarChart3, Activity, Save, X, Check,
  AlertCircle, Shield, Zap
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { toast } from 'react-hot-toast';
import adminAnalyticsService from '@/services/adminAnalytics.service';

const AdminUserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [limits, setLimits] = useState({
    daily_limit: 0,
    weekly_limit: 0,
    monthly_limit: 0
  });
  const [selectedPlan, setSelectedPlan] = useState('');

  useEffect(() => {
    fetchUserDetail();
  }, [userId]);

  const fetchUserDetail = async () => {
    try {
      setLoading(true);
      const data = await adminAnalyticsService.getUserDetail(userId);
      setUser(data);
      setLimits({
        daily_limit: data.plan.daily_ai_limit,
        weekly_limit: data.plan.weekly_ai_limit,
        monthly_limit: data.plan.monthly_ai_limit
      });
      setSelectedPlan(data.plan.type);
    } catch (error) {
      console.error('Error fetching user detail:', error);
      toast.error('Failed to load user details');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!blockReason.trim()) {
      toast.error('Please enter a reason for blocking');
      return;
    }

    try {
      await adminAnalyticsService.blockUser(userId, blockReason);
      toast.success('User blocked successfully');
      setShowBlockModal(false);
      setBlockReason('');
      fetchUserDetail();
    } catch (error) {
      toast.error('Failed to block user');
    }
  };

  const handleUnblockUser = async () => {
    if (!confirm('Are you sure you want to unblock this user?')) return;

    try {
      await adminAnalyticsService.unblockUser(userId);
      toast.success('User unblocked successfully');
      fetchUserDetail();
    } catch (error) {
      toast.error('Failed to unblock user');
    }
  };

  const handleUpdateLimits = async () => {
    try {
      await adminAnalyticsService.updateLimits(userId, limits);
      toast.success('Limits updated successfully');
      setShowLimitModal(false);
      fetchUserDetail();
    } catch (error) {
      toast.error('Failed to update limits');
    }
  };

  const handleChangePlan = async () => {
    try {
      await adminAnalyticsService.changePlan(userId, selectedPlan);
      toast.success('Plan changed successfully');
      setShowPlanModal(false);
      fetchUserDetail();
    } catch (error) {
      toast.error('Failed to change plan');
    }
  };

  const handleToggleFeature = async (feature) => {
    const currentValue = user.plan[`can_${feature}`];
    try {
      await adminAnalyticsService.toggleFeatureAccess(userId, feature, !currentValue);
      toast.success(`Feature access ${!currentValue ? 'granted' : 'revoked'}`);
      fetchUserDetail();
    } catch (error) {
      toast.error('Failed to update feature access');
    }
  };

  if (loading || !user) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading user details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Users</span>
            </button>

            <div className="flex items-center gap-2">
              {user.plan.is_blocked ? (
                <button
                  onClick={handleUnblockUser}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Unlock className="w-4 h-4" />
                  Unblock User
                </button>
              ) : (
                <button
                  onClick={() => setShowBlockModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Lock className="w-4 h-4" />
                  Block User
                </button>
              )}
            </div>
          </div>

          {/* User Profile Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-start gap-6">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
                <User className="w-12 h-12 text-white" />
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {user.full_name || user.username}
                    </h1>
                    <p className="text-gray-600">{user.email}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {user.plan.is_blocked && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                        Blocked
                      </span>
                    )}
                    {user.is_active && !user.plan.is_blocked && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm">{user.country || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-sm">{user.education_level || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      Last login: {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {user.plan.is_blocked && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Account Blocked</p>
                    <p className="text-sm text-red-700 mt-1">{user.plan.blocked_reason}</p>
                    <p className="text-xs text-red-600 mt-1">
                      Blocked on: {new Date(user.plan.blocked_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-blue-600" />
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">Total Notes</p>
              <p className="text-2xl font-bold text-gray-900">{user.total_notes}</p>
              <p className="text-xs text-gray-500 mt-1">
                {user.published_notes} published, {user.draft_notes} drafts
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <Brain className="w-8 h-8 text-purple-600" />
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600">AI Usage</p>
              <p className="text-2xl font-bold text-gray-900">{user.total_ai_usage || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                Total AI requests
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-8 h-8 text-green-600" />
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">Plan Type</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{user.plan.type}</p>
              <button
                onClick={() => setShowPlanModal(true)}
                className="text-xs text-blue-600 hover:text-blue-700 mt-1"
              >
                Change Plan
              </button>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-orange-600" />
                <Zap className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {user.is_active ? 'Active' : 'Inactive'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {user.email_verified ? '✓ Verified' : '✗ Not Verified'}
              </p>
            </div>
          </div>

          {/* Plan & Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Limits */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">AI Usage Limits</h2>
                <button
                  onClick={() => setShowLimitModal(true)}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
                >
                  <Settings className="w-4 h-4" />
                  Update
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Daily Limit</p>
                    <p className="text-xs text-gray-600">
                      {user.plan.ai_requests_today} / {user.plan.daily_ai_limit} used
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{user.plan.daily_ai_limit}</p>
                    <p className="text-xs text-gray-600">requests</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Weekly Limit</p>
                    <p className="text-xs text-gray-600">
                      {user.plan.ai_requests_week} / {user.plan.weekly_ai_limit} used
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{user.plan.weekly_ai_limit}</p>
                    <p className="text-xs text-gray-600">requests</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Monthly Limit</p>
                    <p className="text-xs text-gray-600">
                      {user.plan.ai_requests_month} / {user.plan.monthly_ai_limit} used
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{user.plan.monthly_ai_limit}</p>
                    <p className="text-xs text-gray-600">requests</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Access */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Feature Access</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">AI Tools</p>
                    <p className="text-xs text-gray-600">Access to all AI features</p>
                  </div>
                  <button
                    onClick={() => handleToggleFeature('use_ai_tools')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      user.plan.can_use_ai_tools ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        user.plan.can_use_ai_tools ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">PDF Export</p>
                    <p className="text-xs text-gray-600">Export notes to PDF</p>
                  </div>
                  <button
                    onClick={() => handleToggleFeature('export_pdf')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      user.plan.can_export_pdf ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        user.plan.can_export_pdf ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Publish Notes</p>
                    <p className="text-xs text-gray-600">Share notes publicly</p>
                  </div>
                  <button
                    onClick={() => handleToggleFeature('publish_notes')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      user.plan.can_publish_notes ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        user.plan.can_publish_notes ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Storage & Notes</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-blue-700">Max Notes:</span>
                    <span className="text-sm font-bold text-blue-900">
                      {user.plan.max_notes === -1 ? 'Unlimited' : user.plan.max_notes}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Usage Breakdown by Tool */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-6">AI Usage Breakdown by Tool</h2>
            
            {user.ai_usage_by_tool && user.ai_usage_by_tool.length > 0 ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {user.ai_usage_by_tool.map((tool) => {
                    const toolInfo = {
                      'generate': { name: 'Generate Topic', color: 'bg-blue-100 text-blue-800', icon: '✨' },
                      'improve': { name: 'Improve Content', color: 'bg-purple-100 text-purple-800', icon: '⚡' },
                      'summarize': { name: 'Summarize', color: 'bg-green-100 text-green-800', icon: '📄' },
                      'code': { name: 'Generate Code', color: 'bg-orange-100 text-orange-800', icon: '💻' },
                    }[tool.tool_type] || { name: tool.tool_name, color: 'bg-gray-100 text-gray-800', icon: '📊' };

                    return (
                      <div key={tool.tool_type} className={`p-4 rounded-lg border-2 border-transparent ${toolInfo.color}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold mb-2">{toolInfo.icon} {toolInfo.name}</p>
                            <p className="text-2xl font-bold">{tool.count}</p>
                            <p className="text-xs opacity-75 mt-1">requests</p>
                          </div>
                          {tool.total_tokens && <div className="text-right">
                            <p className="text-xs opacity-75">Tokens</p>
                            <p className="text-sm font-semibold">{tool.total_tokens}</p>
                          </div>}
                        </div>
                        {tool.avg_response_time && (
                          <p className="text-xs opacity-75 mt-2">Avg Response: {tool.avg_response_time}s</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Usage Summary */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Total AI Requests</p>
                      <p className="text-3xl font-bold text-gray-900">{user.total_ai_usage}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 font-medium">Current Period Usage</p>
                      <p className="text-lg font-bold text-blue-600">
                        {user.plan.ai_requests_today} / {user.plan.daily_ai_limit} today
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-gray-50 rounded-lg">
                <p className="text-gray-600">No AI usage data available</p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Notes */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Notes</h2>
              <div className="space-y-2">
                {user.recent_notes && user.recent_notes.length > 0 ? (
                  user.recent_notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">{note.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          note.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {note.is_published ? 'Published' : 'Draft'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent notes</p>
                )}
              </div>
            </div>

            {/* Recent Logins */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Logins</h2>
              <div className="space-y-2">
                {user.recent_logins && user.recent_logins.length > 0 ? (
                  user.recent_logins.map((login, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{login.ip_address}</p>
                          <p className="text-xs text-gray-600">{login.device_type || 'Unknown device'}</p>
                          {login.location && (
                            <p className="text-xs text-gray-500">{login.location}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(login.login_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent logins</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Log */}
          {user.action_logs && user.action_logs.length > 0 && (
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Admin Action Log</h2>
              <div className="space-y-2">
                {user.action_logs.map((log, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{log.action.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-600">By: {log.admin_email}</p>
                      {Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Update Limits Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Update AI Limits</h3>
              <button
                onClick={() => setShowLimitModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Limit
                </label>
                <input
                  type="number"
                  value={limits.daily_limit}
                  onChange={(e) => setLimits({ ...limits, daily_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weekly Limit
                </label>
                <input
                  type="number"
                  value={limits.weekly_limit}
                  onChange={(e) => setLimits({ ...limits, weekly_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Limit
                </label>
                <input
                  type="number"
                  value={limits.monthly_limit}
                  onChange={(e) => setLimits({ ...limits, monthly_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowLimitModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateLimits}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Change User Plan</h3>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {['free', 'basic', 'premium'].map((plan) => (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    selectedPlan === plan
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-bold text-gray-900 capitalize">{plan}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {plan === 'free' && 'Basic access with limited features'}
                    {plan === 'basic' && 'Enhanced features and higher limits'}
                    {plan === 'premium' && 'Full access with unlimited features'}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePlan}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Change Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block User Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-900">Block User Account</h3>
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockReason('');
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Warning: This action will:</p>
                  <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                    <li>Immediately block user access</li>
                    <li>Prevent user from logging in</li>
                    <li>Send notification email to user</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for blocking (required)
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Enter reason for blocking this user..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Block User
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUserDetailPage;