// FILE: src/pages/ManualNoteEditorPage.jsx
// ============================================================================
// Public Manual Note Editor - Professional Rich Text Editor for Everyone
// Features: Advanced formatting, code snippets, PDF export, Google Drive upload
// ============================================================================

import { useState, useCallback, useRef, lazy, Suspense, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import DOMPurify from 'dompurify';
import { useDraftPersistence, DRAFT_KEYS } from '@/hooks/useDraftPersistence';
import {
  FileText, ArrowLeft, Save, Download, Upload, Code, Link as LinkIcon,
  Bold, Italic, List, Heading, Type, Loader2, Info, CheckCircle,
  Copy, Trash2, Play, Terminal, Eye, Edit, AlignLeft, Image,
  Table, AlignCenter, AlignRight, AlignJustify, Quote, ListOrdered,
  FileCode, Undo2, Redo2, Maximize2, X, Sparkles, Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { noteService } from '@/services/note.service';
import { sanitizeString } from '@/utils/validation';
import { exportNoteToPDF } from '@/utils/pdfExport';
import '@/styles/animations.css';

import QuillNoStrict from '@/components/QuillNoStrict';
import 'react-quill/dist/quill.snow.css';

// Custom Quill styles for enhanced editor
const quillStyles = `
  .note-editor-quill .ql-container {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.75;
    min-height: 320px;
  }
  .note-editor-quill .ql-editor {
    padding: 20px 24px;
    min-height: 320px;
  }
  .note-editor-quill .ql-editor h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; color: #111827; }
  .note-editor-quill .ql-editor h2 { font-size: 1.5em; font-weight: 600; margin: 0.75em 0; color: #1f2937; }
  .note-editor-quill .ql-editor h3 { font-size: 1.25em; font-weight: 600; margin: 0.83em 0; color: #374151; }
  .note-editor-quill .ql-editor h4 { font-size: 1.1em; font-weight: 600; margin: 1em 0; color: #4b5563; }
  .note-editor-quill .ql-editor h5 { font-size: 1em; font-weight: 600; margin: 1em 0; color: #6b7280; }
  .note-editor-quill .ql-editor h6 { font-size: 0.9em; font-weight: 600; margin: 1em 0; color: #9ca3af; }
  .note-editor-quill .ql-editor p { margin: 0.5em 0; color: #374151; }
  .note-editor-quill .ql-editor blockquote {
    border-left: 4px solid #3b82f6;
    padding-left: 16px;
    margin: 1em 0;
    color: #4b5563;
    font-style: italic;
    background: linear-gradient(to right, #f0f9ff, #f8fafc);
    padding: 14px 18px;
    border-radius: 0 12px 12px 0;
  }
  .note-editor-quill .ql-editor pre.ql-syntax {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: #e2e8f0;
    border-radius: 12px;
    padding: 18px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 13px;
    overflow-x: auto;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
  }
  .note-editor-quill .ql-editor ul, .note-editor-quill .ql-editor ol {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  .note-editor-quill .ql-editor li { margin: 0.3em 0; }
  .note-editor-quill .ql-editor a { color: #2563eb; text-decoration: underline; transition: color 0.2s; }
  .note-editor-quill .ql-editor a:hover { color: #1d4ed8; }
  .note-editor-quill .ql-editor img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 1em 0;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }
  .note-editor-quill .ql-editor table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    border-radius: 8px;
    overflow: hidden;
  }
  .note-editor-quill .ql-editor table td, .note-editor-quill .ql-editor table th {
    border: 1px solid #e5e7eb;
    padding: 10px 14px;
  }
  .note-editor-quill .ql-editor table th { background: linear-gradient(to bottom, #f9fafb, #f3f4f6); font-weight: 600; }
  .note-editor-quill .ql-toolbar.ql-snow {
    border: none;
    border-bottom: 1px solid #e5e7eb;
    padding: 12px 16px;
    background: linear-gradient(to bottom, #fafbfc, #f5f6f7);
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    border-radius: 12px 12px 0 0;
  }
  .note-editor-quill .ql-toolbar .ql-formats {
    margin-right: 8px;
    display: inline-flex;
    align-items: center;
  }
  .note-editor-quill .ql-container.ql-snow { border: none; }
  .note-editor-quill .ql-snow .ql-picker-label { padding: 2px 8px; border-radius: 6px; }
  .note-editor-quill .ql-snow .ql-picker-label:hover { background: #e5e7eb; }
  .note-editor-quill .ql-snow .ql-stroke { stroke: #6b7280; transition: stroke 0.2s; }
  .note-editor-quill .ql-snow .ql-fill { fill: #6b7280; transition: fill 0.2s; }
  .note-editor-quill .ql-snow button { border-radius: 6px; transition: all 0.2s; }
  .note-editor-quill .ql-snow button:hover { background: #e5e7eb; }
  .note-editor-quill .ql-snow button:hover .ql-stroke { stroke: #2563eb; }
  .note-editor-quill .ql-snow button:hover .ql-fill { fill: #2563eb; }
  .note-editor-quill .ql-snow button.ql-active { background: #dbeafe; }
  .note-editor-quill .ql-snow button.ql-active .ql-stroke { stroke: #2563eb; }
  .note-editor-quill .ql-snow button.ql-active .ql-fill { fill: #2563eb; }
  .note-editor-quill .ql-editor.ql-blank::before {
    color: #9ca3af;
    font-style: normal;
    left: 24px;
  }
  .note-editor-quill .ql-editor:focus {
    outline: none;
  }
  @media (max-width: 640px) {
    .note-editor-quill .ql-toolbar.ql-snow { padding: 8px 10px; gap: 2px; }
    .note-editor-quill .ql-editor { padding: 14px 16px; min-height: 260px; font-size: 14px; }
    .note-editor-quill .ql-container { min-height: 260px; }
    .note-editor-quill .ql-toolbar .ql-formats { margin-right: 3px; }
    .note-editor-quill .ql-snow button { padding: 4px; }
  }
`;

// Lazy load Monaco Editor
const Editor = lazy(() => import('@monaco-editor/react'));

// ─── Loading Fallback ────────────────────────────────────────────────────────

const EditorLoader = () => (
  <div className="flex items-center justify-center h-64 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
    <div className="flex flex-col items-center gap-3 text-gray-400">
      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center animate-pulse">
        <FileText size={20} className="text-blue-500" />
      </div>
      <div className="flex items-center gap-2">
        <Loader2 size={16} className="animate-spin text-blue-500" />
        <span className="text-sm text-gray-500">Loading editor...</span>
      </div>
    </div>
  </div>
);

// ─── NavPill Component ───────────────────────────────────────────────────────

const NavPill = ({ onClick, to, icon: Icon, label, variant = 'default' }) => {
  const base =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ' +
    'whitespace-nowrap flex-shrink-0 transition-all duration-200 border ';
  const styles = {
    default: base + 'border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 shadow-sm hover:shadow',
    back:    base + 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold shadow-sm',
  };
  const cls = styles[variant] || styles.default;
  return to
    ? <Link to={to} className={cls}><Icon size={12} />{label}</Link>
    : <button type="button" onClick={onClick} className={cls}><Icon size={12} />{label}</button>;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CODE_LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'csharp', label: 'C#' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'other', label: 'Other' }
];

// Monaco language mapping
const getMonacoLanguage = (lang) => {
  const mapping = {
    'cpp': 'cpp',
    'c': 'c',
    'python': 'python',
    'javascript': 'javascript',
    'typescript': 'typescript',
    'java': 'java',
    'go': 'go',
    'rust': 'rust',
    'ruby': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'csharp': 'csharp',
    'sql': 'sql',
    'bash': 'shell',
    'other': 'plaintext'
  };
  return mapping[lang] || 'plaintext';
};

// Enhanced Quill editor configuration with all formatting options
const QUILL_MODULES = {
  toolbar: {
    container: [
      // Headings H1-H6
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      // Font options
      [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
      // Basic formatting
      ['bold', 'italic', 'underline', 'strike'],
      // Color options
      [{ 'color': [] }, { 'background': [] }],
      // Super/subscript
      [{ 'script': 'sub' }, { 'script': 'super' }],
      // Lists and indentation
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      // Text alignment
      [{ 'align': [] }],
      // Blocks
      ['blockquote', 'code-block'],
      // Direction
      [{ 'direction': 'rtl' }],
      // Media & Links
      ['link', 'image', 'video'],
      // Clean formatting
      ['clean']
    ],
  },
  clipboard: {
    matchVisual: false,
  },
  history: {
    delay: 1000,
    maxStack: 50,
    userOnly: true
  },
};

const QUILL_FORMATS = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'script',
  'list', 'bullet', 'check',
  'indent',
  'align', 'direction',
  'blockquote', 'code-block',
  'link', 'image', 'video',
  'clean'
];

// ─── Main Component ──────────────────────────────────────────────────────────

const ManualNoteEditorPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isGuest } = useSelector((state) => state.auth);
  const quillRef = useRef(null);
  const editorContainerRef = useRef(null);

  // ── Draft Persistence (auto-save + auto-restore)
  const initialDraftState = {
    noteTitle: '',
    topicName: '',
    explanation: '',
    codeLanguage: 'python',
    codeContent: '',
    sourceTitle: '',
    sourceUrl: '',
    activeTab: 'content',
  };

  const {
    state: draftState,
    updateField,
    clearDraft,
    hasDraft,
    hasContent,
    lastSaved,
  } = useDraftPersistence(DRAFT_KEYS.MANUAL_NOTE_EDITOR, initialDraftState, {
    warnOnUnload: true,
  });

  // ── Destructure draft state for easier access
  const {
    noteTitle,
    topicName,
    explanation,
    codeLanguage,
    codeContent,
    sourceTitle,
    sourceUrl,
    activeTab,
  } = draftState;

  // ── State setters that update draft
  const setNoteTitle = (val) => updateField('noteTitle', val);
  const setTopicName = (val) => updateField('topicName', val);
  const setExplanation = (val) => updateField('explanation', val);
  const setCodeLanguage = (val) => updateField('codeLanguage', val);
  const setCodeContent = (val) => updateField('codeContent', val);
  const setSourceTitle = (val) => updateField('sourceTitle', val);
  const setSourceUrl = (val) => updateField('sourceUrl', val);
  const setActiveTab = (val) => updateField('activeTab', val);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [runningCode, setRunningCode] = useState(false);
  const [codeOutput, setCodeOutput] = useState('');
  const [codeError, setCodeError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Inject custom Quill styles
  useEffect(() => {
    const styleId = 'note-editor-quill-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = quillStyles;
      document.head.appendChild(styleEl);
    }
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  // ── Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // ── Handle image upload for Quill
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image must be less than 5MB');
          return;
        }
        // Convert to base64 for local preview
        const reader = new FileReader();
        reader.onload = () => {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', reader.result);
            quill.setSelection(range.index + 1);
          }
        };
        reader.readAsDataURL(file);
      }
    };
  }, []);

  // ── Dynamic Quill modules with image handler
  const quillModules = useMemo(() => ({
    ...QUILL_MODULES,
    toolbar: {
      ...QUILL_MODULES.toolbar,
      handlers: {
        image: imageHandler,
      },
    },
  }), [imageHandler]);

  // ── Code Execution
  const handleRunCode = useCallback(async () => {
    if (!codeContent.trim()) {
      toast.error('No code to run');
      return;
    }

    const executableLanguages = ['python', 'javascript', 'java', 'cpp', 'c', 'go', 'rust', 'ruby', 'php'];
    if (!executableLanguages.includes(codeLanguage)) {
      toast.error('This language cannot be executed in the browser sandbox');
      return;
    }

    setRunningCode(true);
    setCodeOutput('');
    setCodeError(null);

    try {
      const result = await noteService.runCode({
        code: codeContent,
        language: codeLanguage,
        stdin: '',
        timeout: 15,
      });

      if (result.success) {
        let outputText = result.output || '✅ No output';
        if (result.runtime_ms) {
          outputText += `\n\n⏱️ Runtime: ${result.runtime_ms}ms`;
        }
        setCodeOutput(outputText);
      } else {
        setCodeError(result.error || 'Execution failed');
      }
    } catch (err) {
      setCodeError(err.message || 'Execution failed');
    } finally {
      setRunningCode(false);
    }
  }, [codeContent, codeLanguage]);

  // ── Build note data for export
  const buildNoteData = useCallback(() => {
    return {
      title: noteTitle || 'Untitled Note',
      topics: [{
        name: topicName || 'Main Topic',
        explanation: { content: explanation },
        code_snippet: codeContent ? {
          language: codeLanguage,
          code: codeContent
        } : null,
        source: (sourceTitle || sourceUrl) ? {
          title: sourceTitle,
          url: sourceUrl
        } : null
      }],
      created_at: new Date().toISOString(),
      status: 'draft'
    };
  }, [noteTitle, topicName, explanation, codeLanguage, codeContent, sourceTitle, sourceUrl]);

  // ── Download as PDF
  const handleDownloadPDF = useCallback(async () => {
    if (!explanation.trim() && !codeContent.trim()) {
      toast.error('Please add some content first');
      return;
    }

    setDownloading(true);
    try {
      const noteData = buildNoteData();
      await exportNoteToPDF(noteData, {
        title: noteData.title,
        author: 'NoteAssist AI User',
        includeCode: !!codeContent,
        includeSources: !!(sourceTitle || sourceUrl)
      });
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      // Production: log error to monitoring service or show safe message
      toast.error('Failed to export PDF');
    } finally {
      setDownloading(false);
    }
  }, [explanation, codeContent, sourceTitle, sourceUrl, buildNoteData]);

  // ── Upload to Google Drive (requires auth and saved note)
  const handleUploadToDrive = useCallback(async () => {
    if (!isAuthenticated || isGuest) {
      toast.error('Please sign in to upload to Google Drive');
      navigate('/login');
      return;
    }

    if (!explanation.trim() && !codeContent.trim()) {
      toast.error('Please add some content first');
      return;
    }

    // For now, download the PDF since direct Drive upload requires a saved AI output
    // Users can manually upload to Drive or use the Notes page for full Drive integration
    toast('💡 Tip: Save your note first, then upload to Drive from your Notes page', {
      duration: 4000,
      icon: '📁'
    });
    
    // Fallback to PDF download
    await handleDownloadPDF();
  }, [isAuthenticated, isGuest, explanation, codeContent, navigate, handleDownloadPDF]);

  // ── Save to Notes (requires auth)
  const handleSaveToNotes = useCallback(async () => {
    if (!isAuthenticated || isGuest) {
      toast.error('Please sign in to save notes');
      navigate('/login');
      return;
    }

    if (!topicName.trim()) {
      toast.error('Please enter a topic name');
      return;
    }

    setSaving(true);
    try {
      // Create a new note with the content
      const newNote = await noteService.createNote({
        title: noteTitle || topicName,
        status: 'draft'
      });

      // Create a chapter
      const chapter = await noteService.addChapter(newNote.id, {
        name: 'Chapter 1'
      });

      // Create the topic with sanitized content
      await noteService.addTopic(chapter.id, {
        name: sanitizeString(topicName || ''),
        explanation_content: DOMPurify.sanitize(explanation || ''),
        code_language: sanitizeString(codeLanguage || ''),
        code_content: (codeContent || '').toString(),
        source_title: sanitizeString(sourceTitle || ''),
        source_url: sanitizeString(sourceUrl || ''),
      });

      toast.success('Note saved successfully!');
      navigate('/notes');
    } catch (err) {
      // Production: log error to monitoring service or show safe message
      toast.error(err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  }, [isAuthenticated, isGuest, noteTitle, topicName, explanation, codeLanguage, codeContent, sourceTitle, sourceUrl, navigate]);

  // ── Copy content to clipboard
  const handleCopyContent = useCallback(() => {
    let content = '';
    if (topicName) content += `# ${topicName}\n\n`;
    if (explanation) {
      // Strip HTML tags for plain text
      const plainText = explanation.replace(/<[^>]*>/g, '');
      content += plainText + '\n\n';
    }
    if (codeContent) {
      content += `## Code (${codeLanguage})\n\`\`\`${codeLanguage}\n${codeContent}\n\`\`\`\n\n`;
    }
    if (sourceTitle || sourceUrl) {
      content += `## Source\n${sourceTitle || ''} ${sourceUrl ? `(${sourceUrl})` : ''}\n`;
    }

    navigator.clipboard.writeText(content);
    toast.success('Content copied to clipboard!');
  }, [topicName, explanation, codeContent, codeLanguage, sourceTitle, sourceUrl]);

  // ── Clear all content (uses draft persistence)
  const handleClear = useCallback(() => {
    const cleared = clearDraft();
    if (cleared) {
      setCodeOutput('');
      setCodeError(null);
    }
  }, [clearDraft]);

  // ── Tab rendering
  const renderTabContent = () => {
    switch (activeTab) {
      case 'content':
        return (
          <div className="space-y-5">
            {/* Topic Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Topic Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="e.g., Python Functions, JavaScript Promises..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm 
                  placeholder:text-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 
                  outline-none transition-all duration-200 hover:border-gray-300"
              />
            </div>

            {/* Rich Text Editor with Advanced Formatting */}
            <div ref={editorContainerRef}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Explanation / Content
                </label>
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-all duration-200 text-gray-500 hover:text-blue-600 group"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen editor'}
                >
                  <Maximize2 size={16} className="group-hover:scale-110 transition-transform" />
                </button>
              </div>
              <div className={`border-2 border-gray-200 rounded-xl overflow-hidden transition-all duration-300 note-editor-quill 
                hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 ${
                isFullscreen ? 'fixed inset-4 z-50 bg-white shadow-2xl border-0' : ''
              }`}>
                {isFullscreen && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <AlignLeft size={16} className="text-blue-600" />
                      <span className="text-sm font-semibold text-gray-800">Rich Text Editor</span>
                    </div>
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 hover:bg-gray-200 rounded-lg transition-all duration-200 text-gray-600 hover:text-red-500"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
                <QuillNoStrict
                  ref={quillRef}
                  theme="snow"
                  value={explanation}
                  onChange={setExplanation}
                  modules={quillModules}
                  formats={QUILL_FORMATS}
                  placeholder="Start writing... Use the toolbar above for formatting including headings, lists, images, tables, and more."
                  className="bg-white"
                  style={{ minHeight: isFullscreen ? 'calc(100% - 50px)' : '320px' }}
                />
              </div>
              {isFullscreen && <div className="fixed inset-0 bg-black/50 -z-10" onClick={toggleFullscreen} />}
              
              {/* Formatting hint */}
              <p className="mt-2 text-xs text-gray-500">
                Tip: Use H1-H6 for headings, add images, code blocks, blockquotes, and more using the toolbar.
              </p>
            </div>
          </div>
        );

      case 'code':
        return (
          <div className="space-y-5">
            {/* Language Select & Run Button */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Language
                </label>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm 
                    focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none bg-white
                    hover:border-gray-300 transition-all duration-200 cursor-pointer"
                >
                  {CODE_LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleRunCode}
                disabled={runningCode || !codeContent.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 
                  bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-semibold 
                  hover:from-emerald-700 hover:to-green-700 hover:shadow-lg hover:shadow-emerald-500/25
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 
                  active:scale-[.98] shadow-md"
              >
                {runningCode ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="white" />
                    Run Code
                  </>
                )}
              </button>
            </div>

            {/* Code Editor */}
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all duration-200">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700/60">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400/80 hover:bg-yellow-400 transition-colors" />
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors" />
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    {CODE_LANGUAGES.find(l => l.value === codeLanguage)?.label || 'Code'}
                  </span>
                </div>
                <span className="text-xs text-emerald-400/80">✓ Executable</span>
              </div>
              <Suspense fallback={<EditorLoader />}>
                <Editor
                  height="300px"
                  language={getMonacoLanguage(codeLanguage)}
                  value={codeContent}
                  onChange={(val) => setCodeContent(val || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    padding: { top: 12, bottom: 12 },
                  }}
                />
              </Suspense>
            </div>

            {/* Output Terminal */}
            {(codeOutput || codeError) && (
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden transition-all duration-200">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700/60">
                  <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-400 font-medium">Output</span>
                  </div>
                  <span className={`text-xs font-medium ${codeError ? 'text-red-400' : 'text-emerald-400'}`}>
                    {codeError ? '✗ Error' : '✓ Success'}
                  </span>
                </div>
                <div className="p-4 bg-gray-950 min-h-[100px] max-h-[200px] overflow-auto">
                  {codeError ? (
                    <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap leading-relaxed">{codeError}</pre>
                  ) : (
                    <pre className="text-emerald-400 text-sm font-mono whitespace-pre-wrap leading-relaxed">{codeOutput}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'source':
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-3 bg-purple-50/50 border border-purple-200/50 rounded-xl">
              <LinkIcon size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-purple-800">
                Add reference sources for your content (optional). These will be included when you export or share your note.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Source Title
              </label>
              <input
                type="text"
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder="e.g., MDN Web Docs, Python Documentation..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm 
                  placeholder:text-gray-400 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 
                  outline-none transition-all duration-200 hover:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Source URL
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm 
                  placeholder:text-gray-400 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 
                  outline-none transition-all duration-200 hover:border-gray-300"
              />
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[400px]">
            {topicName && (
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">{topicName}</h2>
            )}
            {explanation && (
              <div 
                className="prose prose-sm sm:prose max-w-none mb-6 prose-headings:text-gray-900 prose-p:text-gray-700 
                  prose-a:text-blue-600 prose-strong:text-gray-900 prose-code:text-pink-600 prose-code:bg-pink-50 
                  prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(explanation) }}
              />
            )}
            {codeContent && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Code size={12} className="text-emerald-600" />
                  </div>
                  Code ({CODE_LANGUAGES.find(l => l.value === codeLanguage)?.label})
                </h3>
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700/60">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{codeLanguage}</span>
                    </div>
                  </div>
                  <pre className="bg-gray-950 text-emerald-400 p-4 overflow-x-auto text-sm font-mono leading-relaxed">
                    {codeContent}
                  </pre>
                </div>
              </div>
            )}
            {(sourceTitle || sourceUrl) && (
              <div className="border-t-2 border-gray-100 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                    <LinkIcon size={12} className="text-purple-600" />
                  </div>
                  Source
                </h3>
                {sourceUrl ? (
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer" 
                    className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium transition-colors">
                    {sourceTitle || sourceUrl}
                  </a>
                ) : (
                  <span className="text-gray-600 text-sm">{sourceTitle}</span>
                )}
              </div>
            )}
            {!topicName && !explanation && !codeContent && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <Eye size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No content yet</p>
                <p className="text-sm text-gray-400 mt-1">Add content in other tabs to preview</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Note Editor | NoteAssist AI</title>
        <meta name="description" content="Create and edit notes with rich text formatting, code snippets, and more. Export to PDF or upload to Google Drive." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
        
        {/* ── Sticky Header ── */}
        <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30 animate-fadeInDown">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between gap-3 h-14 sm:h-16">
              {/* Left: Title */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                  onClick={() => navigate(-1)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
                  aria-label="Go back"
                >
                  <ArrowLeft size={18} className="text-gray-600" />
                </button>
                <span className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100 flex-shrink-0 shadow-sm">
                  <FileText size={16} className="text-blue-600" />
                </span>
                <div className="hidden xs:block">
                  <h1 className="text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">
                    Note Editor
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    Rich text & code
                  </p>
                </div>
              </div>

              {/* Right: Nav & Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Draft Status */}
                {hasContent && (
                  <span className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200 flex-shrink-0">
                    <CheckCircle size={12} />
                    Draft saved
                  </span>
                )}

                {/* Nav Pills - Hidden on small screens */}
                <div className="hidden md:flex items-center gap-1.5">
                  <NavPill to="/code-runner" icon={Code} label="Code Runner" />
                  <NavPill to="/ai-tools" icon={Sparkles} label="AI Tools" />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-0.5 bg-gray-100/80 rounded-xl p-1 border border-gray-200/50">
                  <button
                    onClick={handleCopyContent}
                    className="p-2 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm group"
                    title="Copy content"
                  >
                    <Copy size={16} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
                  </button>
                  <button
                    onClick={handleClear}
                    disabled={!hasContent}
                    className="p-2 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm group disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Clear draft"
                  >
                    <Trash2 size={16} className="text-gray-500 group-hover:text-red-500 transition-colors" />
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className="p-2 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm group"
                    title="Download PDF"
                  >
                    {downloading ? (
                      <Loader2 size={16} className="text-blue-600 animate-spin" />
                    ) : (
                      <Download size={16} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
                    )}
                  </button>
                  <button
                    onClick={handleUploadToDrive}
                    disabled={uploading}
                    className="p-2 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm group"
                    title="Upload to Google Drive"
                  >
                    {uploading ? (
                      <Loader2 size={16} className="text-blue-600 animate-spin" />
                    ) : (
                      <Upload size={16} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
                    )}
                  </button>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveToNotes}
                  disabled={saving}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 
                    bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold 
                    hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/25
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 
                    active:scale-[.98] shadow-md"
                >
                  {saving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span className="hidden sm:inline">Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* Guest Banner */}
          {(!isAuthenticated || isGuest) && (
            <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 animate-fadeIn shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Info size={16} className="text-blue-600" />
              </div>
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Guest Mode:</span> You can create notes and download PDFs. 
                <button 
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:text-blue-800 underline ml-1 font-medium transition-colors"
                >
                  Sign in
                </button> to save notes or upload to Google Drive.
              </p>
            </div>
          )}

          {/* Note Title Input Card */}
          <div className="mb-4 sm:mb-5 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Note Title
              </label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Enter a title for your note (optional)"
                className="w-full px-4 py-3 bg-gray-50/50 border-2 border-gray-200 rounded-xl text-base sm:text-lg font-medium 
                  placeholder:text-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-200"
              />
            </div>
          </div>

          {/* Main Editor Card with Tabs */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn" style={{ animationDelay: '100ms' }}>
            {/* Tab Header */}
            <div className="flex border-b border-gray-200 overflow-x-auto bg-gray-50/50" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {[
                { id: 'content', label: 'Content', icon: AlignLeft, color: 'text-blue-600' },
                { id: 'code', label: 'Code', icon: Code, color: 'text-emerald-600' },
                { id: 'source', label: 'Source', icon: LinkIcon, color: 'text-purple-600' },
                { id: 'preview', label: 'Preview', icon: Eye, color: 'text-orange-600' },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 sm:px-6 py-3.5 text-sm font-medium whitespace-nowrap 
                      transition-all duration-200 border-b-2 ${
                      activeTab === tab.id
                        ? `${tab.color} border-current bg-white shadow-sm`
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-white/50'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6">
              {renderTabContent()}
            </div>
          </div>

          {/* Quick Tips Card */}
          <div className="mt-5 sm:mt-6 p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-sm animate-fadeIn" style={{ animationDelay: '200ms' }}>
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Zap size={14} className="text-emerald-600" />
              </span>
              Quick Tips
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors">
                <AlignLeft size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-800">Rich Text Editor</p>
                  <p className="text-xs text-gray-500">Headers, lists, images, code blocks</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors">
                <Code size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-800">Code Snippets</p>
                  <p className="text-xs text-gray-500">15+ languages with syntax highlighting</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors">
                <Play size={14} className="text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-800">Run Code</p>
                  <p className="text-xs text-gray-500">Execute code directly in browser</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors">
                <Download size={14} className="text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-800">Export & Save</p>
                  <p className="text-xs text-gray-500">PDF download or save to account</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ManualNoteEditorPage;
