// FILE: src/pages/OnlineCodeRunnerPage.jsx
// ============================================================================
// Public Online Code Runner - Full-Featured Code Execution Environment
// Features: Write code, run code, view output, download/copy, error highlighting
// ============================================================================

import { useState, useRef, useCallback, lazy, Suspense, useMemo, useEffect } from 'react';
import logger from '@/utils/logger';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useDraftPersistence, DRAFT_KEYS } from '@/hooks/useDraftPersistence';
import {
  Code, Play, Loader2, ArrowLeft, RotateCcw, Download, Copy,
  Terminal, CheckCircle, XCircle, Clock, Keyboard, Info, Zap,
  FileDown, Settings2, Maximize2, X, AlertTriangle, RefreshCw,
  FileText, Sparkles, Trash2
} from 'lucide-react';
import { noteService } from '@/services/note.service';
import { toast } from 'react-hot-toast';
import '@/styles/animations.css';

// Lazy load Monaco Editor for better performance
const Editor = lazy(() => import('@monaco-editor/react'));
const CodeInputModal = lazy(() => import('@/components/code/CodeInputModal'));

// Import input detection helper
import { detectInputRequirements } from '@/components/code';

// ─── Reusable NavPill Component ──────────────────────────────────────────────

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

// ─── Default Code Templates ──────────────────────────────────────────────────

const CODE_TEMPLATES = {
  python: `# Python - Welcome to Online Code Runner!
# Write your code here and click "Run Code" to execute.

print("Hello, World!")

# Try this:
name = "Developer"
print(f"Welcome, {name}!")
`,
  javascript: `// JavaScript - Welcome to Online Code Runner!
// Write your code here and click "Run Code" to execute.

console.log("Hello, World!");

// Try this:
const name = "Developer";
console.log(\`Welcome, \${name}!\`);
`,
  java: `// Java - Welcome to Online Code Runner!
// Note: Use "class prog" (no public) for online execution

class prog {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
  cpp: `// C++ - Welcome to Online Code Runner!
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`,
  c: `// C - Welcome to Online Code Runner!
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,
  go: `// Go - Welcome to Online Code Runner!
package main


func main() {
    fmt.Println("Hello, World!")
}
`,
  rust: `// Rust - Welcome to Online Code Runner!
fn main() {
    println!("Hello, World!");
}
`,
  ruby: `# Ruby - Welcome to Online Code Runner!
puts "Hello, World!"
`,
  php: `<?php
// PHP - Welcome to Online Code Runner!
echo "Hello, World!\\n";
?>
`,
  typescript: `// TypeScript - Welcome to Online Code Runner!
const message: string = "Hello, World!";
console.log(message);
`,
  kotlin: `// Kotlin - Welcome to Online Code Runner!
fun main() {
    println("Hello, World!")
}
`,
  swift: `// Swift - Welcome to Online Code Runner!
print("Hello, World!")
`,
  csharp: `// C# - Welcome to Online Code Runner!
using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}
`,
  bash: `#!/bin/bash
# Bash - Welcome to Online Code Runner!
echo "Hello, World!"
`,
  r: `# R - Welcome to Online Code Runner!
print("Hello, World!")
`,
  perl: `#!/usr/bin/perl
# Perl - Welcome to Online Code Runner!
print "Hello, World!\\n";
`,
  lua: `-- Lua - Welcome to Online Code Runner!
print("Hello, World!")
`,
  scala: `// Scala - Welcome to Online Code Runner!
object Main extends App {
  println("Hello, World!")
}
`,
  sql: `-- SQL - Welcome to Online Code Runner!
SELECT 'Hello, World!' AS message;
`,
  powershell: `# PowerShell - Welcome to Online Code Runner!
Write-Host "Hello, World!"
`,
};

