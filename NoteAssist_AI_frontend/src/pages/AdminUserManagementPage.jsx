// FILE: AdminUserManagementPage.jsx
// Comprehensive User Management for Admin - Enterprise Design
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Filter, Download, Eye, Lock, Unlock,
  Settings, TrendingUp, UserPlus, Mail, BarChart3,
  RefreshCw, X, Check, AlertCircle, Clock, ChevronRight,
  Grid, List, Calendar, Activity
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { toast } from 'react-hot-toast';
import adminAnalyticsService from '@/services/adminAnalytics.service';

const AdminUserManagementPage = () => {
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // table or grid
  
  // Insights
  const [selectedInsight, setSelectedInsight] = useState('top_creators');
  const [insightData, setInsightData] = useState([]);
  const [insightLoading, setInsightLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Block/Unblock modals
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    // Load all data on component mount
    fetchStats();
    fetchUsers();
    fetchInsights();
  }, []);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchStats();
      fetchUsers();
      fetchInsights();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, pagination.page, sortBy, filterPlan, filterStatus, searchQuery, selectedInsight]);

  // Fetch when pagination or filters change
  useEffect(() => {
    fetchUsers();
  }, [pagination.page, sortBy, filterPlan, filterStatus, searchQuery]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (searchQuery !== '') {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [searchQuery]);

  // Fetch insights when selected insight changes
  useEffect(() => {
    fetchInsights();
  }, [selectedInsight]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        search: searchQuery,
        plan_type: filterPlan,
        status: filterStatus,
        sort_by: sortBy,
      };
      
      console.log('Fetching users with params:', params);
      const response = await adminAnalyticsService.getAllUsers(params);
      console.log('Users response:', response);

      setUsers(response.results || []);
      setPagination(prev => ({
        ...prev,
        total: response.count || 0,
        pages: Math.ceil((response.count || 0) / 20)
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      console.log('Fetching stats...');
      const data = await adminAnalyticsService.getUserStats();
      console.log('Stats response:', data);
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      setInsightLoading(true);
      console.log('Fetching insights for:', selectedInsight);
      const data = await adminAnalyticsService.getUserInsights(selectedInsight, 10);
      console.log('Insights response:', data);
      setInsightData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsightData([]);
    } finally {
      setInsightLoading(false);
    }
  };

  const handleViewUser = (userId) => {
    navigate(`/admin/users/${userId}`);
  };

  const handleBlockUser = async (userId, email) => {
    setSelectedUser({ id: userId, email });
    setShowBlockModal(true);
  };

  const confirmBlockUser = async () => {
    if (!blockReason.trim()) {
      toast.error('Please enter a reason for blocking');
      return;
    }

    try {
      await adminAnalyticsService.blockUser(selectedUser.id, blockReason);
      toast.success(`User ${selectedUser.email} blocked successfully`);
      setShowBlockModal(false);
      setBlockReason('');
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
    }
  };

  const handleUnblockUser = async (userId, email) => {
    setSelectedUser({ id: userId, email });
    setShowUnblockModal(true);
  };

  const confirmUnblockUser = async () => {
    try {
      await adminAnalyticsService.unblockUser(selectedUser.id);
      toast.success(`User ${selectedUser.email} unblocked successfully`);
      setShowUnblockModal(false);
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Email', 'Full Name', 'Plan', 'Status', 'Total Notes', 'AI Usage', 'Created At'],
      ...users.map(u => [
        u.email,
        u.full_name,
        u.plan_type,
        u.is_blocked ? 'Blocked' : 'Active',
        u.total_notes,
        u.ai_usage_count,
        new Date(u.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900">User Management</h1>
                  <p className="text-gray-600 mt-2">Manage users, plans, and access controls</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                      autoRefresh 
                        ? 'bg-green-600 text-white border-green-600' 
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
                    </span>
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {viewMode === 'table' ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                    <span className="text-sm font-medium">{viewMode === 'table' ? 'Grid' : 'Table'}</span>
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Export</span>
                  </button>
                  <button
                    onClick={() => { fetchUsers(); fetchStats(); fetchInsights(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-medium">Refresh</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statsLoading ? (
                Array(4).fill(0).map((_, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3 mt-3"></div>
                  </div>
                ))
              ) : stats ? (
                <>
                  <StatCard 
                    icon={Users} 
                    label="Total Users" 
                    value={stats.total_users}
                    bgColor="bg-blue-100"
                    iconColor="text-blue-600"
                  />
                  <StatCard 
                    icon={Check} 
                    label="Active Users" 
                    value={stats.active_users}
                    bgColor="bg-green-100"
                    iconColor="text-green-600"
                  />
                  <StatCard 
                    icon={UserPlus} 
                    label="New Today" 
                    value={stats.new_users_today}
                    bgColor="bg-purple-100"
                    iconColor="text-purple-600"
                  />
                  <StatCard 
                    icon={Lock} 
                    label="Blocked Users" 
                    value={stats.blocked_users}
                    bgColor="bg-red-100"
                    iconColor="text-red-600"
                  />
                </>
              ) : null}
            </div>

            {/* User Insights */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">User Insights</h2>
                <select
                  value={selectedInsight}
                  onChange={(e) => setSelectedInsight(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="top_creators">Top Note Creators</option>
                  <option value="most_ai_usage">Most AI Usage</option>
                  <option value="most_published">Most Published Notes</option>
                  <option value="most_viewed">Most Viewed Notes</option>
                  <option value="new_users_today">New Users Today</option>
                  <option value="new_users_week">New Users This Week</option>
                  <option value="active_users">Recently Active</option>
                </select>
              </div>

              {insightLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : insightData.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {insightData.slice(0, 5).map((user, idx) => (
                    <div
                      key={user.id}
                      onClick={() => handleViewUser(user.id)}
                      className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg hover:shadow-lg transition-all cursor-pointer border border-blue-100"
                    >
                      <div className="text-2xl font-bold text-blue-600 mb-2">#{idx + 1}</div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.full_name || user.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-1">{user.email}</p>
                      {user.count !== undefined && (
                        <p className="text-sm font-bold text-blue-600 mt-2">{user.count}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No insights data available</p>
                </div>
              )}
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email, name, or username..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Filter Toggle and Filter Row */}
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                      showFilters
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>
                  {(filterPlan || filterStatus || sortBy !== '-created_at') && (
                    <button
                      onClick={() => {
                        setFilterPlan('');
                        setFilterStatus('');
                        setSortBy('-created_at');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Plan Type</label>
                      <select
                        value={filterPlan}
                        onChange={(e) => setFilterPlan(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Plans</option>
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="-created_at">Newest First</option>
                        <option value="created_at">Oldest First</option>
                        <option value="-total_notes">Most Notes</option>
                        <option value="-ai_usage_count">Most AI Usage</option>
                        <option value="email">Email A-Z</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Users Display - Table or Grid View */}
            {viewMode === 'table' ? (
              <UsersTableView 
                users={users}
                loading={loading}
                onViewUser={handleViewUser}
                onBlockUser={handleBlockUser}
                onUnblockUser={handleUnblockUser}
              />
            ) : (
              <UsersGridView 
                users={users}
                loading={loading}
                onViewUser={handleViewUser}
                onBlockUser={handleBlockUser}
                onUnblockUser={handleUnblockUser}
              />
            )}

            {/* Pagination */}
            {pagination.pages > 1 && !loading && (
              <div className="flex items-center justify-between mt-8 p-4 bg-white rounded-xl border border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * 20) + 1} to {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} users
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous
                  </button>
                  <span className="text-sm text-gray-700 font-medium px-3">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                    disabled={pagination.page >= pagination.pages}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Block User Modal */}
            {showBlockModal && selectedUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 max-w-md w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-red-900">Block User Account</h3>
                    <button
                      onClick={() => {
                        setShowBlockModal(false);
                        setBlockReason('');
                        setSelectedUser(null);
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
                          <li>Immediately block {selectedUser.email}</li>
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
                        setSelectedUser(null);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmBlockUser}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      Block User
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Unblock User Modal */}
            {showUnblockModal && selectedUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 max-w-md w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Unblock User Account</h3>
                    <button
                      onClick={() => {
                        setShowUnblockModal(false);
                        setSelectedUser(null);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900">Unblock {selectedUser.email}?</p>
                        <p className="text-sm text-green-700 mt-1">
                          This will restore full access to their account.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowUnblockModal(false);
                        setSelectedUser(null);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmUnblockUser}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Unlock className="w-4 h-4" />
                      Unblock User
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

// Helper functions (define before components)
const getPlanBadgeColor = (plan) => {
  switch (plan?.toLowerCase()) {
    case 'free': return 'bg-gray-100 text-gray-700';
    case 'basic': return 'bg-blue-100 text-blue-700';
    case 'premium': return 'bg-purple-100 text-purple-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusBadgeColor = (isBlocked) => {
  return isBlocked
    ? 'bg-red-100 text-red-700'
    : 'bg-green-100 text-green-700';
};

// Helper Components

const StatCard = ({ icon: Icon, label, value, bgColor, iconColor }) => (
  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString()}</p>
      </div>
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
    </div>
  </div>
);

const UsersTableView = ({ users, loading, onViewUser, onBlockUser, onUnblockUser }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">User</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Plan</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Activity</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Usage</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Joined</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan="7" className="px-6 py-8 text-center">
                <RefreshCw className="w-5 h-5 text-gray-400 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading users...</p>
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-6 py-8 text-center">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No users found</p>
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{user.full_name || user.username}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(user.plan_type)}`}>
                    {user.plan_type?.charAt(0).toUpperCase() + user.plan_type?.slice(1) || 'Free'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.is_blocked)}`}>
                    {user.is_blocked ? <Lock className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                    {user.is_blocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{user.total_notes}</p>
                    <p className="text-xs text-gray-500">{user.published_notes} published</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{user.ai_usage_count}</p>
                    <p className="text-xs text-gray-500">AI requests</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onViewUser(user.id)}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {user.is_blocked ? (
                      <button
                        onClick={() => onUnblockUser(user.id, user.email)}
                        className="p-2 hover:bg-green-50 rounded-lg transition-colors text-green-600"
                        title="Unblock"
                      >
                        <Unlock className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onBlockUser(user.id, user.email)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                        title="Block"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onViewUser(user.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                      title="Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const UsersGridView = ({ users, loading, onViewUser, onBlockUser, onUnblockUser }) => (
  <div>
    {loading ? (
      <div className="flex justify-center py-12">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    ) : users.length === 0 ? (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No users found</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900">{user.full_name || user.username}</h3>
                <p className="text-xs text-gray-500 mt-1">{user.email}</p>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(user.plan_type)}`}>
                {user.plan_type}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Notes</p>
                <p className="text-lg font-bold text-gray-900">{user.total_notes}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">AI Usage</p>
                <p className="text-lg font-bold text-gray-900">{user.ai_usage_count}</p>
              </div>
            </div>

            <div className="mb-4">
              <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.is_blocked)}`}>
                {user.is_blocked ? <Lock className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                {user.is_blocked ? 'Blocked' : 'Active'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-200">
              <Calendar className="w-3 h-3" />
              {new Date(user.created_at).toLocaleDateString()}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onViewUser(user.id)}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
              >
                View
              </button>
              {user.is_blocked ? (
                <button
                  onClick={() => onUnblockUser(user.id, user.email)}
                  className="px-3 py-2 bg-green-50 text-green-600 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Unlock className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => onBlockUser(user.id, user.email)}
                  className="px-3 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )} 
  </div>
);
 
export default AdminUserManagementPage;