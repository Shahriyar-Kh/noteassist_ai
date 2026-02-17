// FILE: src/pages/AIToolsGenerateTopicPage.jsx
// Generate Topic AI Tool
// ✅ All logic unchanged | ✅ Fully responsive | ✅ UX improved
// ============================================================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Wand2, FileText, Loader, CheckCircle, Sparkles, Download, Cloud,
  AlertCircle, ArrowLeft, AlignLeft, Code,
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '@/styles/animations.css';
import { noteService } from '@/services/note.service';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { exportToPDF, exportToPDFBlob } from '@/utils/pdfExport';

/* ─── Nav pill ──────────────────────────────────────────────────────────── */
const NavPill = ({ onClick, to, icon: Icon, label, variant = 'default' }) => {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all duration-150 border ';
  const styles = {
    default: base + 'border-gray-200 bg-white text-gray-600 hover:border-purple-400 hover:text-purple-700 hover:bg-purple-50',
    back:    base + 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold',
  };
  const cls = styles[variant] || styles.default;
  return to
    ? <Link to={to} className={cls}><Icon size={12} />{label}</Link>
    : <button type="button" onClick={onClick} className={cls}><Icon size={12} />{label}</button>;
};

const AIToolsGenerateTopicPage = ({ topic, onSave, onCancel, onAIAction }) => {
  const navigate = useNavigate();

  // ── State (unchanged) ────────────────────────────────────────────────
  const [loading, setLoading]                   = useState(false);
  const [aiLoading, setAiLoading]               = useState(null);
  const [error, setError]                       = useState(null);
  const [learningLevel, setLearningLevel]       = useState('beginner');
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [driveStatus, setDriveStatus]           = useState({ connected: false, checking: true });
  const [historyId, setHistoryId]               = useState(null);
  const [formData, setFormData]                 = useState({
    name:        topic?.name || '',
    explanation: topic?.explanation?.content || '',
  });

  useEffect(() => {
    if (topic) setFormData({ name: topic.name || '', explanation: topic.explanation?.content || '' });
  }, [topic]);

  useEffect(() => { checkDriveStatus(); }, []);

  const checkDriveStatus = async () => {
    try {
      const response = await api.get('/api/notes/drive_status/');
      setDriveStatus({ connected: response.data.connected, can_export: response.data.can_export, checking: false });
    } catch { setDriveStatus({ connected: false, can_export: false, checking: false }); }
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

  // ── Handlers (unchanged) ─────────────────────────────────────────────
  const handleConnectDrive = async () => {
    try {
      const response = await api.get('/api/notes/google_auth_url/');
      if (response.data.auth_url) {
        const authWindow = window.open(response.data.auth_url, 'Google Drive Auth', 'width=600,height=700,left=100,top=100');
        const handleMessage = (event) => {
          if (event.data.type === 'google-auth-success') { toast.success('Google Drive connected successfully!'); checkDriveStatus(); authWindow?.close(); }
          else if (event.data.type === 'google-auth-error') { toast.error('Failed to connect Google Drive'); authWindow?.close(); }
        };
        window.addEventListener('message', handleMessage);
        const checkClosed = setInterval(() => { if (authWindow?.closed) { clearInterval(checkClosed); window.removeEventListener('message', handleMessage); checkDriveStatus(); } }, 500);
      }
    } catch { toast.error('Failed to initiate Google Drive connection'); }
  };

  const handleUploadToGoogleDrive = async () => {
    if (!historyId) { toast.error('❌ Please generate content first'); return; }
    setUploadingToDrive(true);
    try {
      const filename = `${formData.name.replace(/\s+/g, '_')}.pdf`;
      const { blob, filename: resolvedName } = await exportToPDFBlob(
        formData.explanation,
        filename,
        formData.name,
        { 'Learning Level': learningLevel, 'Topic': formData.name }
      );
      const file = new File([blob], resolvedName, { type: 'application/pdf' });
      const result = await noteService.uploadAIHistoryPdfToDrive(historyId, file, resolvedName);
      if (result?.success) {
        toast.success('✨ Content uploaded to Google Drive successfully!');
      } else if (result?.needs_auth) {
        toast.error('❌ Please connect Google Drive to continue');
        handleConnectDrive();
      } else {
        toast.error('❌ ' + (result?.error || 'Failed to upload to Google Drive'));
      }
    } catch (error) {
      console.error('Drive export error:', error);
      toast.error('❌ ' + (error.message || 'Failed to upload to Google Drive'));
    } finally { setUploadingToDrive(false); }
  };

  const handleExportPDF = async () => {
    if (!formData.explanation || !formData.name) { toast.error('Please generate content first'); return; }
    try {
      setLoading(true);
      exportToPDF(formData.explanation, `${formData.name.replace(/\s+/g, '_')}.pdf`, formData.name, { 'Learning Level': learningLevel, 'Topic': formData.name });
      toast.success('✨ PDF exported successfully!');
      setTimeout(() => setLoading(false), 800);
    } catch { toast.error('❌ Failed to export PDF'); setLoading(false); }
  };

  const handleAI = async (action) => {
    setError(null);
    setAiLoading(action);
    try {
      let requestData = { action_type: action, level: learningLevel, subject_area: 'programming' };
      if (action === 'generate_explanation') {
        const input = formData.name.trim();
        if (!input) throw new Error('Please enter a topic name first');
        requestData.topic_name = input;
        const programmingKeywords = ['function','class','loop','array','variable','algorithm','code','programming','python','javascript','java','c++','syntax','method','object','string','integer','boolean','recursion','sorting','database','api','framework'];
        requestData.subject_area = programmingKeywords.some(kw => input.toLowerCase().includes(kw)) ? 'programming' : 'general';
      }
      const result = await noteService.aiToolExplain({
        title: requestData.topic_name,
        level: learningLevel,
        subject_area: requestData.subject_area
      });
      setFormData(prev => ({ ...prev, explanation: result.generated_content }));
      setHistoryId(result.history_id || null);
      toast.success(`✨ Explanation generated successfully (${learningLevel} level)!`);
    } catch (error) {
      console.error('AI action failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'AI action failed';
      setError(errorMessage);
      toast.error('❌ ' + errorMessage);
    } finally { setAiLoading(null); }
  };

  const levels = [
    { value: 'beginner',     icon: '🌱', label: 'Beginner',     desc: 'Simple & Easy',
      infoColor: '#15803d', infoText: 'Simple explanations with basic examples. Easy to understand for those just starting out.' },
    { value: 'intermediate', icon: '📚', label: 'Intermediate', desc: 'More Details',
      infoColor: '#1d4ed8', infoText: 'More detailed explanations with practical examples. Good for those who know programming basics.' },
    { value: 'advanced',     icon: '🚀', label: 'Advanced',     desc: 'Deep Dive',
      infoColor: '#7c3aed', infoText: 'Deep technical details, performance optimization, and edge cases for experienced developers.' },
    { value: 'expert',       icon: '⭐', label: 'Expert',       desc: 'Production',
      infoColor: '#dc2626', infoText: 'Production-grade knowledge with architecture, scalability, and industry best practices.' },
  ];
  const currentLevel = levels.find(l => l.value === learningLevel);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40">
      <Helmet>
        <title>Generate Topic - AI Tools | NoteAssist AI</title>
        <meta name="description" content="Generate comprehensive learning topics with AI-powered explanations." />
        <meta property="og:title" content="Generate Topic - AI Tools | NoteAssist AI" />
        <meta property="og:description" content="Generate comprehensive learning topics with AI-powered explanations." />
        <meta name="twitter:title" content="Generate Topic - AI Tools | NoteAssist AI" />
        <meta name="twitter:description" content="Generate comprehensive learning topics with AI-powered explanations." />
      </Helmet>

      {/* ── Sticky header ── */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30 animate-fadeInDown">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 h-14">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 flex-shrink-0">
                <Sparkles size={15} className="text-purple-600" />
              </span>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">
                Generate Topic
              </h1>
            </div>
            <nav className="flex items-center gap-1.5 overflow-x-auto flex-1 justify-end" style={{ scrollbarWidth: 'none' }}>
              <NavPill onClick={() => navigate('/ai-tools/improve')}   icon={Wand2}     label="Improve"   />
              <NavPill onClick={() => navigate('/ai-tools/summarize')} icon={AlignLeft}  label="Summarize" />
              <NavPill to="/ai-tools/code"                             icon={Code}       label="Code"      />
              <NavPill onClick={() => navigate('/ai-tools')} icon={ArrowLeft} label="Back" variant="back" />
            </nav>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-7 space-y-5 animate-fadeIn">

          {/* Error */}
          {error && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Topic name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <span>📝</span> Topic Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Binary Search Algorithm"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
            />
            {!formData.name && (
              <p className="text-xs text-gray-400 mt-1.5">Topic name is required to generate content</p>
            )}
          </div>

          {/* Learning level */}
          <div className="p-4 sm:p-5 rounded-xl border border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-indigo-700 mb-3">
              <span>🎓</span> Learning Level
              <span className="text-xs font-normal text-gray-500">(Choose your level for AI content generation)</span>
            </p>

            {/* Level buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {levels.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLearningLevel(l.value)}
                  className={`p-3 rounded-xl border-2 text-center transition-all duration-150 ${
                    learningLevel === l.value
                      ? 'border-purple-500 bg-purple-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-xl mb-1">{l.icon}</div>
                  <div className={`text-xs font-semibold ${learningLevel === l.value ? 'text-purple-700' : 'text-gray-800'}`}>
                    {l.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{l.desc}</div>
                </button>
              ))}
            </div>

            {/* Level description */}
            {currentLevel && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200 flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{currentLevel.icon}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: currentLevel.infoColor }}>
                    {currentLevel.label} Level
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{currentLevel.infoText}</p>
                </div>
              </div>
            )}
          </div>

          {/* Explanation editor */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <FileText size={14} className="text-purple-600" /> Explanation
              </p>
              <button
                onClick={() => handleAI('generate_explanation')}
                disabled={!!aiLoading || !formData.name.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold rounded-lg hover:shadow-md hover:shadow-purple-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.98]"
              >
                {aiLoading === 'generate_explanation'
                  ? <><Loader size={13} className="animate-spin" /> Generating…</>
                  : <><Sparkles size={13} /> Generate ({learningLevel})</>}
              </button>
            </div>
            <ReactQuill
              theme="snow"
              value={formData.explanation}
              onChange={value => setFormData(prev => ({ ...prev, explanation: value }))}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Explain this topic in detail… Use the toolbar to format text (bold, headings, lists, etc.)"
              style={{ minHeight: 200 }}
            />
            <p className="text-xs text-gray-400 mt-2">
              Use the toolbar above to format your text with headings, bold, italic, lists, and more.
            </p>
          </div>

          {/* Export section */}
          {formData.explanation && formData.name && (
            <div className="p-4 sm:p-5 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Download size={14} className="text-green-600" /> Export Your Content
                </p>
                {!driveStatus.checking && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-xs font-medium">
                    {driveStatus.connected
                      ? <><CheckCircle size={12} className="text-green-600" /><span className="text-green-700">Drive Connected</span></>
                      : <><AlertCircle size={12} className="text-orange-500" /><span className="text-orange-700">Drive Not Connected</span></>}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExportPDF} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-red-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? <><Loader size={15} className="animate-spin" /> Exporting…</> : <><Download size={15} /> Export as PDF</>}
                </button>
                <button
                  onClick={handleUploadToGoogleDrive} disabled={uploadingToDrive || loading}
                  className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                    driveStatus.connected
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-blue-500/20'
                      : 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:shadow-orange-500/20'
                  }`}
                >
                  {uploadingToDrive
                    ? <><Loader size={15} className="animate-spin" /> Uploading…</>
                    : <><Cloud size={15} /> {driveStatus.connected ? 'Upload to Drive' : 'Connect Drive'}</>}
                </button>
              </div>
            </div>
          )}

          {/* Tip */}
          <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <AlertCircle size={15} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              <strong>💡 Tip:</strong> Use the enhanced editor toolbar for headings, alignment, images, and more. Export your content as PDF or upload to Google Drive for backup.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AIToolsGenerateTopicPage;