// ─── Constants ───────────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = [
  // Web
  { group: 'Web',        value: 'javascript',  label: 'JavaScript',   ext: '.js',   monaco: 'javascript',  piston: 'javascript'  },
  { group: 'Web',        value: 'typescript',  label: 'TypeScript',   ext: '.ts',   monaco: 'typescript',  piston: 'typescript'  },
  { group: 'Web',        value: 'html',        label: 'HTML',         ext: '.html', monaco: 'html',        piston: null           },
  { group: 'Web',        value: 'css',         label: 'CSS',          ext: '.css',  monaco: 'css',         piston: null           },
  // Systems / General (16 executable languages)
  { group: 'General',    value: 'python',      label: 'Python',       ext: '.py',   monaco: 'python',      piston: 'python'      },
  { group: 'General',    value: 'java',        label: 'Java',         ext: '.java', monaco: 'java',        piston: 'java'        },
  { group: 'General',    value: 'cpp',         label: 'C++',          ext: '.cpp',  monaco: 'cpp',         piston: 'cpp'         },
  { group: 'General',    value: 'c',           label: 'C',            ext: '.c',    monaco: 'c',           piston: 'c'           },
  { group: 'General',    value: 'csharp',      label: 'C#',           ext: '.cs',   monaco: 'csharp',      piston: 'csharp'      },
  { group: 'General',    value: 'go',          label: 'Go',           ext: '.go',   monaco: 'go',          piston: 'go'          },
  { group: 'General',    value: 'rust',        label: 'Rust',         ext: '.rs',   monaco: 'rust',        piston: 'rust'        },
  { group: 'General',    value: 'ruby',        label: 'Ruby',         ext: '.rb',   monaco: 'ruby',        piston: 'ruby'        },
  { group: 'General',    value: 'php',         label: 'PHP',          ext: '.php',  monaco: 'php',         piston: 'php'         },
  { group: 'General',    value: 'r',           label: 'R',            ext: '.r',    monaco: 'r',           piston: 'r'           },
  { group: 'General',    value: 'perl',        label: 'Perl',         ext: '.pl',   monaco: 'perl',        piston: 'perl'        },
  // Scripting / Shell
  { group: 'Scripting',  value: 'bash',        label: 'Bash / Shell', ext: '.sh',   monaco: 'shell',       piston: 'bash'        },
  { group: 'Scripting',  value: 'lua',         label: 'Lua',          ext: '.lua',  monaco: 'lua',         piston: 'lua'         },
  // Data / Query
  { group: 'Data',       value: 'sql',         label: 'SQL',          ext: '.sql',  monaco: 'sql',         piston: 'sqlite3'     },
  { group: 'Data',       value: 'json',        label: 'JSON',         ext: '.json', monaco: 'json',        piston: null           },
  { group: 'Data',       value: 'yaml',        label: 'YAML',         ext: '.yaml', monaco: 'yaml',        piston: null           },
  // View-only (temporarily unavailable for execution)
  { group: 'Other',      value: 'kotlin',      label: 'Kotlin',       ext: '.kt',   monaco: 'kotlin',      piston: null          },
  { group: 'Other',      value: 'swift',       label: 'Swift',        ext: '.swift',monaco: 'swift',       piston: null          },
  { group: 'Other',      value: 'scala',       label: 'Scala',        ext: '.scala',monaco: 'scala',       piston: null          },
  { group: 'Other',      value: 'powershell',  label: 'PowerShell',   ext: '.ps1',  monaco: 'powershell',  piston: null          },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLanguageMeta(value) {
  return SUPPORTED_LANGUAGES.find(l => l.value === value) || SUPPORTED_LANGUAGES.find(l => l.value === 'python');
}

// Parse error line number from output
function parseErrorLine(output, language) {
  if (!output) return null;
  
  const patterns = {
    python: /File.*line (\d+)/i,
    javascript: /at.*:(\d+):/i,
    java: /\.java:(\d+)/i,
    cpp: /:(\d+):/i,
    c: /:(\d+):/i,
    go: /:(\d+):/i,
    rust: /-->(\s*)(\d+)/i,
    ruby: /:(\d+):/i,
    php: /on line (\d+)/i,
    typescript: /:(\d+):/i,
  };
  
  const pattern = patterns[language];
  if (pattern) {
    const match = output.match(pattern);
    if (match) {
      return parseInt(match[match.length - 1], 10);
    }
  }
  return null;
}

// ─── Loading Fallback ────────────────────────────────────────────────────────

