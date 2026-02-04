import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import aiToolsService from '../services/aiTools.service';
import { History, ArrowLeft, Loader2, Eye, Download, Trash2, Filter } from 'lucide-react';

const AIHistoryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [quota, setQuota] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
    fetchQuota();
  }, [filter]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { tool_type: filter } : {};
      const data = await aiToolsService.getUsageHistory(params);
      setHistory(data.results || data);
    } catch (err) {
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuota = async () => {
    try {
      const data = await aiToolsService.getQuota();
      setQuota(data.quota);
    } catch (err) {
      console.error('Failed to load quota:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this output?')) return;

    try {
      await aiToolsService.deleteOutput(id);
      setHistory(history.filter(item => item.output_id !== id));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleDownload = async (id) => {
    try {
      const blob = await aiToolsService.downloadOutput(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai_output_${id}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download: ' + err.message);
    }
  };

  const getToolColor = (type) => {
    const colors = {
      generate: 'bg-blue-100 text-blue-800',
      improve: 'bg-purple-100 text-purple-800',
      summarize: 'bg-green-100 text-green-800',
      code: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/ai-tools')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to AI Tools
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl text-white">
                <History className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">AI Usage History</h1>
                <p className="text-gray-600">View and manage your AI tool usage</p>
              </div>
            </div>

            {quota && (
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600 mb-1">Daily Quota</div>
                <div className="text-2xl font-bold text-gray-900">
                  {quota.daily_used} / {quota.daily_limit}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(quota.daily_used / quota.daily_limit) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            {['all', 'generate', 'improve', 'summarize', 'code'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* History List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No history yet</h3>
            <p className="text-gray-600">Start using AI tools to see your history here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getToolColor(item.tool_type)}`}>
                        {item.tool_type}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 line-clamp-2">{item.input_text}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {item.output_id && (
                      <>
                        <button
                          onClick={() => navigate(`/ai-tools/outputs/${item.output_id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDownload(item.output_id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.output_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Tokens: {item.tokens_used}</span>
                  <span>•</span>
                  <span>Time: {(item.response_time * 1000).toFixed(0)}ms</span>
                  {item.success !== undefined && (
                    <>
                      <span>•</span>
                      <span className={item.success ? 'text-green-600' : 'text-red-600'}>
                        {item.success ? 'Success' : 'Failed'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIHistoryPage;
