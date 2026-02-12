// FILE: src/pages/AIToolsImprovePage.jsx
// Improve Content AI Tool - Enhance clarity, grammar, and structure
// ============================================================================

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import {
  Wand2, Download, Upload, Loader2, AlertCircle, CheckCircle,
  Copy, ArrowLeft, Home, LayoutDashboard, AlignLeft, Code, Sparkles, FileText, Loader
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '@/styles/animations.css';
import { noteService } from '@/services/note.service';
import { exportToPDF } from '@/utils/pdfExport';
import { toast } from 'react-hot-toast';

const AIToolsImprovePage = () => {
  const navigate = useNavigate();

  const [inputContent, setInputContent] = useState('');
  const [improvementType, setImprovementType] = useState('general');
  const [improvedContent, setImprovedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyId, setHistoryId] = useState(null);

  // React Quill modules configuration
  const quillModules = {
    toolbar: [
      [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  const quillFormats = [
    'font', 'size', 'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'script', 'list', 'bullet', 'indent',
    'align', 'blockquote', 'code-block', 'link', 'image', 'video'
  ];

  const improvementTypes = [
    { value: 'general', label: 'General Enhancement', description: 'Overall clarity and structure' },
    { value: 'grammar', label: 'Grammar & Spelling', description: 'Fix grammar and spelling errors' },
    { value: 'clarity', label: 'Clarity & Conciseness', description: 'Make it clearer and more concise' },
    { value: 'academic', label: 'Academic Style', description: 'Formal academic writing' }
  ];

  const improveContent = async () => {
    if (!inputContent.trim()) {
      toast.error('❌ Please enter content to improve');
      return;
    }

    try {
      setLoading(true);
      const result = await noteService.aiToolImprove({
        input_content: inputContent,
        improvement_type: improvementType,
      });
      const cleanedContent = (result.generated_content || '')
        .replace(/^\s*Here is the improved content:\s*/i, '')
        .replace(/\s*I made the following adjustments:[\s\S]*$/i, '')
        .trim();

      setImprovedContent(cleanedContent);
      setHistoryId(result.history_id);
      toast.success('✨ Content improved successfully!');
    } catch (error) {
      console.error('Improvement error:', error);
      toast.error('❌ ' + (error.message || 'Failed to improve content'));
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
      exportToPDF(improvedContent, 'improved_content.pdf', 'Improved Content', {
        'Type': improvementType,
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
    navigator.clipboard.writeText(improvedContent);
    toast.success('✨ Content copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Helmet>
        <title>Improve Content - AI Tools | NoteAssist AI</title>
        <meta name="description" content="Enhance your content with AI-powered improvements. Fix grammar, improve clarity, and refine structure. Choose from multiple improvement types." />
        <meta property="og:title" content="Improve Content - AI Tools | NoteAssist AI" />
        <meta property="og:description" content="Enhance your content with AI-powered improvements. Fix grammar, improve clarity, and refine structure." />
        <meta name="twitter:title" content="Improve Content - AI Tools | NoteAssist AI" />
        <meta name="twitter:description" content="Enhance your content with AI-powered improvements." />
      </Helmet>

      {/* Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 animate-fadeInDown">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/ai-tools')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-lift"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={() => navigate('/home')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-lift"
            >
              <Home size={16} />
              Home
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-lift"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>
            <button
              onClick={() => navigate('/ai-tools/generate')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-lift"
            >
              <Sparkles size={16} />
              Generate Topic
            </button>
            <button
              onClick={() => navigate('/ai-tools/summarize')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-lift"
            >
              <AlignLeft size={16} />
              Summarize
            </button>
            <button
              onClick={() => navigate('/ai-tools/code')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-lift"
            >
              <Code size={16} />
              Generate Code
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Input Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            {/* Improvement Type Selection */}
            <div className="animate-fadeIn" style={{ animationDelay: '0.1s' }}>
              <label className="flex text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 items-center gap-2">
                <span className="text-lg">✨</span>
                Improvement Type
              </label>
              <div className="grid md:grid-cols-2 gap-3">
                {improvementTypes.map((type, index) => (
                  <button
                    key={type.value}
                    onClick={() => setImprovementType(type.value)}
                    className={`p-3 rounded-lg text-left transition-all border-2 transform hover:scale-105 ${
                      improvementType === type.value
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{type.label}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Explanation Section with Rich Text Editor */}
            <div className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                    {improvedContent ? 'Improved Content' : 'Content to Improve'}
                </label>
                  {improvedContent && (
                    <button
                      onClick={copyToClipboard}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all transform hover:scale-110"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  )}
              </div>
              <div className="min-h-[250px]">
                <ReactQuill
                  theme="snow"
                    value={improvedContent || inputContent}
                    onChange={(value) => {
                      if (improvedContent) {
                        setImprovedContent(value);
                      } else {
                        setInputContent(value);
                      }
                    }}
                  modules={quillModules}
                  formats={quillFormats}
                    placeholder={improvedContent ? "Your improved content will appear here..." : "Paste or write your content here... Use the toolbar to format text (bold, headings, lists, etc.)"}
                  className="bg-white dark:bg-gray-900"
                  style={{ minHeight: '200px' }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {improvedContent 
                    ? "Your content has been improved. You can edit it further, export as PDF, or upload to Drive."
                    : "Use the toolbar above to format your text with headings, bold, italic, lists, and more."
                  }
              </p>
            </div>

            <button
              onClick={improveContent}
              disabled={loading || !inputContent.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-lg hover:shadow-xl hover:scale-105 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed animate-slideInUp"
                style={{ display: improvedContent ? 'none' : 'flex', animationDelay: '0.3s' }}
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
          </div>


          {/* Export Options */}
          {improvedContent && (
            <div className="flex gap-4 flex-wrap animate-slideInUp" style={{ animationDelay: '0.4s' }}>
              <button
                onClick={exportToPDFHandler}
                disabled={loading}
                className="flex-1 min-w-max flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 dark:from-emerald-700 dark:to-teal-700 dark:hover:from-emerald-600 dark:hover:to-teal-600"
              >
                <Download className="w-5 h-5" />
                Export as PDF
              </button>
              <button
                onClick={uploadToGoogleDrive}
                disabled={loading}
                className="flex-1 min-w-max flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 dark:from-blue-700 dark:to-cyan-700 dark:hover:from-blue-600 dark:hover:to-cyan-600"
              >
                <Upload className="w-5 h-5" />
                Upload to Drive
              </button>
            </div>
          )}

          {improvedContent && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3 animate-slideInUp" style={{ animationDelay: '0.5s' }}>
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> This content is not saved to your notes. Use the Export or Upload buttons to save it.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIToolsImprovePage;