const EditorLoader = () => (
  <div className="flex items-center justify-center h-80 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl">
    <div className="flex flex-col items-center gap-3 text-gray-400">
      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center animate-pulse">
        <Code size={20} className="text-blue-400" />
      </div>
      <div className="flex items-center gap-2">
        <Loader2 size={16} className="animate-spin text-blue-400" />
        <span className="text-sm">Loading editor...</span>
      </div>
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const OnlineCodeRunnerPage = () => {
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const handleRunRef = useRef(null);
  const { isAuthenticated, isGuest } = useSelector((state) => state.auth);

  // ── Draft Persistence (auto-save + auto-restore)
  const initialDraftState = {
    language: 'python',
    code: CODE_TEMPLATES.python || '',
    output: '',
  };

  const {
    state: draftState,
    updateField,
    updateFields,
    clearDraft,
    hasContent,
    lastSaved,
  } = useDraftPersistence(DRAFT_KEYS.ONLINE_CODE_RUNNER, initialDraftState, {
    warnOnUnload: true,
  });

  // ── Destructure draft state
  const {
    language,
    code,
    output: savedOutput,
  } = draftState;

  // ── State setters that update draft
  const setLanguage = (val) => updateField('language', val);
  const setCode = (val) => updateField('code', val);

  // ── Non-persisted UI State
  const [output, setOutput] = useState(savedOutput || '');
  const [executing, setExecuting] = useState(false);
  const [execSuccess, setExecSuccess] = useState(null);
  const [execRuntime, setExecRuntime] = useState(null);
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorLine, setErrorLine] = useState(null);
  const [decorations, setDecorations] = useState([]);

  // Input modal state
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputHints, setInputHints] = useState([]);
  const [inputCount, setInputCount] = useState(1);
  const [lastStdin, setLastStdin] = useState('');
  const [inputRequired, setInputRequired] = useState(false);

  // ── Derived
  const langMeta = getLanguageMeta(language);
  const canExecute = langMeta?.piston != null;

  // ── Handle language change with template
  const handleLanguageChange = useCallback((newLang) => {
    setLanguage(newLang);
    // Only set template if code is empty or is the default template
    const currentMeta = getLanguageMeta(language);
    const isDefault = code === CODE_TEMPLATES[language] || code.trim() === '' || 
                      code.startsWith('# ') || code.startsWith('// ') || code.startsWith('/*');
    if (isDefault && CODE_TEMPLATES[newLang]) {
      setCode(CODE_TEMPLATES[newLang]);
    }
    // Clear error highlighting on language change
    setErrorLine(null);
    clearErrorDecorations();
    setOutput('');
    setExecSuccess(null);
  }, [code, language]);

  // ── Clear error decorations
  const clearErrorDecorations = useCallback(() => {
    if (editorRef.current && monacoRef.current) {
      const newDecorations = editorRef.current.deltaDecorations(decorations, []);
      setDecorations(newDecorations);
    }
  }, [decorations]);

  // ── Highlight error line
  const highlightErrorLine = useCallback((lineNumber) => {
    if (editorRef.current && monacoRef.current && lineNumber) {
      setErrorLine(lineNumber);
      
      const newDecorations = editorRef.current.deltaDecorations(decorations, [
        {
          range: new monacoRef.current.Range(lineNumber, 1, lineNumber, 1),
          options: {
            isWholeLine: true,
            className: 'error-line-highlight',
            glyphMarginClassName: 'error-glyph-margin',
            linesDecorationsClassName: 'error-line-decoration',
          },
        },
      ]);
      setDecorations(newDecorations);
      
      // Scroll to error line
      editorRef.current.revealLineInCenter(lineNumber);
    }
  }, [decorations]);

  // ── Editor mount handler
  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Add custom CSS for error highlighting
    const styleId = 'code-runner-error-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .error-line-highlight { background-color: rgba(239, 68, 68, 0.2) !important; }
        .error-glyph-margin { background-color: #ef4444; width: 4px !important; margin-left: 3px; }
        .error-line-decoration { background-color: #ef4444; width: 3px !important; }
      `;
      document.head.appendChild(style);
    }
    
    // Keyboard shortcut: Ctrl+Enter to run (uses ref to avoid stale closure)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRunRef.current?.();
    });
    
    // Focus editor
    editor.focus();
  }, []);

  // ── Check if code requires input
  const checkInputRequirements = useCallback(() => {
    return detectInputRequirements(code.trim(), language);
  }, [code, language]);

  // ── Execute code
  const executeCode = useCallback(async (stdin = '') => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      toast.error('Please write some code first');
      return;
    }
    if (!canExecute) {
      toast.error('This language cannot be executed in the browser sandbox.');
      return;
    }

    try {
      setExecuting(true);
      setOutput('⏳ Running your code...\n');
      setExecSuccess(null);
      setExecRuntime(null);
      setInputRequired(false);
      setLastStdin(stdin);
      clearErrorDecorations();
      setErrorLine(null);

      const result = await noteService.runCode({
        code: trimmedCode,
        language,
        stdin,
        timeout: 15,
      });

      if (result.success) {
        const out = result.output?.trim() || '✅ Program executed successfully (no output)';
        setOutput(out);
        setExecSuccess(true);
        setExecRuntime(result.runtime_ms ?? null);
      } else {
        if (result.requires_input) {
          setInputRequired(true);
          setOutput('📝 This program requires input. Click "Provide Input" below.');
          setExecSuccess(null);
        } else {
          const errText = result.formatted_error || result.error || 'Execution failed';
          setOutput(`❌ Error:\n${errText}`);
          setExecSuccess(false);
          
          // Try to highlight error line
          const errLine = parseErrorLine(errText, language);
          if (errLine) {
            highlightErrorLine(errLine);
          }
        }
      }
    } catch (err) {
      logger.error('Execution error:', String(err));
      setOutput(`❌ Error: ${err.message || 'Unknown error'}`);
      setExecSuccess(false);
    } finally {
      setExecuting(false);
      setShowInputModal(false);
    }
  }, [code, canExecute, language, clearErrorDecorations, highlightErrorLine]);

  // ── Handle Run button click
  const handleRun = useCallback(() => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }
    if (!canExecute) {
      toast.error('This language cannot be executed. Download or copy to run locally.');
      return;
    }

    // Check if input is required
    const inputCheck = checkInputRequirements();
    if (inputCheck.requiresInput) {
      setInputHints(inputCheck.hints);
      setInputCount(inputCheck.count);
      setShowInputModal(true);
      return;
    }

    executeCode('');
  }, [code, canExecute, checkInputRequirements, executeCode]);

  // Keep handleRunRef updated with latest handleRun
  useEffect(() => {
    handleRunRef.current = handleRun;
  }, [handleRun]);

  // ── Handle input submission
  const handleInputSubmit = useCallback((stdinValue) => {
    executeCode(stdinValue);
  }, [executeCode]);

  // ── Clear output and reset
  const handleClearOutput = useCallback(() => {
    setOutput('');
    setExecSuccess(null);
    setExecRuntime(null);
    setInputRequired(false);
    clearErrorDecorations();
    setErrorLine(null);
  }, [clearErrorDecorations]);

  // ── Reset editor to template (clears draft)
  const handleReset = useCallback(() => {
    if (clearDraft()) {
      // Draft cleared, set to template for current language
      setCode(CODE_TEMPLATES[language] || '');
      handleClearOutput();
    }
  }, [language, handleClearOutput, clearDraft, setCode]);

  // ── Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // ── Toggle theme
  const toggleTheme = useCallback(() => {
    setEditorTheme(prev => prev === 'vs-dark' ? 'light' : 'vs-dark');
  }, []);

  // ── Download code with correct extension
  const handleDownload = useCallback(() => {
    if (!code.trim()) {
      toast.error('No code to download');
      return;
    }
    const fileName = `code${langMeta?.ext || '.txt'}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as ${fileName}`);
  }, [code, langMeta]);

  // ── Copy code
  const handleCopy = useCallback(() => {
    if (!code.trim()) {
      toast.error('No code to copy');
      return;
    }
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  }, [code]);

  // ── Monaco editor options
  const editorOptions = useMemo(() => ({
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
    fontLigatures: true,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: language === 'python' ? 4 : 2,
    wordWrap: 'on',
    formatOnPaste: true,
    formatOnType: false,
    renderLineHighlight: 'all',
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    bracketPairColorization: { enabled: true },
    padding: { top: 16, bottom: 16 },
    glyphMargin: true,
    lineDecorationsWidth: 10,
    autoIndent: 'full',
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    quickSuggestions: true,
    snippetSuggestions: 'top',
  }), [language]);

  // Language grouped select
  const renderLanguageSelect = () => {
    const groups = [...new Set(SUPPORTED_LANGUAGES.map(l => l.group))];
    return (
      <select
        value={language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-800 
          focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white 
          min-w-[130px] sm:min-w-[160px] transition-all duration-200 cursor-pointer
          hover:border-gray-300 shadow-sm"
      >
        {groups.map(group => (
          <optgroup key={group} label={`── ${group} ──`}>
            {SUPPORTED_LANGUAGES.filter(l => l.group === group).map(l => (
              <option key={l.value} value={l.value}>
                {l.label} {!l.piston && '(view only)'}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    );
  };

  // Line count
  const lineCount = code.split('\n').length;

  return (
    <>
      <Helmet>
        <title>Online Code Runner | NoteAssist AI</title>
        <meta name="description" content="Write, run, and test code in 15+ programming languages directly in your browser. Free online code editor with syntax highlighting." />
      </Helmet>

      <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50 ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
        
        {/* ── Sticky Header ── */}
        <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30 animate-fadeInDown">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between gap-3 h-14 sm:h-16">
              {/* Left: Title */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {!isFullscreen && (
                  <button
                    onClick={() => navigate(-1)}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
                    aria-label="Go back"
                  >
                    <ArrowLeft size={18} className="text-gray-600" />
                  </button>
                )}
                <span className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100 flex-shrink-0 shadow-sm">
                  <Code size={16} className="text-blue-600" />
                </span>
                <div className="hidden xs:block">
                  <h1 className="text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">
                    Code Runner
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    15+ languages supported
                  </p>
                </div>
              </div>

              {/* Right: Nav Pills & Actions */}
              <nav
                className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto flex-shrink-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* Draft Status */}
                {hasContent && (
                  <span className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200 flex-shrink-0">
                    <CheckCircle size={12} />
                    Draft saved
                  </span>
                )}
                
                {/* Nav Pills - Hidden on small screens */}
                <div className="hidden md:flex items-center gap-1.5">
                  <NavPill to="/note-editor" icon={FileText} label="Note Editor" />
                  <NavPill to="/ai-tools" icon={Sparkles} label="AI Tools" />
                </div>

                {/* Clear Draft Button */}
                {hasContent && (
                  <button
                    onClick={handleReset}
                    className="p-1.5 sm:p-2 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                    title="Clear draft"
                  >
                    <Trash2 size={15} className="text-gray-500 group-hover:text-red-500 transition-colors" />
                  </button>
                )}
              </nav>
            </div>
          </div>
        </header>

        {/* ── Action Bar (Secondary) ── */}
        <div className="bg-white/70 backdrop-blur-sm border-b border-gray-100 sticky top-14 sm:top-16 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Execution Status Badge */}
              <div className="flex items-center gap-2">
                {execSuccess !== null && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    execSuccess 
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                      : 'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {execSuccess ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {execSuccess ? 'Success' : 'Error'}
                    {execSuccess && execRuntime && (
                      <span className="flex items-center gap-0.5 text-emerald-600 font-normal ml-1">
                        <Clock size={10} />{execRuntime}ms
                      </span>
                    )}
                  </div>
                )}
                {!execSuccess && execSuccess !== false && (
                  <span className="text-xs text-gray-500 hidden sm:block">
                    {canExecute ? 'Ready to run' : 'View-only mode'}
                  </span>
                )}
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Language Select + Run Button */}
                {renderLanguageSelect()}
                <button
                  onClick={handleRun}
                  disabled={executing || !canExecute}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 
                    bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold text-sm 
                    hover:from-emerald-700 hover:to-green-700 hover:shadow-lg hover:shadow-emerald-500/25
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 
                    active:scale-[.98] shadow-md whitespace-nowrap"
                >
                  {executing ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play size={15} fill="white" />
                      <span>Run Code</span>
                    </>
                  )}
                </button>

                {/* Action Buttons Group */}
                <div className="flex items-center gap-0.5 bg-gray-100/80 rounded-xl p-1 border border-gray-200/50">
                  <button
                    onClick={handleDownload}
                    className="p-2 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm group"
                    title={`Download as ${langMeta?.ext || '.txt'}`}
                  >
                    <FileDown size={16} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-2 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm group"
                    title="Copy code"
                  >
                    <Copy size={16} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-2 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm group"
                    title="Reset to template"
                  >
                    <RefreshCw size={16} className="text-gray-500 group-hover:text-orange-600 transition-colors" />
                  </button>
                  <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm hidden sm:block"
                    title={editorTheme === 'vs-dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  >
                    <span className="text-sm">{editorTheme === 'vs-dark' ? '☀️' : '🌙'}</span>
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm group"
                    title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen 
                      ? <X size={16} className="text-gray-500 group-hover:text-red-600 transition-colors" /> 
                      : <Maximize2 size={16} className="text-gray-500 group-hover:text-blue-600 transition-colors" />
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 ${isFullscreen ? 'h-[calc(100vh-120px)]' : ''}`}>
          {/* Guest Banner */}
          {(!isAuthenticated || isGuest) && !isFullscreen && (
            <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 animate-fadeIn shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Info size={16} className="text-blue-600" />
              </div>
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Guest Mode:</span> Write and run code freely. 
                <Button 
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-800 underline ml-1 font-medium transition-colors"
                  onClick={() => navigate('/login')}
                >
                  Sign in
                </Button> to save your code to notes.
              </p>
            </div>
          )}

          {/* Editor + Output Grid */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 ${isFullscreen ? 'h-full' : ''}`}>
            
            {/* ── Code Editor Card ── */}
            <div className={`order-1 ${isFullscreen ? 'h-full' : ''} animate-fadeIn`}>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
                {/* Card Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Code size={16} className="text-blue-600" />
                    Code Editor
                    {errorLine && (
                      <span className="flex items-center gap-1 text-red-600 text-xs font-medium bg-red-50 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={11} />
                        Line {errorLine}
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-lg hidden sm:block">
                      {langMeta?.label}
                    </span>
                    <span className="text-xs text-gray-400 hidden md:block">
                      {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                    </span>
                  </div>
                </div>
              
                {/* Editor Container */}
                <div className={`flex flex-col flex-1 min-h-0 ${isFullscreen ? '' : 'max-h-[420px] sm:max-h-[480px]'}`}>
                  {/* Terminal-style Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700/60">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400/80 hover:bg-yellow-400 transition-colors" />
                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors" />
                      </div>
                      <span className="text-xs font-mono text-gray-400/80 hidden xs:block">
                        main{langMeta?.ext || '.txt'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {canExecute ? (
                        <span className="text-xs text-emerald-400/80 hidden sm:block">✓ Executable</span>
                      ) : (
                        <span className="text-xs text-amber-400/80 hidden sm:block">⚠️ View only</span>
                      )}
                    </div>
                  </div>

                  {/* Monaco Editor */}
                  <div className="flex-1 min-h-[280px] sm:min-h-[320px]">
                    <Suspense fallback={<EditorLoader />}>
                      <Editor
                        height="100%"
                        language={langMeta?.monaco || 'plaintext'}
                        value={code}
                        onChange={(val) => {
                          setCode(val || '');
                          if (errorLine) {
                            clearErrorDecorations();
                            setErrorLine(null);
                          }
                        }}
                        theme={editorTheme}
                        onMount={handleEditorMount}
                        options={editorOptions}
                        loading={<EditorLoader />}
                      />
                    </Suspense>
                  </div>

                  {/* Editor Footer */}
                  <div className="px-4 py-1.5 bg-gray-800 border-t border-gray-700/50 flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-mono flex items-center gap-2">
                      <Keyboard size={11} />
                      <span className="hidden sm:inline">Ctrl+Enter to run</span>
                      <span className="sm:hidden">⌘+↵</span>
                    </span>
                    <span className="text-xs text-gray-500">UTF-8</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Output Terminal Card ── */}
            <div className={`order-2 ${isFullscreen ? 'h-full' : ''} animate-fadeIn`} style={{ animationDelay: '100ms' }}>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
                {/* Card Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Terminal size={16} className="text-emerald-600" />
                    Output
                  </h2>
                  <div className="flex items-center gap-2">
                    {lastStdin && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                        stdin provided
                      </span>
                    )}
                    {output && (
                      <button
                        onClick={handleClearOutput}
                        className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded-lg transition-all duration-200"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              
                {/* Terminal Container */}
                <div className={`flex flex-col flex-1 min-h-0 ${isFullscreen ? '' : 'max-h-[420px] sm:max-h-[480px]'}`}>
                  {/* Terminal Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-950 border-b border-gray-800/60">
                    <div className="flex items-center gap-2">
                      <Terminal size={13} className="text-gray-500" />
                      <span className="text-xs text-gray-500">Terminal Output</span>
                    </div>
                    <span className="text-xs text-gray-600 font-mono">
                      {canExecute ? 'piston' : 'readonly'}
                    </span>
                  </div>

                  {/* Output Content */}
                  <div className="flex-1 min-h-[280px] sm:min-h-[320px] p-4 overflow-auto font-mono text-sm bg-gray-950">
                    {executing ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center animate-pulse">
                          <Loader2 size={20} className="text-blue-400 animate-spin" />
                        </div>
                        <span className="text-blue-400 text-sm">Executing your code...</span>
                      </div>
                    ) : output ? (
                      <pre className={`whitespace-pre-wrap break-words leading-relaxed ${
                        execSuccess === false ? 'text-red-400' : 
                        execSuccess === true ? 'text-emerald-400' : 'text-gray-300'
                      }`}>
                        {output}
                      </pre>
                    ) : (
                      <div className="text-gray-500 flex flex-col items-center justify-center h-full">
                        <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-3">
                          <Terminal size={24} className="text-gray-600" />
                        </div>
                        <p className="text-gray-400 text-sm font-medium">Output will appear here</p>
                        <p className="text-gray-600 text-xs mt-1">Press "Run Code" or Ctrl+Enter</p>
                      </div>
                    )}
                  </div>

                  {/* Input Required Banner */}
                  {inputRequired && (
                    <div className="px-4 py-3 bg-gradient-to-r from-amber-900/60 to-orange-900/60 border-t border-amber-700/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-300">
                        <Keyboard size={14} />
                        <span className="text-sm font-medium">This program requires input</span>
                      </div>
                      <button
                        onClick={() => {
                          const inputCheck = checkInputRequirements();
                          setInputHints(inputCheck.hints);
                          setInputCount(inputCheck.count);
                          setShowInputModal(true);
                        }}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25"
                      >
                        Provide Input
                      </button>
                    </div>
                  )}

                  {/* Output Footer */}
                  <div className="px-4 py-1.5 bg-gray-900 border-t border-gray-800/50 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {canExecute ? 'Piston Runtime' : 'Code not executable'}
                    </span>
                    <span className="text-xs text-gray-600">15s timeout</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips Card - hidden in fullscreen */}
          {!isFullscreen && (
            <div className="mt-5 sm:mt-6 p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-sm animate-fadeIn" style={{ animationDelay: '200ms' }}>
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Zap size={14} className="text-amber-600" />
                </span>
                Quick Tips
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors">
                  <Play size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">Run Code</p>
                    <p className="text-xs text-gray-500">Click Run or <kbd className="px-1 py-0.5 bg-white border rounded text-[10px]">Ctrl+Enter</kbd></p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors">
                  <FileDown size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">Download</p>
                    <p className="text-xs text-gray-500">Saves with extension {langMeta?.ext}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors">
                  <Code size={14} className="text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">15+ Languages</p>
                    <p className="text-xs text-gray-500">Python, JS, Java, C++, Go, Rust...</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors">
                  <CheckCircle size={14} className="text-teal-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">Secure Sandbox</p>
                    <p className="text-xs text-gray-500">15s timeout, isolated environment</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors">
                  <Keyboard size={14} className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">Input Support</p>
                    <p className="text-xs text-gray-500">Programs can request user input</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">Error Highlighting</p>
                    <p className="text-xs text-gray-500">Error lines marked in editor</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Modal */}
      <Suspense fallback={null}>
        <CodeInputModal
          open={showInputModal}
          onClose={() => setShowInputModal(false)}
          onSubmit={handleInputSubmit}
          hints={inputHints}
          expectedCount={inputCount}
          languageLabel={langMeta?.label}
        />
      </Suspense>
    </>
  );
};

export default OnlineCodeRunnerPage;
