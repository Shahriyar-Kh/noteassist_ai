// FILE: src/components/code/CodeExecutionOutput.jsx
// ============================================================================
// Terminal-like output panel for code execution results
// ============================================================================

import { useRef, useEffect } from 'react';
import { Terminal, Loader2, RotateCcw, CheckCircle, XCircle, Clock, Info, Keyboard } from 'lucide-react';

// ─── StatusBadge Component ──────────────────────────────────────────────────

export const StatusBadge = ({ success, runtimeMs }) => {
  if (success === null) return null;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
    }`}>
      {success ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {success ? 'Execution OK' : 'Execution Failed'}
      {success && runtimeMs != null && (
        <span className="flex items-center gap-0.5 text-emerald-500 font-normal ml-1">
          <Clock size={10} />{runtimeMs}ms
        </span>
      )}
    </div>
  );
};

// ─── CodeExecutionOutput Component ──────────────────────────────────────────

const CodeExecutionOutput = ({
  output = '',
  isExecuting = false,
  execSuccess = null,
  execRuntime = null,
  onClear,
  canExecute = true,
  languageLabel = '',
  stdinProvided = '',
  minHeight = 420,
  showInputRequired = false,
  onRequestInput,
  className = '',
}) => {
  const outputEndRef = useRef(null);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  return (
    <div 
      className={`rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col ${className}`}
      style={{ minHeight }}
    >
      {/* ── Terminal Toolbar ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700/60">
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
            <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
            <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
          </div>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Terminal size={11} /> Terminal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge success={execSuccess} runtimeMs={execRuntime} />
          {onClear && (
            <button 
              onClick={onClear} 
              title="Clear output" 
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-all"
            >
              <RotateCcw size={13} className="text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* ── Output Area ─────────────────────────────────────────── */}
      <div
        className="flex-1 px-5 py-4 bg-gray-950 overflow-y-auto font-mono text-sm leading-relaxed"
        style={{ minHeight: minHeight - 44 - 32 }}
      >
        {/* Loading state */}
        {isExecuting && !output && (
          <div className="flex items-center gap-2 text-yellow-400">
            <Loader2 size={14} className="animate-spin" />
            <span>Executing...</span>
          </div>
        )}

        {/* Stdin summary if input was provided */}
        {stdinProvided && output && (
          <div className="mb-3 pb-3 border-b border-gray-800">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Keyboard size={11} />
              Input provided:
            </div>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap">
              {stdinProvided.split('\n').map((line, i) => (
                <span key={i} className="block">
                  <span className="text-gray-600">stdin[{i}]:</span> {line || '(empty)'}
                </span>
              ))}
            </pre>
          </div>
        )}

        {/* Output content */}
        {output ? (
          <pre
            className={`whitespace-pre-wrap break-words m-0 ${
              execSuccess === false ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {output}
          </pre>
        ) : !isExecuting ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30 select-none">
            <Terminal size={32} className="text-gray-500" />
            <span className="text-xs text-gray-500 text-center">
              {canExecute 
                ? 'Click "Run Code" to execute' 
                : 'This language cannot be executed in the sandbox'}
            </span>
          </div>
        ) : null}

        {/* Input required message with action button */}
        {showInputRequired && !isExecuting && (
          <div className="mt-4 p-4 bg-amber-900/20 border border-amber-700/40 rounded-lg">
            <div className="flex items-start gap-3">
              <Keyboard size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-400 font-medium text-sm mb-1">
                  This code requires user input
                </p>
                <p className="text-amber-500/80 text-xs mb-3">
                  Your code uses input functions (like input(), scanf, cin, etc.). 
                  Click the button below to provide input values.
                </p>
                {onRequestInput && (
                  <button
                    onClick={onRequestInput}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-500 transition-colors"
                  >
                    <Keyboard size={14} />
                    Provide Input
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={outputEndRef} />
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      {canExecute && (
        <div className="px-4 py-1.5 bg-gray-800 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            Runs in a sandboxed container via Piston API
          </p>
        </div>
      )}
      {!canExecute && languageLabel && (
        <div className="px-4 py-2 bg-amber-900/30 border-t border-amber-700/40">
          <p className="flex items-center gap-1.5 text-xs text-amber-400">
            <Info size={11} /> {languageLabel} cannot be executed in-browser — download or copy to run locally
          </p>
        </div>
      )}
    </div>
  );
};

export default CodeExecutionOutput;
