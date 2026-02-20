// FILE: src/pages/ManualNoteEditorPage.jsx
// ============================================================================
// Public Manual Note Editor - Professional Rich Text Editor for Everyone
// Features: Advanced formatting, code snippets, PDF export, Google Drive upload
// ============================================================================

import { useState, useCallback, useRef, lazy, Suspense, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useDraftPersistence, DRAFT_KEYS } from '@/hooks/useDraftPersistence';
import {
  FileText, ArrowLeft, Save, Download, Upload, Code, Link as LinkIcon,
  Bold, Italic, List, Heading, Type, Loader2, Info, CheckCircle,
  Copy, Trash2, Play, Terminal, Eye, Edit, AlignLeft, Image,
  Table, AlignCenter, AlignRight, AlignJustify, Quote, ListOrdered,
  FileCode, Undo2, Redo2, Maximize2, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { noteService } from '@/services/note.service';
import { exportNoteToPDF } from '@/utils/pdfExport';

// Lazy load ReactQuill for better performance
const ReactQuill = lazy(() => import('react-quill'));
import 'react-quill/dist/quill.snow.css';

// Custom Quill styles for enhanced editor
const quillStyles = `
  .note-editor-quill .ql-container {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.7;
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
  .note-editor-quill .ql-editor p { margin: 0.5em 0; }
  .note-editor-quill .ql-editor blockquote {
    border-left: 4px solid #3b82f6;
    padding-left: 16px;
    margin: 1em 0;
    color: #4b5563;
    font-style: italic;
    background: #f8fafc;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
  }
  .note-editor-quill .ql-editor pre.ql-syntax {
    background: #1e293b;
    color: #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 13px;
    overflow-x: auto;
  }
  .note-editor-quill .ql-editor ul, .note-editor-quill .ql-editor ol {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  .note-editor-quill .ql-editor li { margin: 0.25em 0; }
  .note-editor-quill .ql-editor a { color: #2563eb; text-decoration: underline; }
  .note-editor-quill .ql-editor img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1em 0;
  }
  .note-editor-quill .ql-editor table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }
  .note-editor-quill .ql-editor table td, .note-editor-quill .ql-editor table th {
    border: 1px solid #e5e7eb;
    padding: 8px 12px;
  }
  .note-editor-quill .ql-editor table th { background: #f9fafb; font-weight: 600; }
  .note-editor-quill .ql-toolbar.ql-snow {
    border: none;
    border-bottom: 1px solid #e5e7eb;
    padding: 12px 16px;
    background: #fafbfc;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .note-editor-quill .ql-toolbar .ql-formats {
    margin-right: 8px;
    display: inline-flex;
    align-items: center;
  }
  .note-editor-quill .ql-container.ql-snow { border: none; }
  .note-editor-quill .ql-snow .ql-picker-label { padding: 2px 8px; }
  .note-editor-quill .ql-snow .ql-stroke { stroke: #6b7280; }
  .note-editor-quill .ql-snow .ql-fill { fill: #6b7280; }
  .note-editor-quill .ql-snow button:hover .ql-stroke { stroke: #2563eb; }
  .note-editor-quill .ql-snow button:hover .ql-fill { fill: #2563eb; }
  .note-editor-quill .ql-snow button.ql-active .ql-stroke { stroke: #2563eb; }
  .note-editor-quill .ql-snow button.ql-active .ql-fill { fill: #2563eb; }
  .note-editor-quill .ql-editor.ql-blank::before {
    color: #9ca3af;
    font-style: normal;
    left: 24px;
  }
  @media (max-width: 640px) {
    .note-editor-quill .ql-toolbar.ql-snow { padding: 8px 12px; }
    .note-editor-quill .ql-editor { padding: 16px; min-height: 280px; }
    .note-editor-quill .ql-container { min-height: 280px; }
    .note-editor-quill .ql-toolbar .ql-formats { margin-right: 4px; }
  }
`;

// Lazy load Monaco Editor
const Editor = lazy(() => import('@monaco-editor/react'));

// ─── Loading Fallback ────────────────────────────────────────────────────────

const EditorLoader = () => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-200">
    <div className="flex items-center gap-3 text-gray-400">
      <Loader2 size={20} className="animate-spin" />
      <span>Loading editor...</span>
    </div>
  </div>
);

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
      console.error('PDF export error:', err);
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

      // Create the topic with content
      await noteService.addTopic(chapter.id, {
        name: topicName,
        explanation_content: explanation,
        code_language: codeLanguage,
        code_content: codeContent,
        source_title: sourceTitle,
        source_url: sourceUrl
      });

      toast.success('Note saved successfully!');
      navigate('/notes');
    } catch (err) {
      console.error('Save error:', err);
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
          <div className="space-y-4">
            {/* Topic Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Topic Name *
              </label>
              <input
                type="text"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="e.g., Python Functions, JavaScript Promises..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Rich Text Editor with Advanced Formatting */}
            <div ref={editorContainerRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Explanation / Content
                </label>
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen editor'}
                >
                  <Maximize2 size={16} />
                </button>
              </div>
              <div className={`border border-gray-200 rounded-xl overflow-hidden transition-all note-editor-quill ${
                isFullscreen ? 'fixed inset-4 z-50 bg-white shadow-2xl' : ''
              }`}>
                {isFullscreen && (
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Rich Text Editor</span>
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
                <Suspense fallback={<EditorLoader />}>
                  <ReactQuill
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
                </Suspense>
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
          <div className="space-y-4">
            {/* Language Select */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Language
                </label>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  {CODE_LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleRunCode}
                  disabled={runningCode || !codeContent.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {runningCode ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Run Code
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Editor */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
                    <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
                  </div>
                  <span className="text-xs text-gray-400 font-mono ml-2">
                    {CODE_LANGUAGES.find(l => l.value === codeLanguage)?.label || 'Code'}
                  </span>
                </div>
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
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-700">
                  <Terminal size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-400">Output</span>
                </div>
                <div className="p-4 bg-gray-950 min-h-[100px] max-h-[200px] overflow-auto">
                  {codeError ? (
                    <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap">{codeError}</pre>
                  ) : (
                    <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">{codeOutput}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'source':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Add reference sources for your content (optional).
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Source Title
              </label>
              <input
                type="text"
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder="e.g., MDN Web Docs, Python Documentation..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Source URL
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[400px]">
            {topicName && (
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{topicName}</h2>
            )}
            {explanation && (
              <div 
                className="prose prose-sm max-w-none mb-6"
                dangerouslySetInnerHTML={{ __html: explanation }}
              />
            )}
            {codeContent && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Code size={14} />
                  Code ({CODE_LANGUAGES.find(l => l.value === codeLanguage)?.label})
                </h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  {codeContent}
                </pre>
              </div>
            )}
            {(sourceTitle || sourceUrl) && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <LinkIcon size={14} />
                  Source
                </h3>
                {sourceUrl ? (
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    {sourceTitle || sourceUrl}
                  </a>
                ) : (
                  <span className="text-gray-600 text-sm">{sourceTitle}</span>
                )}
              </div>
            )}
            {!topicName && !explanation && !codeContent && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <p>Add content to see preview</p>
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

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Left: Back + Title */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="text-blue-600" size={22} />
                    Note Editor
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                    Create notes with rich formatting
                  </p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Draft Status Indicator */}
                {hasContent && (
                  <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                    <CheckCircle size={12} />
                    {lastSaved ? `Draft saved` : 'Auto-saving...'}
                  </span>
                )}

                <button
                  onClick={handleCopyContent}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy content"
                >
                  <Copy size={18} className="text-gray-600" />
                </button>

                <button
                  onClick={handleClear}
                  disabled={!hasContent}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Clear draft"
                >
                  <Trash2 size={18} className="text-gray-600" />
                </button>

                <button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {downloading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  <span className="hidden sm:inline">PDF</span>
                </button>

                <button
                  onClick={handleUploadToDrive}
                  disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-200 disabled:opacity-50 transition-colors"
                >
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  <span className="hidden sm:inline">Drive</span>
                </button>

                <button
                  onClick={handleSaveToNotes}
                  disabled={saving}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="hidden sm:inline">Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {/* Guest Banner */}
          {(!isAuthenticated || isGuest) && (
            <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <Info size={18} className="text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                <span className="font-medium">Guest Mode:</span> You can create notes and download PDFs. 
                <button 
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:text-blue-800 underline ml-1"
                >
                  Sign in
                </button> to save notes or upload to Google Drive.
              </p>
            </div>
          )}

          {/* Note Title */}
          <div className="mb-4">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note Title (optional)"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Tab Header */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {[
                { id: 'content', label: 'Content', icon: AlignLeft },
                { id: 'code', label: 'Code', icon: Code },
                { id: 'source', label: 'Source', icon: LinkIcon },
                { id: 'preview', label: 'Preview', icon: Eye },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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

          {/* Quick Tips */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" />
              Quick Tips
            </h3>
            <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
              <li>• Use the rich text editor for formatted explanations with headers, lists, and code blocks</li>
              <li>• Add code snippets in the Code tab - supports 15+ languages with syntax highlighting</li>
              <li>• Click "Run Code" to execute your code directly in the browser</li>
              <li>• Download as PDF anytime, or save to your account for later access</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default ManualNoteEditorPage;
