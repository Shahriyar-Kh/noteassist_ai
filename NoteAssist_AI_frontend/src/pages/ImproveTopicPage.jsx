import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import aiToolsService from '../services/aiTools.service';
import { Wand2, ArrowLeft, Loader2, Save, Download } from 'lucide-react';

const ImproveTopicPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    topic: '',
    current_content: '',
    improvement_type: 'expand',
    focus_areas: '',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await aiToolsService.improve(formData);
      setResult(response);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to improve topic');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result?.output?.id) return;
    
    const noteTitle = prompt('Enter note title:');
    if (!noteTitle) return;

    try {
      await aiToolsService.saveToNote(result.output.id, { note_title: noteTitle });
      alert('Saved to notes successfully!');
      navigate('/notes');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const handleDownload = async () => {
    if (!result?.output?.id) return;
    
    try {
      const blob = await aiToolsService.downloadOutput(result.output.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `improved_${formData.topic.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/ai-tools')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to AI Tools
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
              <Wand2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Improve Topic</h1>
              <p className="text-gray-600">Enhance and expand existing content</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Topic Name *
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="Topic to improve"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Content *
              </label>
              <textarea
                value={formData.current_content}
                onChange={(e) => setFormData({ ...formData, current_content: e.target.value })}
                placeholder="Paste your existing content here..."
                rows="8"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Improvement Type
              </label>
              <select
                value={formData.improvement_type}
                onChange={(e) => setFormData({ ...formData, improvement_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="expand">Expand Content</option>
                <option value="clarify">Clarify Concepts</option>
                <option value="examples">Add Examples</option>
                <option value="simplify">Simplify Language</option>
                <option value="restructure">Restructure</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Focus Areas (Optional)
              </label>
              <input
                type="text"
                value={formData.focus_areas}
                onChange={(e) => setFormData({ ...formData, focus_areas: e.target.value })}
                placeholder="e.g., Add more technical details, Include real-world examples..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Improving...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Improve Content
                </>
              )}
            </button>
          </form>
        </div>

        {result && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Improved Content</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
            
            <div className="prose max-w-none">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <pre className="whitespace-pre-wrap font-sans text-gray-800">
                  {result.output?.content || result.content}
                </pre>
              </div>
            </div>

            {result.usage && (
              <div className="mt-6 flex items-center gap-4 text-sm text-gray-600">
                <span>Tokens: {result.usage.tokens_used}</span>
                <span>•</span>
                <span>Response Time: {(result.usage.response_time * 1000).toFixed(0)}ms</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImproveTopicPage;
