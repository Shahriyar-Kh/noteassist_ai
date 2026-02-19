// FILE: src/pages/AIToolsGenerateCodePage.jsx
// ============================================================================
// Enhanced Code Generator — VS Code-like Monaco Editor, 25+ Languages,
// "Other" language validation, Input Support, Always-visible Editor
// ============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import {
  Code, Play, Download, Upload, Loader2, AlertCircle,
  ArrowLeft, RotateCcw, Sparkles, Wand2, AlignLeft,
  CheckCircle, XCircle, Info, Zap, Languages, Keyboard,
} from 'lucide-react';
import { noteService } from '@/services/note.service';
import { exportCodeToPDF, exportCodeToPDFBlob } from '@/utils/pdfExport';
import { toast } from 'react-hot-toast';

// Import reusable code components
import { CodeEditor, CodeInputModal, CodeExecutionOutput, detectInputRequirements } from '@/components/code';

// ─── Constants ───────────────────────────────────────────────────────────────

/** All supported languages with Monaco mapping, extension, and Piston runtime */
const SUPPORTED_LANGUAGES = [
  // Web
  { group: 'Web',        value: 'javascript',  label: 'JavaScript',   ext: '.js',   monaco: 'javascript',  piston: 'javascript'  },
  { group: 'Web',        value: 'typescript',  label: 'TypeScript',   ext: '.ts',   monaco: 'typescript',  piston: 'typescript'  },
  { group: 'Web',        value: 'html',        label: 'HTML',         ext: '.html', monaco: 'html',        piston: null           },
  { group: 'Web',        value: 'css',         label: 'CSS',          ext: '.css',  monaco: 'css',         piston: null           },
  // Systems / General
  { group: 'General',    value: 'python',      label: 'Python',       ext: '.py',   monaco: 'python',      piston: 'python'      },
  { group: 'General',    value: 'java',        label: 'Java',         ext: '.java', monaco: 'java',        piston: 'java'        },
  { group: 'General',    value: 'cpp',         label: 'C++',          ext: '.cpp',  monaco: 'cpp',         piston: 'cpp'         },
  { group: 'General',    value: 'c',           label: 'C',            ext: '.c',    monaco: 'c',           piston: 'c'           },
  { group: 'General',    value: 'csharp',      label: 'C#',           ext: '.cs',   monaco: 'csharp',      piston: 'csharp'      },
  { group: 'General',    value: 'go',          label: 'Go',           ext: '.go',   monaco: 'go',          piston: 'go'          },
  { group: 'General',    value: 'rust',        label: 'Rust',         ext: '.rs',   monaco: 'rust',        piston: 'rust'        },
  { group: 'General',    value: 'kotlin',      label: 'Kotlin',       ext: '.kt',   monaco: 'kotlin',      piston: 'kotlin'      },
  { group: 'General',    value: 'swift',       label: 'Swift',        ext: '.swift',monaco: 'swift',       piston: 'swift'       },
  { group: 'General',    value: 'ruby',        label: 'Ruby',         ext: '.rb',   monaco: 'ruby',        piston: 'ruby'        },
  { group: 'General',    value: 'php',         label: 'PHP',          ext: '.php',  monaco: 'php',         piston: 'php'         },
  { group: 'General',    value: 'scala',       label: 'Scala',        ext: '.scala',monaco: 'scala',       piston: 'scala'       },
  { group: 'General',    value: 'r',           label: 'R',            ext: '.r',    monaco: 'r',           piston: 'r'           },
  { group: 'General',    value: 'perl',        label: 'Perl',         ext: '.pl',   monaco: 'perl',        piston: 'perl'        },
  // Scripting / Shell
  { group: 'Scripting',  value: 'bash',        label: 'Bash / Shell', ext: '.sh',   monaco: 'shell',       piston: 'bash'        },
  { group: 'Scripting',  value: 'powershell',  label: 'PowerShell',   ext: '.ps1',  monaco: 'powershell',  piston: 'powershell'  },
  { group: 'Scripting',  value: 'lua',         label: 'Lua',          ext: '.lua',  monaco: 'lua',         piston: 'lua'         },
  // Data / Query
  { group: 'Data',       value: 'sql',         label: 'SQL',          ext: '.sql',  monaco: 'sql',         piston: 'sqlite3'     },
  { group: 'Data',       value: 'json',        label: 'JSON',         ext: '.json', monaco: 'json',        piston: null           },
  { group: 'Data',       value: 'yaml',        label: 'YAML',         ext: '.yaml', monaco: 'yaml',        piston: null           },
  // Low-level
  { group: 'Low-level',  value: 'haskell',     label: 'Haskell',      ext: '.hs',   monaco: 'haskell',     piston: 'haskell'     },
  { group: 'Low-level',  value: 'elixir',      label: 'Elixir',       ext: '.ex',   monaco: 'elixir',      piston: 'elixir'      },
  // Other (sentinel entry — always last)
  { group: 'Other',      value: '__other__',   label: 'Other…',       ext: '.txt',  monaco: 'plaintext',   piston: null           },
];

