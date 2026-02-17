// FILE: src/pages/AIToolsSummarizePage.jsx
// Summarize Content AI Tool - Condense lengthy content into summaries
// ============================================================================

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Upload, Loader2, AlertCircle, CheckCircle,
  Copy, ArrowLeft, Sparkles, Code, Wand2
} from 'lucide-react';
import '@/styles/animations.css';
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
      toast.error('❌ Please enter content to summarize');
      return;
    }

    if (inputContent.split(/\s+/).length < 50) {
      toast.error('❌ Content is too short. Please provide at least 50 words.');
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
      toast.success('✨ Content summarized successfully!');
    } catch (error) {
      console.error('Summarization error:', error);
      toast.error('❌ ' + (error.message || 'Failed to summarize content'));
    } finally {
      setLoading(false);
    }
  };

  const exportToPDFHandler = async () => {
    if (!historyId) {
      toast.error('❌ No content to export');
      return;
    }

    try {
      exportToPDF(summarizedContent, 'summary.pdf', 'Summary', {
        'Length': summaryLength,
      });
      toast.success('✨ PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('❌ ' + (error.message || 'Failed to export PDF'));
    }
  };

  const uploadToGoogleDrive = async () => {
    if (!historyId) {
      toast.error('❌ No content to upload');
      return;
    }

    try {
      setLoading(true);
      await noteService.exportAIHistoryToDrive(historyId);
      toast.success('✨ Uploaded to Google Drive successfully!');
    } catch (error) {
      console.error('Google Drive upload error:', error);
      toast.error('❌ ' + (error.message || 'Failed to upload to Google Drive'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summarizedContent);
    toast.success('✨ Summary copied to clipboard!');
  };

  const calculateReduction = () => {
    if (!inputContent || !summarizedContent) return 0;
    const inputWords = inputContent.split(/\s+/).length;
    const summaryWords = summarizedContent.split(/\s+/).length;
    return Math.round(((inputWords - summaryWords) / inputWords) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <Helmet>
        <title>Summarize Content - AI Tools | NoteAssist AI</title>
        <meta name="description" content="Condense lengthy content into concise summaries. Choose your desired summary length and let AI summarize your text in seconds." />
        <meta property="og:title" content="Summarize Content - AI Tools | NoteAssist AI" />
        <meta property="og:description" content="Condense lengthy content into concise summaries. Choose your desired summary length and let AI summarize your text." />
        <meta name="twitter:title" content="Summarize Content - AI Tools | NoteAssist AI" />
        <meta name="twitter:description" content="Condense lengthy content into concise summaries with AI." />
      </Helmet>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30 animate-fadeInDown">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/ai-tools')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all transform hover:scale-110 active:scale-95"
                title="Back to AI Tools"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-emerald-600" />
                  Summarize Content
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/ai-tools/generate')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all hover:scale-110 active:scale-95"
              >
                <Sparkles size={16} />
                Generate
              </button>
              <button
                onClick={() => navigate('/ai-tools/improve')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all hover:scale-110 active:scale-95"
              >
                <Wand2 size={16} />
                Improve
              </button>
              <button
                onClick={() => navigate('/ai-tools/code')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all hover:scale-110 active:scale-95"
              >
                <Code size={16} />
                Code
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Input Section */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 space-y-6 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            {/* Summary Length Selection */}
            <div>
              <label className="flex text-sm font-bold text-gray-900 mb-3 items-center gap-2">
                <span className="text-lg">📏</span>
                Desired Summary Length
              </label>
              <div className="grid md:grid-cols-3 gap-3">
                {summaryLengths.map((length, index) => (
                  <button
                    key={length.value}
                    onClick={() => setSummaryLength(length.value)}
                    className={`p-3 rounded-xl text-left transition-all border-2 transform hover:scale-105 ${
                      summaryLength === length.value
                        ? 'border-emerald-600 bg-emerald-50 shadow-md'
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
            <div className="animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              <label className="flex text-sm font-bold text-gray-900 mb-2 items-center gap-2">
                <span className="text-lg">📝</span>
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
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed animate-slideInUp"
              style={{ animationDelay: '0.3s' }}
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
            <div className="grid lg:grid-cols-2 gap-6 animate-slideInUp" style={{ animationDelay: '0.4s' }}>
              {/* Original */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  📄 Original Content
                </h3>
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
                    Summary ✨
                  </h3>
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all transform hover:scale-110 active:scale-95"
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
            <div className="flex gap-4 animate-slideInUp" style={{ animationDelay: '0.5s' }}>
              <button
                onClick={exportToPDFHandler}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                Export as PDF
              </button>
              <button
                onClick={uploadToGoogleDrive}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Upload className="w-5 h-5" />
                Upload to Drive
              </button>
            </div>
          )}

          {summarizedContent && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 animate-slideInUp" style={{ animationDelay: '0.6s' }}>
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
