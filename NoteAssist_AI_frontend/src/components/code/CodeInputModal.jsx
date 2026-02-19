// FILE: src/components/code/CodeInputModal.jsx
// ============================================================================
// Modal for collecting stdin input for code execution
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Keyboard, Info, Plus, Trash2, Loader2 } from 'lucide-react';

/**
 * Detects common input patterns in code for various languages
 * Returns: { requiresInput: boolean, inputHints: string[], inputCount: number }
 */
export const detectInputRequirements = (code, language) => {
  if (!code || !code.trim()) {
    return { requiresInput: false, inputHints: [], inputCount: 0 };
  }

  const normalizedLang = language?.toLowerCase() || '';
  const inputPatterns = {
    // Python patterns
    python: [
      /input\s*\(/gi,
      /sys\.stdin\.read/gi,
      /raw_input\s*\(/gi,
    ],
    // JavaScript/Node patterns
    javascript: [
      /readline\s*\(/gi,
      /process\.stdin/gi,
      /require\s*\(\s*['"]readline['"]\s*\)/gi,
    ],
    // Java patterns
    java: [
      /Scanner\s*\(/gi,
      /BufferedReader/gi,
      /System\.in/gi,
      /nextInt\s*\(/gi,
      /nextLine\s*\(/gi,
      /nextDouble\s*\(/gi,
    ],
    // C/C++ patterns
    c: [
      /scanf\s*\(/gi,
      /cin\s*>>/gi,
      /getline\s*\(/gi,
      /gets\s*\(/gi,
      /fgets\s*\(/gi,
    ],
    cpp: [
      /scanf\s*\(/gi,
      /cin\s*>>/gi,
      /getline\s*\(/gi,
      /gets\s*\(/gi,
      /fgets\s*\(/gi,
    ],
    // C# patterns
    csharp: [
      /Console\.ReadLine\s*\(/gi,
      /Console\.Read\s*\(/gi,
    ],
    // Go patterns
    go: [
      /fmt\.Scan/gi,
      /bufio\.NewReader/gi,
      /os\.Stdin/gi,
    ],
    // Ruby patterns
    ruby: [
      /gets/gi,
      /STDIN\.read/gi,
      /readline/gi,
    ],
    // PHP patterns
    php: [
      /fgets\s*\(\s*STDIN/gi,
      /readline\s*\(/gi,
      /stream_get_line/gi,
    ],
    // Rust patterns
    rust: [
      /std::io::stdin/gi,
      /read_line\s*\(/gi,
    ],
    // Kotlin patterns
    kotlin: [
      /readLine\s*\(/gi,
      /Scanner\s*\(/gi,
    ],
    // Swift patterns
    swift: [
      /readLine\s*\(/gi,
    ],
    // Bash patterns
    bash: [
      /read\s+/gi,
      /\$1|\$2|\$3/g,
    ],
  };

  // Get patterns for the current language
  const patterns = inputPatterns[normalizedLang] || [];
  
  // Also check common patterns across all languages
  const commonPatterns = [
    /input\s*\(/gi,
    /stdin/gi,
  ];

  const allPatterns = [...patterns, ...commonPatterns];
  
  let inputCount = 0;
  const inputHints = new Set();

  // Check each pattern and count matches
  for (const pattern of allPatterns) {
    const matches = code.match(pattern) || [];
    inputCount += matches.length;
    
    // Extract hints from the code context
    if (matches.length > 0) {
      // Try to find input prompts
      const promptPatterns = [
        /input\s*\(\s*["']([^"']+)["']\s*\)/gi,
        /print\s*\(\s*["']([^"']+input[^"']*|[^"']*enter[^"']*)["']\s*\)/gi,
        /printf\s*\(\s*["']([^"']+)["']\s*\)/gi,
        /cout\s*<<\s*["']([^"']+)["']/gi,
        /Console\.WriteLine\s*\(\s*["']([^"']+)["']\s*\)/gi,
        /System\.out\.print(?:ln)?\s*\(\s*["']([^"']+)["']\s*\)/gi,
      ];

      for (const promptPattern of promptPatterns) {
        let match;
        while ((match = promptPattern.exec(code)) !== null) {
          const hint = match[1].trim();
          if (hint.length > 0 && hint.length < 100) {
            inputHints.add(hint);
          }
        }
      }
    }
  }

  return {
    requiresInput: inputCount > 0,
    inputHints: Array.from(inputHints).slice(0, 5), // Limit to 5 hints
    inputCount: Math.min(inputCount, 10), // Cap at 10 input fields
  };
};

// ─── CodeInputModal Component ───────────────────────────────────────────────

const CodeInputModal = ({
  isOpen,
  onClose,
  onSubmit,
  inputHints = [],
  inputCount = 1,
  isExecuting = false,
  language = '',
}) => {
  const [inputs, setInputs] = useState(['']);
  const firstInputRef = useRef(null);

  // Initialize inputs based on detected count
  useEffect(() => {
    if (isOpen) {
      const count = Math.max(inputCount, 1);
      const hints = inputHints.slice(0, count);
      // Pre-fill with empty strings, one for each detected input
      setInputs(new Array(count).fill(''));
      
      // Focus first input
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, inputCount, inputHints]);

  // Add a new input field
  const addInput = useCallback(() => {
    setInputs(prev => [...prev, '']);
  }, []);

  // Remove an input field
  const removeInput = useCallback((index) => {
    setInputs(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Update input value
  const updateInput = useCallback((index, value) => {
    setInputs(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  // Handle submit
  const handleSubmit = useCallback(() => {
    // Join inputs with newlines for stdin
    const stdinValue = inputs.join('\n');
    onSubmit(stdinValue);
  }, [inputs, onSubmit]);

  // Handle key press (Enter to submit if single input, Ctrl+Enter for multi)
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSubmit, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-scale-in"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Keyboard className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Code Input Required</h3>
              <p className="text-xs text-gray-500">
                This code requires user input to run
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info banner */}
        <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-5">
          <Info size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Enter the input values your code expects. Each field represents a separate line of input (stdin).
            {language && <span className="font-medium"> Language: {language}</span>}
          </p>
        </div>

        {/* Input hints from code analysis */}
        {inputHints.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-medium text-amber-800 mb-1">Detected input prompts:</p>
            <ul className="text-xs text-amber-700 space-y-0.5">
              {inputHints.map((hint, i) => (
                <li key={i} className="truncate">• {hint}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Input fields */}
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1 mb-5">
          {inputs.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono w-8 flex-shrink-0">
                #{index + 1}
              </span>
              <input
                ref={index === 0 ? firstInputRef : null}
                type="text"
                value={value}
                onChange={(e) => updateInput(index, e.target.value)}
                placeholder={inputHints[index] || `Input value ${index + 1}`}
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                disabled={isExecuting}
              />
              {inputs.length > 1 && (
                <button
                  onClick={() => removeInput(index)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove input"
                  disabled={isExecuting}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add input button */}
        <button
          onClick={addInput}
          disabled={isExecuting || inputs.length >= 20}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl text-sm hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-5"
        >
          <Plus size={14} />
          Add another input line
        </button>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isExecuting}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/25 active:scale-[.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isExecuting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play size={15} />
                Run with Input
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-5 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>

        {/* Keyboard shortcut hint */}
        <p className="mt-4 text-center text-xs text-gray-400">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">Ctrl + Enter</kbd> to run
        </p>
      </div>
    </div>
  );
};

export default CodeInputModal;
