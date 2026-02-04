import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import aiToolsService from '../services/aiTools.service';
import { Sparkles, ArrowLeft, Loader2, Save, Download } from 'lucide-react';

const GenerateTopicPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    topic: '',
    subject_area: '',
    level: 'intermediate',
    save_immediately: false,
    note_title: '',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await aiToolsService.generate(formData);
      setResult(response);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate topic');
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
      a.download = `${formData.topic.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/ai-tools')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to AI Tools
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl text-white">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Generate Topic</h1>
              <p className="text-gray-600">AI-powered topic explanation generator</p>
            </div>
          </div>
        </div>

        {/* Form */}
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
                placeholder="e.g., Quantum Computing, Machine Learning..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subject Area *
              </label>
              <input
                type="text"
                value={formData.subject_area}
                onChange={(e) => setFormData({ ...formData, subject_area: e.target.value })}
                placeholder="e.g., Computer Science, Physics, Mathematics..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="save_immediately"
                checked={formData.save_immediately}
                onChange={(e) => setFormData({ ...formData, save_immediately: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="save_immediately" className="text-sm text-gray-700">
                Save to notes immediately
              </label>
            </div>

            {formData.save_immediately && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Note Title
                </label>
                <input
                  type="text"
                  value={formData.note_title}
                  onChange={(e) => setFormData({ ...formData, note_title: e.target.value })}
                  placeholder="Optional - defaults to topic name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Topic
                </>
              )}
            </button>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Generated Content</h2>
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
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

export default GenerateTopicPage;
