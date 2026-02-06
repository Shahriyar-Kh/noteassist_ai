// FILE: src/pages/AIToolsSummarizePage.jsx
// Summarize Content AI Tool - Condense lengthy content into summaries
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Upload, Loader2, AlertCircle, CheckCircle,
  Copy, ArrowLeft, Home
} from 'lucide-react';
import { noteService } from '@/services/note.service';
import { exportToPDF } from '@/utils/pdfExport';
import { toast } from 'react-hot-toast';

const AIToolsSummarizePage = () => {
  const navigate = useNavigate();

  const [inputContent, setInputContent] = useState('');
  const [summaryLength, setSummaryLength] = useState('medium');
  const [summarizedContent, setSummarizedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyId, setHistoryId] = useState(null);

  const summaryLengths = [
    { value: 'short', label: 'Short', description: '25-50 words' },
    { value: 'medium', label: 'Medium', description: '50-100 words' },
    { value: 'long', label: 'Long', description: '100-200 words' },
  ];

  const summarizeContent = async () => {
    if (!inputContent.trim()) {
      toast.error('Please enter content to summarize');
      return;
    }

    if (inputContent.split(/\s+/).length < 50) {
      toast.error('Content is too short. Please provide at least 50 words.');
      return;
    }

    try {
      setLoading(true);
      const result = await noteService.aiToolSummarize({
        input_content: inputContent,
        max_length: summaryLength,
      });

      setSummarizedContent(result.generated_content);
      setHistoryId(result.history_id);
      toast.success('Content summarized successfully!');
    } catch (error) {
      console.error('Summarization error:', error);
      toast.error(error.message || 'Failed to summarize content');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDFHandler = async () => {
    if (!historyId) {
      toast.error('No content to export');
      return;
    }

    try {
      exportToPDF(summarizedContent, 'summary.pdf', 'Summary', {
        'Length': summaryLength,
      });
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(error.message || 'Failed to export PDF');
    }
  };

  const uploadToGoogleDrive = async () => {
    if (!historyId) {
      toast.error('No content to upload');
      return;
    }

    try {
      setLoading(true);
      await noteService.exportAIHistoryToDrive(historyId);
      toast.success('Uploaded to Google Drive successfully!');
    } catch (error) {
      console.error('Google Drive upload error:', error);
      toast.error(error.message || 'Failed to upload to Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summarizedContent);
    toast.success('Summary copied to clipboard!');
  };

  const calculateReduction = () => {
    if (!inputContent || !summarizedContent) return 0;
    const inputWords = inputContent.split(/\s+/).length;
    const summaryWords = summarizedContent.split(/\s+/).length;
    return Math.round(((inputWords - summaryWords) / inputWords) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/ai-tools')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to AI Tools"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Home"
              >
                <Home className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-emerald-600" />
                  Summarize Content
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Input Section */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 space-y-6">
            {/* Summary Length Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Desired Summary Length
              </label>
              <div className="grid md:grid-cols-3 gap-3">
                {summaryLengths.map((length) => (
                  <button
                    key={length.value}
                    onClick={() => setSummaryLength(length.value)}
                    className={`p-3 rounded-xl text-left transition-all border-2 ${
                      summaryLength === length.value
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <div className="font-semibold text-gray-900">{length.label}</div>
                    <div className="text-xs text-gray-600">{length.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Content */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Paste Content to Summarize
              </label>
              <textarea
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="Paste your long text here... The AI will create a concise summary based on your selected length preference."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all min-h-48 resize-none"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-2">
                {inputContent.length} characters • {Math.ceil(inputContent.split(/\s+/).length)} words
              </p>
            </div>

            <button
              onClick={summarizeContent}
              disabled={loading || !inputContent.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Create Summary
                </>
              )}
            </button>
          </div>

          {/* Result Section */}
          {summarizedContent && (
            <div className="grid lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Original */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Original Content</h3>
                <div className="text-sm text-gray-600 mb-2">
                  {inputContent.split(/\s+/).length} words
                </div>
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 min-h-80 overflow-y-auto text-gray-700 leading-relaxed whitespace-pre-wrap break-words text-sm">
                  {inputContent}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl border-2 border-emerald-200 p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    Summary
                  </h3>
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 font-semibold">
                  {summarizedContent.split(/\s+/).length} words • {calculateReduction()}% reduction
                </div>
                <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200 min-h-80 overflow-y-auto text-gray-700 leading-relaxed text-sm">
                  <div dangerouslySetInnerHTML={{ __html: summarizedContent }} />
                </div>
              </div>
            </div>
          )}

          {/* Export Options */}
          {summarizedContent && (
            <div className="flex gap-4">
              <button
                onClick={exportToPDFHandler}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                Export as PDF
              </button>
              <button
                onClick={uploadToGoogleDrive}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                <Upload className="w-5 h-5" />
                Upload to Drive
              </button>
            </div>
          )}

          {summarizedContent && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Note:</strong> This summary is not saved to your notes. Use the Export or Upload buttons to save it.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIToolsSummarizePage;
