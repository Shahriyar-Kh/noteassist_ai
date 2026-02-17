// FILE: src/pages/AIToolsGenerateCodePage.jsx
// Generate & Execute Code AI Tool
// ✅ All logic unchanged | ✅ Fully responsive | ✅ UX improved
// ============================================================================

import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import {
  Code, Play, Download, Upload, Loader2, AlertCircle,
  Copy, ArrowLeft, Terminal, RotateCcw, Sparkles, Wand2, AlignLeft,
} from 'lucide-react';
import '@/styles/animations.css';
import { noteService } from '@/services/note.service';
import { exportCodeToPDF, exportCodeToPDFBlob } from '@/utils/pdfExport';
import { toast } from 'react-hot-toast';

/* ─── Nav pill ──────────────────────────────────────────────────────────── */
const NavPill = ({ onClick, to, icon: Icon, label, variant = 'default' }) => {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all duration-150 border ';
  const styles = {
    default: base + 'border-gray-200 bg-white text-gray-600 hover:border-orange-400 hover:text-orange-700 hover:bg-orange-50',
    back:    base + 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold',
  };
  const cls = styles[variant] || styles.default;
  return to
    ? <a href={to} className={cls}><Icon size={12} />{label}</a>
    : <button type="button" onClick={onClick} className={cls}><Icon size={12} />{label}</button>;
};