/** Whitelist of valid custom languages for "Other" validation */
const KNOWN_VALID_LANGUAGES = new Set([
  'assembly', 'asm', 'fortran', 'cobol', 'pascal', 'ada', 'prolog', 'erlang',
  'clojure', 'fsharp', 'ocaml', 'lisp', 'scheme', 'racket', 'groovy', 'dart',
  'nim', 'crystal', 'zig', 'julia', 'd', 'objective-c', 'objc', 'matlab',
  'octave', 'latex', 'tex', 'verilog', 'vhdl', 'solidity', 'move', 'cairo',
  'brainfuck', 'befunge', 'whitespace', 'intercal',
]);

const LEVELS = [
  { value: 'beginner',     label: 'Beginner',     desc: 'Simple, heavily commented',   icon: '🌱' },
  { value: 'intermediate', label: 'Intermediate',  desc: 'Practical, best practices',   icon: '📚' },
  { value: 'advanced',     label: 'Advanced',      desc: 'Optimized, deep patterns',    icon: '🚀' },
  { value: 'expert',       label: 'Expert',        desc: 'Production-grade mastery',    icon: '⭐' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLanguageMeta(value) {
  return SUPPORTED_LANGUAGES.find(l => l.value === value) || SUPPORTED_LANGUAGES.find(l => l.value === 'python');
}

/**
 * Validate a custom language string entered by the user.
 * Returns { valid: boolean, reason?: string }
 */
function validateCustomLanguage(input) {
  const clean = input.trim().toLowerCase().replace(/\s+/g, '-');
  if (!clean) return { valid: false, reason: 'Please enter a language name.' };
  if (clean.length < 2) return { valid: false, reason: 'Language name too short.' };
  if (clean.length > 40) return { valid: false, reason: 'Language name too long.' };
  // Must start with a letter
  if (!/^[a-z]/.test(clean)) return { valid: false, reason: 'Language name must start with a letter.' };
  // Alphanumeric + hyphens/plus
  if (!/^[a-z0-9+#\-]+$/.test(clean)) return { valid: false, reason: 'Use only letters, numbers, hyphens, or + / #.' };

  // Check known whitelist first (always valid)
  if (KNOWN_VALID_LANGUAGES.has(clean)) return { valid: true };

  // Known non-programming inputs
  const nonProgTerms = [
    'english','french','spanish','german','chinese','arabic','hindi','japanese',
    'math','maths','physics','chemistry','biology','history','geography',
    'music','art','painting','cooking','sports','football',
    'hello','test','random','stuff','abc',
  ];
  if (nonProgTerms.includes(clean)) {
    return { valid: false, reason: 'That doesn\'t appear to be a programming language.' };
  }

  // Heuristic: if it looks like a word with no programming-like ending, warn
  const programmingHints = ['script', 'lang', 'py', 'js', 'rb', 'go', 'rs', 'hs', 'ml', 'ex', 'erl', 'jl', '+', '#', 'sql', 'ql'];
  const hasHint = programmingHints.some(h => clean.includes(h));
  // Allow anything that passes basic checks — be permissive but warn
  if (!hasHint && clean.length < 4) {
    return { valid: false, reason: 'This programming language is currently not supported.' };
  }

  return { valid: true };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const NavPill = ({ onClick, icon: Icon, label, variant = 'default' }) => {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all duration-150 border cursor-pointer ';
  const styles = {
    default: base + 'border-gray-200 bg-white text-gray-600 hover:border-orange-400 hover:text-orange-700 hover:bg-orange-50',
    back:    base + 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold',
  };
  return (
    <button type="button" onClick={onClick} className={styles[variant] || styles.default}>
      <Icon size={12} />{label}
    </button>
  );
};

/** Grouped language <select> */
const LanguageSelect = ({ value, onChange, disabled }) => {
  const groups = [...new Set(SUPPORTED_LANGUAGES.map(l => l.group))];
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-white disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none"
      style={{

        backgroundSize: '16px',
        paddingRight: '36px',
      }}
    >
      {groups.map(group => (
        <optgroup key={group} label={`── ${group} ──`}>
          {SUPPORTED_LANGUAGES.filter(l => l.group === group).map(l => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AIToolsGenerateCodePage = () => {
  const navigate = useNavigate();
  const editorRef = useRef(null);

  // ── Form state
  const [topic, setTopic]         = useState('');
  const [language, setLanguage]   = useState('python');
  const [level, setLevel]         = useState('beginner');

  // "Other" language state
  const [isCustomLang, setIsCustomLang]       = useState(false);
  const [customLang, setCustomLang]           = useState('');
  const [customLangError, setCustomLangError] = useState('');
  const [customLangValid, setCustomLangValid] = useState(false);

  // ── Content state
  const [generatedCode, setGeneratedCode]       = useState('');
  const [editableCode, setEditableCode]         = useState('');
  const [executionOutput, setExecutionOutput]   = useState('');
  const [execSuccess, setExecSuccess]           = useState(null);   // null | true | false
  const [execRuntime, setExecRuntime]           = useState(null);

  // ── Input modal state
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputHints, setInputHints]         = useState([]);
  const [inputCount, setInputCount]         = useState(1);
  const [lastStdin, setLastStdin]           = useState('');
  const [inputRequired, setInputRequired]   = useState(false);

  // ── UI state
  const [generating, setGenerating]   = useState(false);
  const [executing, setExecuting]     = useState(false);
  const [historyId, setHistoryId]     = useState(null);

  // ── Derived
  const effectiveLanguage  = isCustomLang ? (customLangValid ? customLang : '') : language;
  const langMeta           = isCustomLang ? null : getLanguageMeta(language);
  const monacoLanguage     = isCustomLang ? 'plaintext' : (langMeta?.monaco || 'plaintext');
  const canExecute         = isCustomLang
    ? (customLangValid && langMeta?.piston != null)
    : (langMeta?.piston != null);

  // ── Handle language select change
  const handleLanguageChange = (val) => {
    if (val === '__other__') {
      setIsCustomLang(true);
      setLanguage('__other__');
    } else {
      setIsCustomLang(false);
      setCustomLang('');
      setCustomLangError('');
      setCustomLangValid(false);
      setLanguage(val);
    }
  };

  // ── Validate custom language as user types
  const handleCustomLangChange = (val) => {
    setCustomLang(val);
    if (!val.trim()) {
      setCustomLangError('');
      setCustomLangValid(false);
      return;
    }
    const result = validateCustomLanguage(val);
    if (result.valid) {
      setCustomLangError('');
      setCustomLangValid(true);
    } else {
      setCustomLangError(result.reason);
      setCustomLangValid(false);
    }
  };

  // ── Generate code via API
  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a code topic or requirement');
      return;
    }
    if (isCustomLang && !customLangValid) {
      toast.error(customLangError || 'Please enter a valid programming language');
      return;
    }

    const langForApi = isCustomLang ? customLang.trim() : language;

    try {
      setGenerating(true);
      setExecutionOutput('');
      setExecSuccess(null);
      setExecRuntime(null);
      setInputRequired(false);
      setLastStdin('');

      const result = await noteService.aiToolGenerateCode({
        title: topic,
        language: langForApi,
        level,
      });

      const code = result.generated_content || '';
      setGeneratedCode(code);
      setEditableCode(code);
      setHistoryId(result.history_id || null);
      toast.success('Code generated successfully!');
    } catch (err) {
      console.error('Code generation error:', err);
      toast.error(err.message || 'Failed to generate code');
    } finally {
      setGenerating(false);
    }
  };

  // ── Detect if code requires input before execution
  const checkInputRequirements = useCallback(() => {
    const code = editableCode.trim();
    const langForExec = isCustomLang ? customLang.trim().toLowerCase() : language;
    return detectInputRequirements(code, langForExec);
  }, [editableCode, isCustomLang, customLang, language]);

  // ── Execute code with optional stdin
  const executeCode = useCallback(async (stdin = '') => {
    const code = editableCode.trim();
    if (!code) {
      toast.error('No code to execute');
      return;
    }
    if (!canExecute) {
      toast.error('This language cannot be executed in the browser sandbox. Export or copy to run locally.');
      return;
    }

    const langForExec = isCustomLang ? customLang.trim().toLowerCase() : language;

    try {
      setExecuting(true);
      setExecutionOutput('Running...\n');
      setExecSuccess(null);
      setExecRuntime(null);
      setInputRequired(false);
      setLastStdin(stdin);

      const result = await noteService.runCode({
        code,
        language: langForExec,
        stdin,
        timeout: 15,
      });

      if (result.success) {
        const out = result.output?.trim() || '(no output)';
        setExecutionOutput(out);
        setExecSuccess(true);
        setExecRuntime(result.runtime_ms ?? null);
      } else {
        if (result.requires_input) {
          // Show input required state
          setInputRequired(true);
          setExecutionOutput('');
          setExecSuccess(null);
        } else {
          const errText = result.formatted_error || result.error || 'Execution failed';
          setExecutionOutput(errText);
          setExecSuccess(false);
        }
      }
    } catch (err) {
      console.error('Execution error:', err);
      setExecutionOutput(`Error: ${err.message || 'Unknown error'}`);
      setExecSuccess(false);
    } finally {
      setExecuting(false);
      setShowInputModal(false);
    }
  }, [editableCode, canExecute, isCustomLang, customLang, language]);

  // ── Handle Run Code button click
  const handleExecute = useCallback(() => {
    const code = editableCode.trim();
    if (!code) {
      toast.error('No code to execute');
      return;
    }
    if (!canExecute) {
      toast.error('This language cannot be executed in the browser sandbox. Export or copy to run locally.');
      return;
    }

    // Check if input is required
    const inputReqs = checkInputRequirements();
    
    if (inputReqs.requiresInput) {
      // Show input modal
      setInputHints(inputReqs.inputHints);
      setInputCount(inputReqs.inputCount);
      setShowInputModal(true);
    } else {
      // Execute directly without input
      executeCode('');
    }
  }, [editableCode, canExecute, checkInputRequirements, executeCode]);

  // ── Handle input modal submission
  const handleInputSubmit = useCallback((stdin) => {
    executeCode(stdin);
  }, [executeCode]);

  // ── Open input modal manually (for "provide input" button in output)
  const handleRequestInput = useCallback(() => {
    const inputReqs = checkInputRequirements();
    setInputHints(inputReqs.inputHints);
    setInputCount(Math.max(inputReqs.inputCount, 1));
    setShowInputModal(true);
  }, [checkInputRequirements]);

  // ── Export PDF
  const handleExportPDF = async () => {
    if (!editableCode) { toast.error('No code to export'); return; }
    try {
      setGenerating(true);
      const langLabel = isCustomLang ? customLang : (langMeta?.label || language);
      // Include execution output in PDF if available
      exportCodeToPDF(
        editableCode, 
        `code_${topic.replace(/\s+/g, '_')}.pdf`, 
        langLabel, 
        { Topic: topic },
        executionOutput,  // Pass execution output
        execSuccess       // Pass execution status
      );
      toast.success('PDF exported successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to export PDF');
    } finally {
      setTimeout(() => setGenerating(false), 600);
    }
  };

  // ── Upload to Google Drive
  const handleUploadDrive = async () => {
    if (!historyId) { toast.error('Generate code first before uploading'); return; }
    try {
      setGenerating(true);
      const langLabel = isCustomLang ? customLang : (langMeta?.label || language);
      const filename = `code_${topic.replace(/\s+/g, '_')}.pdf`;
      // Include execution output in PDF if available
      const { blob, filename: name } = await exportCodeToPDFBlob(
        editableCode, 
        filename, 
        langLabel, 
        { Topic: topic },
        executionOutput,  // Pass execution output
        execSuccess       // Pass execution status
      );
      const file   = new File([blob], name, { type: 'application/pdf' });
      const result = await noteService.uploadAIHistoryPdfToDrive(historyId, file, name);
      if (result?.success) toast.success('Uploaded to Google Drive!');
      else if (result?.needs_auth) toast.error('Connect Google Drive first');
      else toast.error(result?.error || 'Upload failed');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setGenerating(false);
    }
  };

  // ── Reset
  const handleReset = () => {
    setGeneratedCode('');
    setEditableCode('');
    setExecutionOutput('');
    setExecSuccess(null);
    setExecRuntime(null);
    setHistoryId(null);
    setGenerating(false);
    setExecuting(false);
    setInputRequired(false);
    setLastStdin('');
    setShowInputModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Clear output
  const handleClearOutput = useCallback(() => {
    setExecutionOutput('');
    setExecSuccess(null);
    setExecRuntime(null);
    setInputRequired(false);
    setLastStdin('');
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30">
      <Helmet>
        <title>Generate &amp; Execute Code — AI Tools | NoteAssist AI</title>
        <meta name="description" content="Generate code in 25+ programming languages using AI. Edit in a VS Code-style Monaco editor and execute instantly." />
      </Helmet>

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 h-14">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100">
                <Code size={15} className="text-orange-600" />
              </span>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">
                Code Generator
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-full text-xs text-orange-600 font-medium">
                <Zap size={10} /> 25+ Languages
              </span>
            </div>
            <nav className="flex items-center gap-1.5 overflow-x-auto flex-1 justify-end" style={{ scrollbarWidth: 'none' }}>
              <NavPill onClick={() => navigate('/ai-tools/generate')}  icon={Sparkles}  label="Generate"   />
              <NavPill onClick={() => navigate('/ai-tools/improve')}   icon={Wand2}     label="Improve"    />
              <NavPill onClick={() => navigate('/ai-tools/summarize')} icon={AlignLeft}  label="Summarize"  />
              <NavPill onClick={() => navigate('/ai-tools')}           icon={ArrowLeft}  label="Back" variant="back" />
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">

        {/* ── Input card ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-7 space-y-5">

          {/* Topic input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
              <span>💡</span> Code Topic or Requirement
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !generating && handleGenerate()}
              placeholder="e.g., 'Binary search tree with insert and delete', 'REST API client class'…"
              disabled={generating}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Language + Custom input row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Language selector */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                <Languages size={14} /> Programming Language
              </label>
              <LanguageSelect value={language} onChange={handleLanguageChange} disabled={generating} />
            </div>

            {/* Custom language field — shown when "Other…" is selected */}
            {isCustomLang ? (
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <Code size={14} /> Specify Language
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customLang}
                    onChange={e => handleCustomLangChange(e.target.value)}
                    placeholder="e.g., Haskell, Elixir, Dart…"
                    disabled={generating}
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none transition-all disabled:bg-gray-50 ${
                      customLangError
                        ? 'border-red-400 bg-red-50 focus:ring-red-100 focus:border-red-500'
                        : customLangValid
                          ? 'border-emerald-400 bg-emerald-50 focus:ring-emerald-100 focus:border-emerald-500'
                          : 'border-gray-200 focus:border-orange-500 focus:ring-orange-100'
                    }`}
                  />
                  {customLangValid && (
                    <CheckCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  )}
                  {customLangError && (
                    <XCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />
                  )}
                </div>
                {customLangError && (
                  <p className="flex items-center gap-1 mt-1.5 text-xs text-red-600">
                    <AlertCircle size={11} /> {customLangError}
                  </p>
                )}
                {customLangValid && (
                  <p className="flex items-center gap-1 mt-1.5 text-xs text-emerald-600">
                    <CheckCircle size={11} /> Language accepted!
                  </p>
                )}
                {!customLangError && !customLangValid && customLang && (
                  <p className="mt-1.5 text-xs text-gray-500">Validating…</p>
                )}
              </div>
            ) : (
              /* Level selector — shown when a standard language is selected */
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <span>🎯</span> Complexity Level
                </label>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  disabled={generating}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-white disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none"
                  style={{
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '16px',
                    paddingRight: '36px',
                  }}
                >
                  {LEVELS.map(l => (
                    <option key={l.value} value={l.value}>{l.icon} {l.label} — {l.desc}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Level selector when "Other" is active (third column) */}
            {isCustomLang && (
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <span>🎯</span> Complexity Level
                </label>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  disabled={generating}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-white disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none"
                  style={{
                    backgroundSize: '16px',
                    paddingRight: '36px',
                  }}
                >
                  {LEVELS.map(l => (
                    <option key={l.value} value={l.value}>{l.icon} {l.label} — {l.desc}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !topic.trim() || (isCustomLang && !customLangValid)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 active:scale-[.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none text-sm"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> Generating…</>
            ) : (
              <><Code size={16} /> Generate Code</>
            )}
          </button>
        </div>

        {/* ── VS Code–like Editor + Terminal (Always Visible) ──────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">

          {/* Monaco Editor Panel - Using Reusable CodeEditor Component */}
          <CodeEditor
            ref={editorRef}
            code={editableCode}
            onChange={setEditableCode}
            language={monacoLanguage}
            fileName={isCustomLang 
              ? (customLangValid ? `${customLang.toLowerCase()}` : 'untitled') 
              : 'main'}
            fileExtension={langMeta?.ext || '.txt'}
            languageLabel={isCustomLang ? (customLangValid ? customLang : '—') : (langMeta?.label || '')}
            minHeight={420}
          />

          {/* Terminal / Output Panel - Using Reusable CodeExecutionOutput Component */}
          <CodeExecutionOutput
            output={executionOutput}
            isExecuting={executing}
            execSuccess={execSuccess}
            execRuntime={execRuntime}
            onClear={handleClearOutput}
            canExecute={canExecute}
            languageLabel={!canExecute && !isCustomLang ? langMeta?.label : ''}
            stdinProvided={lastStdin}
            minHeight={420}
            showInputRequired={inputRequired}
            onRequestInput={handleRequestInput}
          />
        </div>

        {/* ── Action buttons (Always Visible) ───────────────────────── */}
        <div className="flex flex-wrap gap-3">
          {canExecute && (
            <>
              <button
                onClick={handleExecute}
                disabled={executing || !editableCode.trim()}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/25 active:scale-[.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {executing ? <><Loader2 size={15} className="animate-spin" /> Running…</> : <><Play size={15} /> Run Code</>}
              </button>

              <button
                onClick={handleRequestInput}
                disabled={executing || !editableCode.trim()}
                className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 active:scale-[.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title="Run code with custom input values"
              >
                <Keyboard size={15} /> Run with Input
              </button>
            </>
          )}

          <button
            onClick={handleExportPDF}
            disabled={generating || !editableCode.trim()}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Download size={15} /> Export PDF
          </button>

          <button
            onClick={handleUploadDrive}
            disabled={generating || !historyId}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 active:scale-[.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Upload size={15} /> Upload to Drive
          </button>

          {(generatedCode || editableCode) && (
            <button
              onClick={handleReset}
              className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-3 border-2 border-orange-300 text-orange-700 font-semibold rounded-xl hover:bg-orange-50 active:scale-[.99] transition-all duration-200 text-sm"
            >
              <RotateCcw size={15} /> New
            </button>
          )}
        </div>

        {/* ── Info banner ──────────────────────────────────────────── */}
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Info size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> You can write your own code in the editor above or use the generator.
            Click <strong>Run Code</strong> to execute directly, or <strong>Run with Input</strong> if your code requires user input.
            Changes are not auto-saved — export or save to a note to keep them.
          </p>
        </div>

      </div>

      {/* ── Input Modal for stdin ─────────────────────────────────── */}
      <CodeInputModal
        isOpen={showInputModal}
        onClose={() => setShowInputModal(false)}
        onSubmit={handleInputSubmit}
        inputHints={inputHints}
        inputCount={inputCount}
        isExecuting={executing}
        language={isCustomLang ? customLang : langMeta?.label}
      />
    </div>
  );
};

export default AIToolsGenerateCodePage;