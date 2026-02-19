// FILE: src/components/code/CodeEditor.jsx
// ============================================================================
// Reusable Monaco Code Editor Component
// VS Code-like editor with theme toggle, copy, download functionality
// ============================================================================

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Download, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─── Default Editor Options ─────────────────────────────────────────────────

const DEFAULT_EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 13,
  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
  fontLigatures: true,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on',
  formatOnPaste: true,
  formatOnType: false,
  renderLineHighlight: 'gutter',
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  bracketPairColorization: { enabled: true },
  padding: { top: 12, bottom: 12 },
};

// ─── CodeEditor Component ───────────────────────────────────────────────────

const CodeEditor = forwardRef(({
  code = '',
  onChange,
  language = 'plaintext',
  fileName = 'untitled.txt',
  fileExtension = '.txt',
  languageLabel = '',
  theme: initialTheme = 'vs-dark',
  readOnly = false,
  height = '100%',
  minHeight = 360,
  showToolbar = true,
  showFooter = true,
  showCopyButton = true,
  showDownloadButton = true,
  showThemeToggle = true,
  editorOptions = {},
  onReady,
  placeholder = '// Start typing your code here...',
  className = '',
}, ref) => {
  const editorRef = useRef(null);
  const [editorTheme, setEditorTheme] = useState(initialTheme);
  const [isReady, setIsReady] = useState(false);

  // ── Expose editor methods via ref
  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current,
    getValue: () => editorRef.current?.getValue() || '',
    setValue: (value) => editorRef.current?.setValue(value),
    focus: () => editorRef.current?.focus(),
    getSelection: () => editorRef.current?.getSelection(),
    setSelection: (selection) => editorRef.current?.setSelection(selection),
    formatDocument: () => editorRef.current?.getAction('editor.action.formatDocument')?.run(),
    isReady: () => isReady,
  }));

  // ── Editor mount handler
  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
    setIsReady(true);
    onReady?.(editor);
  }, [onReady]);

  // ── Copy to clipboard
  const handleCopy = useCallback(() => {
    const content = editorRef.current?.getValue() || code;
    if (!content.trim()) {
      toast.error('No code to copy');
      return;
    }
    navigator.clipboard.writeText(content);
    toast.success('Code copied to clipboard!');
  }, [code]);

  // ── Download file
  const handleDownload = useCallback(() => {
    const content = editorRef.current?.getValue() || code;
    if (!content.trim()) {
      toast.error('No code to download');
      return;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.includes('.') ? fileName : `${fileName}${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File downloaded!');
  }, [code, fileName, fileExtension]);

  // ── Toggle theme
  const toggleTheme = useCallback(() => {
    setEditorTheme(prev => prev === 'vs-dark' ? 'light' : 'vs-dark');
  }, []);

  // ── Merge editor options
  const mergedOptions = {
    ...DEFAULT_EDITOR_OPTIONS,
    ...editorOptions,
    readOnly,
  };

  // ── Line count
  const lineCount = (code || '').split('\n').length;

  return (
    <div 
      className={`rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col ${className}`}
      style={{ minHeight }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700/60">
          <div className="flex items-center gap-3">
            {/* Traffic lights */}
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
              <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
              <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
            </div>
            <span className="text-xs font-mono text-gray-400">
              {fileName.includes('.') ? fileName : `${fileName}${fileExtension}`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {showThemeToggle && (
              <button
                onClick={toggleTheme}
                title="Toggle theme"
                className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-all"
              >
                {editorTheme === 'vs-dark' ? '☀️' : '🌙'}
              </button>
            )}
            {showCopyButton && (
              <button 
                onClick={handleCopy} 
                title="Copy code" 
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-all"
              >
                <Copy size={13} className="text-gray-300" />
              </button>
            )}
            {showDownloadButton && (
              <button 
                onClick={handleDownload} 
                title="Download file" 
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-all"
              >
                <Download size={13} className="text-gray-300" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Monaco Editor ───────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: minHeight - (showToolbar ? 44 : 0) - (showFooter ? 32 : 0) }}>
        <Editor
          height={height}
          language={language}
          value={code}
          theme={editorTheme}
          onChange={(val) => onChange?.(val || '')}
          onMount={handleEditorMount}
          options={mergedOptions}
          loading={
            <div className="flex items-center justify-center h-full bg-gray-950">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading editor...</span>
              </div>
            </div>
          }
        />
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      {showFooter && (
        <div className="px-4 py-1.5 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono">
            {languageLabel || language}
          </span>
          <span className="text-xs text-gray-500 font-mono">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>
      )}
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