const AIToolsGenerateCodePage = () => {
  const navigate = useNavigate();
  const outputRef = useRef(null);

  // ── State (unchanged) ────────────────────────────────────────────────
  const [topic, setTopic]                     = useState('');
  const [language, setLanguage]               = useState('python');
  const [level, setLevel]                     = useState('beginner');
  const [generatedCode, setGeneratedCode]     = useState('');
  const [executionOutput, setExecutionOutput] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [executing, setExecuting]             = useState(false);
  const [historyId, setHistoryId]             = useState(null);
  const [editableCode, setEditableCode]       = useState('');

  const languages = [
    { value: 'python',     label: 'Python',     ext: '.py' },
    { value: 'javascript', label: 'JavaScript', ext: '.js' },
    { value: 'java',       label: 'Java',       ext: '.java' },
    { value: 'cpp',        label: 'C++',        ext: '.cpp' },
    { value: 'csharp',     label: 'C#',         ext: '.cs' },
    { value: 'go',         label: 'Go',         ext: '.go' },
    { value: 'rust',       label: 'Rust',       ext: '.rs' },
    { value: 'sql',        label: 'SQL',        ext: '.sql' },
  ];
  const levels = [
    { value: 'beginner',     label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced',     label: 'Advanced' },
  ];

  // ── Handlers (unchanged) ─────────────────────────────────────────────
  const generateCode = async () => {
    if (!topic.trim()) { toast.error('❌ Please enter a code topic or requirement'); return; }
    try {
      setLoading(true);
      const result = await noteService.aiToolGenerateCode({ title: topic, language, level });
      setGeneratedCode(result.generated_content);
      setEditableCode(result.generated_content);
      setHistoryId(result.history_id);
      setExecutionOutput('');
      toast.success('✨ Code generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('❌ ' + (error.message || 'Failed to generate code'));
    } finally { setLoading(false); }
  };

  const executeCode = async () => {
    if (!editableCode.trim()) { toast.error('❌ No code to execute'); return; }
    try {
      setExecuting(true);
      setExecutionOutput('Executing code…\n');
      const result = await noteService.executeCode({ code: editableCode, language });
      setExecutionOutput(result.success ? (result.output || 'Code executed successfully!') : `Error: ${result.error}`);
    } catch (error) {
      console.error('Execution error:', error);
      setExecutionOutput(`Error: ${error.message}`);
    } finally { setExecuting(false); }
  };

  const exportToPDFHandler = async () => {
    if (!generatedCode) { toast.error('❌ No code to export'); return; }
    try {
      setLoading(true);
      exportCodeToPDF(editableCode, `code_${topic.replace(/\s+/g, '_')}.pdf`, language, { 'Topic': topic });
      toast.success('✨ PDF exported successfully!');
      setTimeout(() => setLoading(false), 800);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('❌ ' + (error.message || 'Failed to export PDF'));
      setLoading(false);
    }
  };

  const uploadToGoogleDrive = async () => {
    if (!historyId) { toast.error('❌ No code to upload'); return; }
    try {
      setLoading(true);
      const filename = `code_${topic.replace(/\s+/g, '_')}.pdf`;
      const { blob, filename: resolvedName } = await exportCodeToPDFBlob(
        editableCode,
        filename,
        language,
        { 'Topic': topic }
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
    } catch (error) {
      console.error('Google Drive upload error:', error);
      toast.error('❌ ' + (error.message || 'Failed to upload to Google Drive'));
    } finally { setLoading(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editableCode);
    toast.success('✨ Code copied to clipboard!');
  };

  const downloadCode = () => {
    const element = document.createElement('a');
    const file = new Blob([editableCode], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    const langData = languages.find(l => l.value === language);
    element.download = `code${langData?.ext || '.txt'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('✨ Code downloaded!');
  };

  const handleGenerateAnother = () => {
    setGeneratedCode('');
    setEditableCode('');
    setExecutionOutput('');
    setHistoryId(null);
    setLoading(false);
    setExecuting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/40">
      <Helmet>
        <title>Generate & Execute Code - AI Tools | NoteAssist AI</title>
        <meta name="description" content="Generate code in any programming language using AI. Execute code with instant output in a terminal-like environment." />
        <meta property="og:title" content="Generate & Execute Code - AI Tools | NoteAssist AI" />
        <meta property="og:description" content="Generate code in any programming language using AI. Execute code with instant output." />
        <meta name="twitter:title" content="Generate & Execute Code - AI Tools | NoteAssist AI" />
        <meta name="twitter:description" content="Generate and execute code in any programming language with AI." />
      </Helmet>

      {/* ── Sticky header ── */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30 animate-fadeInDown">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 h-14">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 flex-shrink-0">
                <Code size={15} className="text-orange-600" />
              </span>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">
                Generate &amp; Execute Code
              </h1>
            </div>
            <nav className="flex items-center gap-1.5 overflow-x-auto flex-1 justify-end" style={{ scrollbarWidth: 'none' }}>
              <NavPill onClick={() => navigate('/ai-tools/generate')}  icon={Sparkles}  label="Generate"  />
              <NavPill onClick={() => navigate('/ai-tools/improve')}   icon={Wand2}     label="Improve"   />
              <NavPill onClick={() => navigate('/ai-tools/summarize')} icon={AlignLeft}  label="Summarize" />
              <NavPill onClick={() => navigate('/ai-tools')} icon={ArrowLeft} label="Back" variant="back" />
            </nav>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">

        {/* Input card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-7 space-y-5 animate-fadeIn">

          {/* Topic */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <span>💡</span> Code Topic or Requirement
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateCode()}
              placeholder="Describe what code you want… (e.g., 'Fibonacci function', 'Web scraper')"
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Language + Level + Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                <span>🔤</span> Programming Language
              </label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none appearance-none bg-white bg-no-repeat disabled:bg-gray-50 disabled:cursor-not-allowed"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")", backgroundPosition: 'right 12px center', backgroundSize: '16px', paddingRight: '36px' }}
              >
                {languages.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                <span>🎯</span> Complexity Level
              </label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none appearance-none bg-white bg-no-repeat disabled:bg-gray-50 disabled:cursor-not-allowed"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")", backgroundPosition: 'right 12px center', backgroundSize: '16px', paddingRight: '36px' }}
              >
                {levels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <button
              onClick={generateCode}
              disabled={loading || !topic.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.98] text-sm"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : <><Code size={16} /> Generate Code</>}
            </button>
          </div>
        </div>

        {/* Code editor + terminal */}
        {generatedCode && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 animate-slideInUp">
            {/* Editor */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col" style={{ minHeight: 380 }}>
              <div className="flex items-center justify-between px-5 py-3 bg-gray-900">
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                  <Code size={14} /> Code Editor
                </span>
                <div className="flex gap-1">
                  <button onClick={copyToClipboard}  className="p-1.5 hover:bg-gray-700 rounded-lg transition-all" title="Copy code"><Copy size={13} className="text-gray-300" /></button>
                  <button onClick={downloadCode}     className="p-1.5 hover:bg-gray-700 rounded-lg transition-all" title="Download code"><Download size={13} className="text-gray-300" /></button>
                </div>
              </div>
              <textarea
                value={editableCode}
                onChange={e => setEditableCode(e.target.value)}
                spellCheck={false}
                className="flex-1 px-5 py-4 font-mono text-sm bg-gray-50 text-gray-800 border-0 resize-none outline-none leading-relaxed"
                style={{ minHeight: 320 }}
              />
            </div>

            {/* Terminal */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col" style={{ minHeight: 380 }}>
              <div className="flex items-center justify-between px-5 py-3 bg-gray-900">
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                  <Terminal size={14} /> Execution Output
                </span>
                <button onClick={() => setExecutionOutput('')} className="p-1.5 hover:bg-gray-700 rounded-lg transition-all" title="Clear output">
                  <RotateCcw size={13} className="text-gray-300" />
                </button>
              </div>
              <div
                ref={outputRef}
                className="flex-1 px-5 py-4 bg-gray-950 overflow-y-auto"
                style={{ minHeight: 320 }}
              >
                <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap break-words leading-relaxed m-0">
                  {executionOutput || 'Output will appear here…'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {generatedCode && (
          <div className="flex flex-wrap gap-3 animate-slideInUp">
            <button
              onClick={executeCode}
              disabled={executing || !editableCode.trim()}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {executing ? <><Loader2 size={15} className="animate-spin" /> Executing…</> : <><Play size={15} /> Run Code</>}
            </button>
            <button
              onClick={exportToPDFHandler}
              disabled={loading}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Exporting…</> : <><Download size={15} /> Export PDF</>}
            </button>
            <button
              onClick={uploadToGoogleDrive}
              disabled={loading}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : <><Upload size={15} /> Upload to Drive</>}
            </button>
          </div>
        )}

        {/* Generate Another button */}
        {generatedCode && (
          <div className="flex flex-col gap-3 pt-2 border-t border-gray-100 animate-slideInUp">
            <button
              onClick={handleGenerateAnother}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 text-orange-700 font-semibold rounded-xl hover:bg-orange-50 hover:shadow-md hover:shadow-orange-500/15 transition-all duration-200 active:scale-[.98] text-sm"
            >
              <Code size={15} /> Generate Another Code
            </button>
          </div>
        )}

        {/* Note */}
        {generatedCode && (
          <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl animate-slideInUp">
            <AlertCircle size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You can edit the code in the editor. Click "Run Code" to execute it in the terminal. This content is not saved to your notes unless you export or upload it.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AIToolsGenerateCodePage;