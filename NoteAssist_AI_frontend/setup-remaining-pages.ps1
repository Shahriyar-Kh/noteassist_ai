# NoteAssist AI Frontend - Complete Setup Script
# Run this in PowerShell from the NoteAssist_AI_frontend directory

Write-Host "🚀 NoteAssist AI Frontend Setup - Creating remaining pages..." -ForegroundColor Cyan

$srcPath = "src"

# Create Admin Analytics Page
Write-Host "Creating Admin Analytics Page..." -ForegroundColor Yellow
@"
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminAnalyticsService from '../services/adminAnalytics.service';
import { BarChart, TrendingUp, Users, FileText, Zap, Loader2 } from 'lucide-react';

const AdminAIAnalyticsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [aiMetrics, setAIMetrics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [overviewData, aiData] = await Promise.all([
        adminAnalyticsService.getOverview(),
        adminAnalyticsService.getAIMetrics(),
      ]);
      setOverview(overviewData);
      setAIMetrics(aiData);
    } catch (err) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Analytics Dashboard</h1>
          <p className="text-gray-600">Monitor AI tool usage and performance metrics</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-green-600 font-semibold">
                {overview?.users?.active_ratio || '0%'}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{overview?.users?.total || 0}</h3>
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-xs text-gray-500 mt-1">
              {overview?.users?.active_7d || 0} active last 7 days
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-blue-600 font-semibold">
                +{overview?.notes?.created_7d || 0}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{overview?.notes?.total || 0}</h3>
            <p className="text-sm text-gray-600">Total Notes</p>
            <p className="text-xs text-gray-500 mt-1">Created last 7 days</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-purple-600 font-semibold">
                +{aiMetrics?.usage_7d || 0}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{aiMetrics?.total_usage || 0}</h3>
            <p className="text-sm text-gray-600">AI Tool Usages</p>
            <p className="text-xs text-gray-500 mt-1">Last 7 days activity</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {aiMetrics?.avg_response_time_ms || 0}ms
            </h3>
            <p className="text-sm text-gray-600">Avg Response Time</p>
          </div>
        </div>

        {/* AI Usage by Tool Type */}
        {aiMetrics?.by_tool && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Usage by Tool Type</h2>
            <div className="space-y-4">
              {aiMetrics.by_tool.map((tool) => (
                <div key={tool.tool_type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {tool.tool_type}
                    </span>
                    <span className="text-sm text-gray-600">{tool.count} uses</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(tool.count / aiMetrics.total_usage) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily Trend Chart */}
        {aiMetrics?.daily_trend && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">7-Day Usage Trend</h2>
            <div className="flex items-end justify-between h-64 gap-2">
              {aiMetrics.daily_trend.map((day, index) => {
                const maxCount = Math.max(...aiMetrics.daily_trend.map(d => d.count));
                const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-blue-600 rounded-t-lg transition-all hover:bg-blue-700" 
                         style={{ height: `${height}%` }}
                         title={`${day.count} uses`}
                    />
                    <span className="text-xs text-gray-600 mt-2">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAIAnalyticsPage;
"@ | Out-File -FilePath "$srcPath/pages/AdminAIAnalyticsPage.jsx" -Encoding UTF8

Write-Host "✅ All files created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update App.jsx with new routes"
Write-Host "2. Test all pages"
Write-Host "3. Run 'npm run dev' to start development server"
