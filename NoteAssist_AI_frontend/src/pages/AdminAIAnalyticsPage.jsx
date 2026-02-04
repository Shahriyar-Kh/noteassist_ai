import { useState, useEffect } from 'react';
import { Users, FileText, Sparkles, Clock, TrendingUp } from 'lucide-react';
import adminAnalyticsService from '../services/adminAnalytics.service';
import toast from 'react-hot-toast';

const AdminAIAnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [aiMetrics, setAIMetrics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [overviewData, aiData] = await Promise.all([
        adminAnalyticsService.getOverview(),
        adminAnalyticsService.getAIMetrics()
      ]);
      
      setOverview(overviewData);
      setAIMetrics(aiData);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to load analytics';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getToolColor = (toolType) => {
    const colors = {
      generate: 'bg-blue-500',
      improve: 'bg-purple-500',
      summarize: 'bg-green-500',
      code: 'bg-orange-500'
    };
    return colors[toolType] || 'bg-gray-500';
  };

  const getToolLabel = (toolType) => {
    const labels = {
      generate: 'Generate Topic',
      improve: 'Improve Content',
      summarize: 'Summarize Text',
      code: 'Code Generation'
    };
    return labels[toolType] || toolType;
  };

  // Calculate max usage for chart scaling
  const maxUsage = aiMetrics?.usage_by_tool_type 
    ? Math.max(...Object.values(aiMetrics.usage_by_tool_type))
    : 1;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor AI tool usage and performance metrics</p>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Users */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm text-green-600 font-semibold">
                  {overview.active_users_ratio}% Active
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{overview.total_users}</h3>
              <p className="text-gray-600 text-sm mt-1">Total Users</p>
              <p className="text-xs text-gray-500 mt-2">
                {overview.active_users} active in last 7 days
              </p>
            </div>

            {/* Total Notes */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                {overview.notes_growth_7d > 0 && (
                  <span className="text-sm text-green-600 font-semibold flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +{overview.notes_growth_7d}%
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{overview.total_notes}</h3>
              <p className="text-gray-600 text-sm mt-1">Total Notes</p>
              <p className="text-xs text-gray-500 mt-2">Created by all users</p>
            </div>

            {/* AI Tool Usages */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Sparkles className="w-6 h-6 text-green-600" />
                </div>
                {overview.ai_usage_growth_7d > 0 && (
                  <span className="text-sm text-green-600 font-semibold flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +{overview.ai_usage_growth_7d}%
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{overview.total_ai_generations}</h3>
              <p className="text-gray-600 text-sm mt-1">AI Tool Usages</p>
              <p className="text-xs text-gray-500 mt-2">Last 7 days activity</p>
            </div>

            {/* Avg Response Time */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {overview.avg_response_time}s
              </h3>
              <p className="text-gray-600 text-sm mt-1">Avg Response Time</p>
              <p className="text-xs text-gray-500 mt-2">AI generation speed</p>
            </div>
          </div>
        )}

        {/* AI Metrics Section */}
        {aiMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage by Tool Type */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Usage by Tool Type</h2>
              <div className="space-y-4">
                {Object.entries(aiMetrics.usage_by_tool_type).map(([toolType, count]) => {
                  const percentage = (count / maxUsage) * 100;
                  return (
                    <div key={toolType}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {getToolLabel(toolType)}
                        </span>
                        <span className="text-sm font-bold text-gray-900">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getToolColor(toolType)} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7-Day Trend */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">7-Day Usage Trend</h2>
              <div className="flex items-end justify-between h-64 gap-2">
                {aiMetrics.trend_7_days?.map((dayData, index) => {
                  const maxTrend = Math.max(...aiMetrics.trend_7_days.map(d => d.count));
                  const height = maxTrend > 0 ? (dayData.count / maxTrend) * 100 : 0;
                  const date = new Date(dayData.date);
                  const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex items-end justify-center h-48 mb-2">
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg hover:from-blue-600 hover:to-blue-500 transition-all duration-300 cursor-pointer group relative"
                          style={{ height: `${height}%`, minHeight: dayData.count > 0 ? '4px' : '0' }}
                          title={`${dayLabel}: ${dayData.count} usages`}
                        >
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {dayData.count} uses
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 font-medium">{dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Users */}
            {aiMetrics.top_users && aiMetrics.top_users.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 lg:col-span-2">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Top AI Users</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiMetrics.top_users.map((user, index) => (
                    <div
                      key={user.user_id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.user_email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                        <span className="text-sm text-gray-600">Total Usage</span>
                        <span className="text-lg font-bold text-blue-600">{user.total_usage}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAIAnalyticsPage;
