// FILE: src/pages/OnlineCodeRunnerPage.jsx
// ============================================================================
// Public Online Code Runner - Full-Featured Code Execution Environment
// Features: Write code, run code, view output, download/copy, error highlighting
// ============================================================================

import { useState, useRef, useCallback, lazy, Suspense, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Code, Play, Loader2, ArrowLeft, RotateCcw, Download, Copy,
  Terminal, CheckCircle, XCircle, Clock, Keyboard, Info, Zap,
  FileDown, Settings2, Maximize2, X, AlertTriangle, RefreshCw
} from 'lucide-react';
import { noteService } from '@/services/note.service';
import { toast } from 'react-hot-toast';

// Lazy load Monaco Editor for better performance
const Editor = lazy(() => import('@monaco-editor/react'));
const CodeInputModal = lazy(() => import('@/components/code/CodeInputModal'));

// Import input detection helper
import { detectInputRequirements } from '@/components/code';

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

import "fmt"

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
  <div className="flex items-center justify-center h-80 bg-gray-900 rounded-2xl">
    <div className="flex items-center gap-3 text-gray-400">
      <Loader2 size={20} className="animate-spin" />
      <span>Loading editor...</span>
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

  // ── State
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(CODE_TEMPLATES.python || '');
  const [output, setOutput] = useState('');
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
      console.error('Execution error:', err);
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

  // ── Reset editor to template
  const handleReset = useCallback(() => {
    if (window.confirm('Reset to default template? Your current code will be lost.')) {
      setCode(CODE_TEMPLATES[language] || '');
      handleClearOutput();
      toast.success('Editor reset to default');
    }
  }, [language, handleClearOutput]);

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
        className="px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white min-w-[120px] sm:min-w-[160px]"
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

      <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              {/* Left: Back + Title */}
              <div className="flex items-center gap-3">
                {!isFullscreen && (
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft size={20} className="text-gray-600" />
                  </button>
                )}
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Code className="text-blue-600" size={22} />
                    Online Code Runner
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                    Write, run, and download code in 15+ languages
                  </p>
                </div>
              </div>

              {/* Right: Language Select + Actions */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {renderLanguageSelect()}
                
                <button
                  onClick={handleRun}
                  disabled={executing || !canExecute}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium text-sm hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {executing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="hidden sm:inline">Running...</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      <span>Run</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={handleDownload}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                    title={`Download as ${langMeta?.ext || '.txt'}`}
                  >
                    <FileDown size={16} className="text-gray-600" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                    title="Copy code"
                  >
                    <Copy size={16} className="text-gray-600" />
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                    title="Reset to template"
                  >
                    <RefreshCw size={16} className="text-gray-600" />
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                    title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <X size={16} className="text-gray-600" /> : <Maximize2 size={16} className="text-gray-600" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 ${isFullscreen ? 'h-[calc(100vh-70px)]' : ''}`}>
          {/* Guest Banner */}
          {(!isAuthenticated || isGuest) && !isFullscreen && (
            <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <Info size={18} className="text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                <span className="font-medium">Guest Mode:</span> Write and run code freely. 
                <button 
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:text-blue-800 underline ml-1"
                >
                  Sign in
                </button> to save your code to notes.
              </p>
            </div>
          )}

          {/* Editor + Output Grid */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 ${isFullscreen ? 'h-full' : ''}`}>
            {/* Code Editor */}
            <div className={`order-1 ${isFullscreen ? 'h-full' : ''}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Code size={16} />
                  Code Editor
                  {errorLine && (
                    <span className="flex items-center gap-1 text-red-600 text-xs">
                      <AlertTriangle size={12} />
                      Error on line {errorLine}
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleTheme}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded"
                  >
                    {editorTheme === 'vs-dark' ? '☀️ Light' : '🌙 Dark'}
                  </button>
                  <span className="text-xs text-gray-500 font-mono">{langMeta?.label}</span>
                </div>
              </div>
              
              <div className={`rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col ${isFullscreen ? 'h-[calc(100%-40px)]' : 'h-[450px]'}`}>
                {/* Editor Toolbar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700/60">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
                      <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
                      <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
                    </div>
                    <span className="text-xs font-mono text-gray-400">
                      main{langMeta?.ext || '.txt'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                  </span>
                </div>

                {/* Monaco Editor */}
                <div className="flex-1 min-h-0">
                  <Suspense fallback={<EditorLoader />}>
                    <Editor
                      height="100%"
                      language={langMeta?.monaco || 'plaintext'}
                      value={code}
                      onChange={(val) => {
                        setCode(val || '');
                        // Clear error highlighting when code changes
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
                <div className="px-4 py-1.5 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-mono">
                    {langMeta?.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {canExecute ? '✓ Executable' : '⚠️ View only'}
                  </span>
                </div>
              </div>
            </div>

            {/* Output Terminal */}
            <div className={`order-2 ${isFullscreen ? 'h-full' : ''}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Terminal size={16} />
                  Output
                </h2>
                <div className="flex items-center gap-2">
                  {execSuccess !== null && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      execSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {execSuccess ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {execSuccess ? 'Success' : 'Error'}
                      {execSuccess && execRuntime && (
                        <span className="flex items-center gap-0.5 text-emerald-500 font-normal ml-1">
                          <Clock size={10} />{execRuntime}ms
                        </span>
                      )}
                    </div>
                  )}
                  {output && (
                    <button
                      onClick={handleClearOutput}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              
              <div className={`rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-950 flex flex-col ${isFullscreen ? 'h-[calc(100%-40px)]' : 'h-[450px]'}`}>
                {/* Output Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700/60">
                  <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-400">Terminal Output</span>
                  </div>
                  {lastStdin && (
                    <span className="text-xs text-gray-500">stdin provided</span>
                  )}
                </div>

                {/* Output Content */}
                <div className="flex-1 min-h-0 p-4 overflow-auto font-mono text-sm">
                  {executing ? (
                    <div className="flex items-center gap-2 text-blue-400">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Executing your code...</span>
                    </div>
                  ) : output ? (
                    <pre className={`whitespace-pre-wrap break-words ${
                      execSuccess === false ? 'text-red-400' : 
                      execSuccess === true ? 'text-emerald-400' : 'text-gray-300'
                    }`}>
                      {output}
                    </pre>
                  ) : (
                    <div className="text-gray-500 flex flex-col items-center justify-center h-full">
                      <Terminal size={32} className="mb-2 opacity-50" />
                      <p>Output will appear here</p>
                      <p className="text-xs mt-1">Press "Run" or use Ctrl+Enter</p>
                    </div>
                  )}
                </div>

                {/* Input Required Banner */}
                {inputRequired && (
                  <div className="px-4 py-3 bg-amber-900/50 border-t border-amber-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-300">
                      <Keyboard size={14} />
                      <span className="text-sm">This program requires input</span>
                    </div>
                    <button
                      onClick={() => {
                        const inputCheck = checkInputRequirements();
                        setInputHints(inputCheck.hints);
                        setInputCount(inputCheck.count);
                        setShowInputModal(true);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg transition-colors"
                    >
                      Provide Input
                    </button>
                  </div>
                )}

                {/* Output Footer */}
                <div className="px-4 py-1.5 bg-gray-900 border-t border-gray-700/50 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {canExecute ? 'Piston Runtime' : 'Not executable'}
                  </span>
                  <span className="text-xs text-gray-500">
                    15s timeout
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips - hidden in fullscreen */}
          {!isFullscreen && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Zap size={14} className="text-yellow-500" />
                Quick Tips
              </h3>
              <ul className="text-xs sm:text-sm text-gray-600 space-y-1 grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <li>• <strong>Run Code:</strong> Click Run button or press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+Enter</kbd></li>
                <li>• <strong>Download:</strong> Code downloads with correct file extension ({langMeta?.ext})</li>
                <li>• <strong>15+ Languages:</strong> Python, JavaScript, Java, C++, Go, Rust, and more</li>
                <li>• <strong>Secure:</strong> Code runs in sandboxed environment with 15s timeout</li>
                <li>• <strong>Input:</strong> Programs requiring input will prompt for values</li>
                <li>• <strong>Errors:</strong> Error lines are highlighted in the editor</li>
              </ul>
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
