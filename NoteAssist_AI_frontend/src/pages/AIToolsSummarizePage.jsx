// FILE: src/pages/AIToolsSummarizePage.jsx
// Summarize Content AI Tool
// ✅ All logic unchanged | ✅ Fully responsive | ✅ UX improved
// ============================================================================

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Download, Upload, Loader2, AlertCircle, CheckCircle,
  Copy, ArrowLeft, Sparkles, Code, Wand2,
} from 'lucide-react';
import '@/styles/animations.css';
import { noteService } from '@/services/note.service';
import { exportToPDF } from '@/utils/pdfExport';
import { toast } from 'react-hot-toast';

/* ─── Reusable header nav pill ─────────────────────────────────────────── */
const NavPill = ({ onClick, to, icon: Icon, label, variant = 'default' }) => {
  const base =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ' +
    'whitespace-nowrap flex-shrink-0 transition-all duration-150 border ';
  const styles = {
    default: base + 'border-gray-200 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50',
    back:    base + 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold',
  };
  const cls = styles[variant] || styles.default;
  return to
    ? <Link to={to} className={cls}><Icon size={12} />{label}</Link>
    : <button type="button" onClick={onClick} className={cls}><Icon size={12} />{label}</button>;
};

const AIToolsSummarizePage = () => {
  const navigate = useNavigate();

  // ── State (unchanged) ────────────────────────────────────────────────
  const [inputContent, setInputContent]           = useState('');
  const [summaryLength, setSummaryLength]         = useState('medium');
  const [summarizedContent, setSummarizedContent] = useState('');
  const [loading, setLoading]                     = useState(false);
  const [loadingPdf, setLoadingPdf]               = useState(false);
  const [loadingUpload, setLoadingUpload]         = useState(false);
  const [historyId, setHistoryId]                 = useState(null);

  const summaryLengths = [
    { value: 'short',  label: 'Short',  description: '25–50 words' },
    { value: 'medium', label: 'Medium', description: '50–100 words' },
    { value: 'long',   label: 'Long',   description: '100–200 words' },
  ];

  // ── Handlers (unchanged) ─────────────────────────────────────────────
  const summarizeContent = async () => {
    if (!inputContent.trim()) { toast.error('❌ Please enter content to summarize'); return; }
    if (inputContent.split(/\s+/).length < 50) { toast.error('❌ Content is too short. Please provide at least 50 words.'); return; }
    try {
      setLoading(true);
      const result = await noteService.aiToolSummarize({ input_content: inputContent, max_length: summaryLength });
      setSummarizedContent(result.generated_content);
      setHistoryId(result.history_id);
      toast.success('✨ Content summarized successfully!');
    } catch (error) {
      console.error('Summarization error:', error);
      toast.error('❌ ' + (error.message || 'Failed to summarize content'));
    } finally { setLoading(false); }
  };

  const exportToPDFHandler = async () => {
    if (!historyId) { toast.error('❌ No content to export'); return; }
    try {
      setLoadingPdf(true);
      exportToPDF(summarizedContent, 'summary.pdf', 'Summary', { 'Length': summaryLength });
      toast.success('✨ PDF exported successfully!');
      setTimeout(() => setLoadingPdf(false), 800);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('❌ ' + (error.message || 'Failed to export PDF'));
      setLoadingPdf(false);
    }
  };

  const uploadToGoogleDrive = async () => {
    if (!historyId) { toast.error('❌ No content to upload'); return; }
    try {
      setLoadingUpload(true);
      await noteService.exportAIHistoryToDrive(historyId);
      toast.success('✨ Uploaded to Google Drive successfully!');
      setTimeout(() => setLoadingUpload(false), 800);
    } catch (error) {
      console.error('Google Drive upload error:', error);
      toast.error('❌ ' + (error.message || 'Failed to upload to Google Drive'));
      setLoadingUpload(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summarizedContent);
    toast.success('✨ Summary copied to clipboard!');
  };

  const calculateReduction = () => {
    if (!inputContent || !summarizedContent) return 0;
    const inputWords   = inputContent.split(/\s+/).length;
    const summaryWords = summarizedContent.split(/\s+/).length;
    return Math.round(((inputWords - summaryWords) / inputWords) * 100);
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/50">
      <Helmet>
        <title>Summarize Content - AI Tools | NoteAssist AI</title>
        <meta name="description" content="Condense lengthy content into concise summaries. Choose your desired summary length and let AI summarize your text in seconds." />
        <meta property="og:title" content="Summarize Content - AI Tools | NoteAssist AI" />
        <meta property="og:description" content="Condense lengthy content into concise summaries." />
        <meta name="twitter:title" content="Summarize Content - AI Tools | NoteAssist AI" />
        <meta name="twitter:description" content="Condense lengthy content into concise summaries with AI." />
      </Helmet>

      {/* ── Sticky header ── */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30 animate-fadeInDown">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 h-14">
            {/* Title */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 flex-shrink-0">
                <FileText size={15} className="text-emerald-600" />
              </span>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">
                Summarize Content
              </h1>
            </div>
            {/* Nav — scrollable on mobile */}
            <nav
              className="flex items-center gap-1.5 overflow-x-auto flex-1 justify-end"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <NavPill onClick={() => navigate('/ai-tools/generate')} icon={Sparkles} label="Generate" />
              <NavPill onClick={() => navigate('/ai-tools/improve')}  icon={Wand2}    label="Improve"  />
              <NavPill to="/ai-tools/code"                            icon={Code}     label="Code"     />
              <NavPill onClick={() => navigate('/ai-tools')} icon={ArrowLeft} label="Back" variant="back" />
            </nav>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">

        {/* Input card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-7 space-y-5 animate-fadeIn">

          {/* Length options */}
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <span>📐</span> Desired Summary Length
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {summaryLengths.map(l => (
                <button
                  key={l.value}
                  onClick={() => setSummaryLength(l.value)}
                  disabled={loading}
                  className={`p-3 rounded-xl text-left border-2 transition-all duration-150 ${
                    summaryLength === l.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } disabled:opacity-60`}
                >
                  <div className={`text-sm font-semibold ${summaryLength === l.value ? 'text-emerald-700' : 'text-gray-900'}`}>
                    {l.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{l.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <span>📝</span> Paste Content to Summarize
            </p>
            <textarea
              value={inputContent}
              onChange={e => setInputContent(e.target.value)}
              placeholder="Paste your long text here… The AI will create a concise summary based on your selected length preference."
              disabled={loading}
              rows={7}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-y min-h-[160px] disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              {inputContent.length} characters · {Math.ceil(inputContent.split(/\s+/).length)} words
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={summarizeContent}
            disabled={loading || !inputContent.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.98] text-sm sm:text-base"
          >
            {loading
              ? <><Loader2 size={17} className="animate-spin" /> Summarizing…</>
              : <><FileText size={17} /> Create Summary</>}
          </button>
        </div>

        {/* Results */}
        {summarizedContent && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 animate-slideInUp">
            {/* Original */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-800">📄 Original Content</span>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full font-medium">
                  {inputContent.split(/\s+/).length} words
                </span>
              </div>
              <div className="p-5 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words" style={{ maxHeight: 360 }}>
                {inputContent}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 bg-emerald-50 border-b border-emerald-200">
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-600" /> Summary ✨
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {summarizedContent.split(/\s+/).length}w · {calculateReduction()}% less
                  </span>
                  <button onClick={copyToClipboard} className="p-1.5 hover:bg-emerald-100 rounded-lg transition-all" title="Copy to clipboard">
                    <Copy size={13} className="text-emerald-700" />
                  </button>
                </div>
              </div>
              <div
                className="p-5 overflow-y-auto text-sm text-gray-700 leading-relaxed"
                style={{ maxHeight: 360 }}
                dangerouslySetInnerHTML={{ __html: summarizedContent }}
              />
            </div>
          </div>
        )}

        {/* Export */}
        {summarizedContent && (
          <div className="flex flex-col sm:flex-row gap-3 animate-slideInUp">
            <button
              onClick={exportToPDFHandler} disabled={loadingPdf}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loadingPdf ? <><Loader2 size={15} className="animate-spin" /> Exporting…</> : <><Download size={15} /> Export as PDF</>}
            </button>
            <button
              onClick={uploadToGoogleDrive} disabled={loadingUpload}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loadingUpload ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : <><Upload size={15} /> Upload to Drive</>}
            </button>
          </div>
        )}

        {/* Note */}
        {summarizedContent && (
          <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl animate-slideInUp">
            <AlertCircle size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This summary is not saved to your notes. Use the Export or Upload buttons to save it.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AIToolsSummarizePage;