import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import aiToolsService from '../services/aiTools.service';
import { FileText, ArrowLeft, Loader2, Save, Download } from 'lucide-react';

const SummarizeTopicPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    summary_length: 'medium',
    format: 'bullet_points',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await aiToolsService.summarize(formData);
      setResult(response);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to summarize content');
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
      a.download = `summary_${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-8 px-4">
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
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl text-white">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Summarize Content</h1>
              <p className="text-gray-600">Create concise summaries from long text</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Content to Summarize *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Paste your content here (articles, notes, documents...)..."
                rows="12"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                required
              />
              <p className="text-sm text-gray-500 mt-2">
                {formData.content.length} characters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Summary Length
                </label>
                <select
                  value={formData.summary_length}
                  onChange={(e) => setFormData({ ...formData, summary_length: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="short">Short (1-2 paragraphs)</option>
                  <option value="medium">Medium (3-5 paragraphs)</option>
                  <option value="long">Long (Detailed summary)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Format
                </label>
                <select
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="bullet_points">Bullet Points</option>
                  <option value="paragraph">Paragraph</option>
                  <option value="key_points">Key Points</option>
                  <option value="executive">Executive Summary</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Generate Summary
                </>
              )}
            </button>
          </form>
        </div>

        {result && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Summary</h2>
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
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
                <span>Original: {formData.content.length} chars</span>
                <span>•</span>
                <span>Summary: {(result.output?.content || result.content).length} chars</span>
                <span>•</span>
                <span>Compression: {((1 - (result.output?.content || result.content).length / formData.content.length) * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SummarizeTopicPage;
