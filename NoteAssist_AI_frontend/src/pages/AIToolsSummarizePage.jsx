// FILE: src/pages/AIToolsSummarizePage.jsx
// Summarize Content AI Tool
// ✅ All logic unchanged | ✅ Fully responsive | ✅ UX improved
// ============================================================================

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useDraftPersistence, DRAFT_KEYS } from '@/hooks/useDraftPersistence';
import {
  FileText, Download, Upload, Loader2, AlertCircle, CheckCircle,
  Copy, ArrowLeft, Sparkles, Code, Wand2, Trash2,
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '@/styles/animations.css';
import { noteService } from '@/services/note.service';
import { exportToPDF, exportToPDFBlob } from '@/utils/pdfExport';
import { toast } from 'react-hot-toast';
import logger from '@/utils/logger';

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

  // ── Draft Persistence (auto-save + auto-restore)
  const initialDraftState = {
    inputContent: '',
    summaryLevel: 'beginner',
    summarizedContent: '',
    editableSummary: '',
  };

  const {
    state: draftState,
    updateField,
    updateFields,
    clearDraft,
    hasContent,
    lastSaved,
  } = useDraftPersistence(DRAFT_KEYS.AI_SUMMARIZE, initialDraftState, {
    warnOnUnload: true,
  });

  // ── Destructure draft state
  const { inputContent, summaryLevel, summarizedContent, editableSummary } = draftState;

  // ── State setters that update draft
  const setInputContent = (val) => updateField('inputContent', val);
  const setSummaryLevel = (val) => updateField('summaryLevel', val);
  const setSummarizedContent = (val) => updateField('summarizedContent', val);
  const setEditableSummary = (val) => updateField('editableSummary', val);

  // ── Non-persisted UI State
  const [loading, setLoading]                     = useState(false);
  const [loadingPdf, setLoadingPdf]               = useState(false);
  const [loadingUpload, setLoadingUpload]         = useState(false);
  const [historyId, setHistoryId]                 = useState(null);

  const summaryLevels = [
    { value: 'beginner',     icon: '🌱', label: 'Beginner',     desc: 'Simple & Clear' },
    { value: 'intermediate', icon: '📚', label: 'Intermediate', desc: 'Balanced Detail' },
    { value: 'advanced',     icon: '🚀', label: 'Advanced',     desc: 'Technical' },
    { value: 'expert',       icon: '⭐', label: 'Expert',       desc: 'Professional' },
  ];

  // ── Handlers (unchanged) ─────────────────────────────────────────────
  const summarizeContent = async () => {
    if (!inputContent.trim()) { toast.error('❌ Please enter content to summarize'); return; }
    if (inputContent.split(/\s+/).length < 50) { toast.error('❌ Content is too short. Please provide at least 50 words.'); return; }
    try {
      setLoading(true);
      const result = await noteService.aiToolSummarize({ 
        input_content: inputContent, 
        level: summaryLevel 
      });
      // Update both summarized and editable content at once
      updateFields({
        summarizedContent: result.generated_content,
        editableSummary: result.generated_content,
      });
      setHistoryId(result.history_id);
      const levelLabel = summaryLevels.find(l => l.value === summaryLevel)?.label || summaryLevel;
      toast.success(`✨ Content summarized successfully (${levelLabel} level)!`);
    } catch (error) {
      logger.error('Summarization error:', String(error));
      toast.error('❌ ' + (error.message || 'Failed to summarize content'));
    } finally { setLoading(false); }
  };

  const exportToPDFHandler = async () => {
    if (!historyId) { toast.error('❌ No content to export'); return; }
    try {
      setLoadingPdf(true);
      exportToPDF(editableSummary, 'summary.pdf', 'Summary', { 'Level': summaryLevel });
      toast.success('✨ PDF exported successfully!');
      setTimeout(() => setLoadingPdf(false), 800);
    } catch (error) {
      logger.error('PDF export error:', String(error));
      toast.error('❌ ' + (error.message || 'Failed to export PDF'));
      setLoadingPdf(false);
    }
  };

  const uploadToGoogleDrive = async () => {
    if (!historyId) { toast.error('❌ No content to upload'); return; }
    try {
      setLoadingUpload(true);
      const filename = 'summary.pdf';
      const { blob, filename: resolvedName } = await exportToPDFBlob(
        editableSummary,
        filename,
        'Summary',
        { 'Level': summaryLevel }
      );
      const file = new File([blob], resolvedName, { type: 'application/pdf' });
      const result = await noteService.uploadAIHistoryPdfToDrive(historyId, file, resolvedName);
      if (result?.success) {
        toast.success('✨ Uploaded to Google Drive successfully!');
      } else if (result?.needs_auth) {
        toast.error('❌ Please connect Google Drive to continue');
      } else {
        toast.error('❌ ' + (result?.error || 'Failed to upload to Google Drive'));
      }
      setTimeout(() => setLoadingUpload(false), 800);
    } catch (error) {
      logger.error('Google Drive upload error:', String(error));
      toast.error('❌ ' + (error.message || 'Failed to upload to Google Drive'));
      setLoadingUpload(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editableSummary);
    toast.success('✨ Summary copied to clipboard!');
  };

  const quillModules = {
    toolbar: [
      [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean'],
    ],
  };
  const quillFormats = [
    'font','size','header','bold','italic','underline','strike',
    'color','background','script','list','bullet','indent',
    'align','blockquote','code-block','link','image','video',
  ];

  const calculateReduction = () => {
    if (!inputContent || !summarizedContent) return 0;
    const inputWords   = inputContent.split(/\s+/).length;
    const summaryWords = summarizedContent.split(/\s+/).length;
    return Math.round(((inputWords - summaryWords) / inputWords) * 100);
  };

  const handleGenerateAnother = () => {
    setSummarizedContent('');
    setHistoryId(null);
    setLoadingPdf(false);
    setLoadingUpload(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              {/* Draft Status Indicator */}
              {hasContent && (
                <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200 flex-shrink-0">
                  <CheckCircle size={12} />
                  Draft saved
                </span>
              )}
              {hasContent && (
                <button
                  onClick={() => clearDraft()}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  title="Clear draft"
                >
                  <Trash2 size={14} className="text-gray-500" />
                </button>
              )}
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

          {/* Level options */}
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <span>🎓</span> Summary Level
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {summaryLevels.map(l => (
                <button
                  key={l.value}
                  onClick={() => setSummaryLevel(l.value)}
                  disabled={loading}
                  className={`p-3 rounded-xl text-center border-2 transition-all duration-150 ${
                    summaryLevel === l.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } disabled:opacity-60`}
                >
                  <div className="text-xl mb-1">{l.icon}</div>
                  <div className={`text-xs font-semibold ${summaryLevel === l.value ? 'text-emerald-700' : 'text-gray-900'}`}>
                    {l.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{l.desc}</div>
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

        {/* Results - RichText Editor */}
        {summarizedContent && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-7 space-y-5 animate-slideInUp">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <FileText size={14} className="text-emerald-600" /> Summary
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {editableSummary.split(/\s+/).length}w
                </span>
                <button onClick={copyToClipboard} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all" title="Copy to clipboard">
                  <Copy size={14} className="text-gray-600" />
                </button>
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <ReactQuill
                theme="snow"
                value={editableSummary}
                onChange={value => setEditableSummary(value)}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Your summary will appear here... You can edit it using the toolbar above."
                style={{ minHeight: 250 }}
              />
              <p className="text-xs text-gray-400 mt-2">
                Use the toolbar above to format your summary. You can edit, add styling, links, and more.
              </p>
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

        {/* Generate Another button */}
        {summarizedContent && (
          <div className="flex flex-col gap-3 pt-2 border-t border-gray-100 animate-slideInUp">
            <button
              onClick={handleGenerateAnother}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 hover:shadow-md hover:shadow-emerald-500/15 transition-all duration-200 active:scale-[.98] text-sm"
            >
              <FileText size={15} /> Summarize Another Content
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