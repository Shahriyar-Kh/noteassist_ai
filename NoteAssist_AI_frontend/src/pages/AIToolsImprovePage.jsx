// FILE: src/pages/AIToolsImprovePage.jsx
// Improve Content AI Tool
// ✅ All logic unchanged | ✅ Fully responsive | ✅ UX improved
// ============================================================================

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useDraftPersistence, DRAFT_KEYS } from '@/hooks/useDraftPersistence';
import {
  Wand2, Download, Upload, Loader2, AlertCircle,
  Copy, ArrowLeft, AlignLeft, Code, Sparkles, FileText, CheckCircle, Trash2,
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
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all duration-150 border ';
  const styles = {
    default: base + 'border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50',
    back:    base + 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold',
  };
  const cls = styles[variant] || styles.default;
  return to
    ? <Link to={to} className={cls}><Icon size={12} />{label}</Link>
    : <button type="button" onClick={onClick} className={cls}><Icon size={12} />{label}</button>;
};

const AIToolsImprovePage = () => {
  const navigate = useNavigate();

  // ── Draft Persistence (auto-save + auto-restore)
  const initialDraftState = {
    inputContent: '',
    improvementType: 'general',
    improvedContent: '',
  };

  const {
    state: draftState,
    updateField,
    clearDraft,
    hasContent,
    lastSaved,
  } = useDraftPersistence(DRAFT_KEYS.AI_IMPROVE, initialDraftState, {
    warnOnUnload: true,
  });

  // ── Destructure draft state
  const { inputContent, improvementType, improvedContent } = draftState;

  // ── State setters that update draft
  const setInputContent = (val) => updateField('inputContent', val);
  const setImprovementType = (val) => updateField('improvementType', val);
  const setImprovedContent = (val) => updateField('improvedContent', val);

  // ── Non-persisted UI State
  const [loading, setLoading]                 = useState(false);
  const [loadingPdf, setLoadingPdf]           = useState(false);
  const [loadingUpload, setLoadingUpload]     = useState(false);
  const [historyId, setHistoryId]             = useState(null);

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

  const improvementTypes = [
    { value: 'general',  label: 'General Enhancement', description: 'Overall clarity and structure' },
    { value: 'grammar',  label: 'Grammar & Spelling',   description: 'Fix grammar and spelling errors' },
    { value: 'clarity',  label: 'Clarity & Conciseness',description: 'Make it clearer and more concise' },
    { value: 'academic', label: 'Academic Style',        description: 'Formal academic writing' },
  ];

  // ── Handlers (unchanged) ─────────────────────────────────────────────
  const improveContent = async () => {
    if (!inputContent.trim()) { toast.error('❌ Please enter content to improve'); return; }
    try {
      setLoading(true);
      const result = await noteService.aiToolImprove({ input_content: inputContent, improvement_type: improvementType });
      const cleanedContent = (result.generated_content || '')
        .replace(/^\s*Here is the improved content:\s*/i, '')
        .replace(/\s*I made the following adjustments:[\s\S]*$/i, '')
        .trim();
      setImprovedContent(cleanedContent);
      setHistoryId(result.history_id);
      toast.success('✨ Content improved successfully!');
    } catch (error) {
      logger.error('Improvement error:', String(error));
      toast.error('❌ ' + (error.message || 'Failed to improve content'));
    } finally { setLoading(false); }
  };

  const exportToPDFHandler = async () => {
    if (!historyId) { toast.error('❌ No content to export'); return; }
    try {
      setLoadingPdf(true);
      exportToPDF(improvedContent, 'improved_content.pdf', 'Improved Content', { 'Type': improvementType });
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
      const filename = 'improved_content.pdf';
      const { blob, filename: resolvedName } = await exportToPDFBlob(
        improvedContent,
        filename,
        'Improved Content',
        { 'Type': improvementType }
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
    navigator.clipboard.writeText(improvedContent);
    toast.success('✨ Content copied to clipboard!');
  };

  const handleGenerateAnother = () => {
    setImprovedContent('');
    setHistoryId(null);
    setLoadingPdf(false);
    setLoadingUpload(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      <Helmet>
        <title>Improve Content - AI Tools | NoteAssist AI</title>
        <meta name="description" content="Enhance your content with AI-powered improvements. Fix grammar, improve clarity, and refine structure." />
        <meta property="og:title" content="Improve Content - AI Tools | NoteAssist AI" />
        <meta property="og:description" content="Enhance your content with AI-powered improvements." />
        <meta name="twitter:title" content="Improve Content - AI Tools | NoteAssist AI" />
        <meta name="twitter:description" content="Enhance your content with AI-powered improvements." />
      </Helmet>

      {/* ── Sticky header ── */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30 animate-fadeInDown">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 h-14">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 flex-shrink-0">
                <Wand2 size={15} className="text-blue-600" />
              </span>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">
                Improve Content
              </h1>
            </div>
            <nav className="flex items-center gap-1.5 overflow-x-auto flex-1 justify-end" style={{ scrollbarWidth: 'none' }}>
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
              <NavPill onClick={() => navigate('/ai-tools/generate')} icon={Sparkles}  label="Generate" />
              <NavPill onClick={() => navigate('/ai-tools/summarize')} icon={AlignLeft} label="Summarize" />
              <NavPill to="/ai-tools/code"                             icon={Code}      label="Code"      />
              <NavPill onClick={() => navigate('/ai-tools')} icon={ArrowLeft} label="Back" variant="back" />
            </nav>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-7 space-y-5 animate-fadeIn">

          {/* Type selector */}
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <span>✨</span> Improvement Type
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {improvementTypes.map(t => (
                <button
                  key={t.value}
                  onClick={() => setImprovementType(t.value)}
                  disabled={loading}
                  className={`p-3 rounded-xl text-left border-2 transition-all duration-150 ${
                    improvementType === t.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } disabled:opacity-60`}
                >
                  <div className={`text-sm font-semibold ${improvementType === t.value ? 'text-blue-700' : 'text-gray-900'}`}>
                    {t.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Editor section */}
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <FileText size={14} className="text-blue-600" />
                {improvedContent ? 'Improved Content' : 'Content to Improve'}
              </p>
              {improvedContent && (
                <button onClick={copyToClipboard} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all" title="Copy to clipboard">
                  <Copy size={14} className="text-gray-600" />
                </button>
              )}
            </div>
            <ReactQuill
              theme="snow"
              value={improvedContent || inputContent}
              onChange={value => { improvedContent ? setImprovedContent(value) : setInputContent(value); }}
              modules={quillModules}
              formats={quillFormats}
              placeholder={improvedContent
                ? 'Your improved content will appear here…'
                : 'Paste or write your content here… Use the toolbar to format text (bold, headings, lists, etc.)'}
              style={{ minHeight: 200 }}
            />
            <p className="text-xs text-gray-400 mt-2">
              {improvedContent
                ? 'Your content has been improved. You can edit it further, export as PDF, or upload to Drive.'
                : 'Use the toolbar above to format your text with headings, bold, italic, lists, and more.'}
            </p>
          </div>

          {/* Improve button — visible only before result */}
          {!improvedContent && (
            <button
              onClick={improveContent}
              disabled={loading || !inputContent.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.98] text-sm sm:text-base"
            >
              {loading
                ? <><Loader2 size={17} className="animate-spin" /> Improving…</>
                : <><Wand2 size={17} /> Improve Content</>}
            </button>
          )}
        </div>

        {/* Export */}
        {improvedContent && (
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
        {improvedContent && (
          <div className="flex flex-col gap-3 pt-2 border-t border-gray-100 animate-slideInUp">
            <button
              onClick={handleGenerateAnother}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 text-blue-700 font-semibold rounded-xl hover:bg-blue-50 hover:shadow-md hover:shadow-blue-500/15 transition-all duration-200 active:scale-[.98] text-sm"
            >
              <Wand2 size={15} /> Improve Another Content
            </button>
          </div>
        )}

        {/* Note */}
        {improvedContent && (
          <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl animate-slideInUp">
            <AlertCircle size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This content is not saved to your notes. Use the Export or Upload buttons to save it.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AIToolsImprovePage;