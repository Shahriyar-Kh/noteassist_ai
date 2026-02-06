// FILE: src/pages/AIToolsGenerateCodePage.jsx
// Generate and Execute Code - With code runner like VS Code
// ============================================================================

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code, Play, Download, Upload, Loader2, AlertCircle, CheckCircle,
  Copy, ArrowLeft, Home, Terminal, RotateCcw
} from 'lucide-react';
import { noteService } from '@/services/note.service';
import { exportCodeToPDF } from '@/utils/pdfExport';
import { toast } from 'react-hot-toast';

const AIToolsGenerateCodePage = () => {
  const navigate = useNavigate();
  const outputRef = useRef(null);

  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('python');
  const [level, setLevel] = useState('beginner');
  const [generatedCode, setGeneratedCode] = useState('');
  const [executionOutput, setExecutionOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [historyId, setHistoryId] = useState(null);
  const [editableCode, setEditableCode] = useState('');

  const languages = [
    { value: 'python', label: 'Python', ext: '.py' },
    { value: 'javascript', label: 'JavaScript', ext: '.js' },
    { value: 'java', label: 'Java', ext: '.java' },
    { value: 'cpp', label: 'C++', ext: '.cpp' },
    { value: 'csharp', label: 'C#', ext: '.cs' },
    { value: 'go', label: 'Go', ext: '.go' },
    { value: 'rust', label: 'Rust', ext: '.rs' },
    { value: 'sql', label: 'SQL', ext: '.sql' }
  ];

  const levels = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  const generateCode = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a code topic or requirement');
      return;
    }

    try {
      setLoading(true);
      const result = await noteService.aiToolGenerateCode({
        title: topic,
        language,
        level,
      });

      setGeneratedCode(result.generated_content);
      setEditableCode(result.generated_content);
      setHistoryId(result.history_id);
      setExecutionOutput('');
      toast.success('Code generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  const executeCode = async () => {
    if (!editableCode.trim()) {
      toast.error('No code to execute');
      return;
    }

    try {
      setExecuting(true);
      setExecutionOutput('Executing code...\n');

      const result = await noteService.executeCode({
        code: editableCode,
        language,
      });

      if (result.success) {
        setExecutionOutput(result.output || 'Code executed successfully!');
      } else {
        setExecutionOutput(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Execution error:', error);
      setExecutionOutput(`Error: ${error.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const exportToPDFHandler = async () => {
    if (!generatedCode) {
      toast.error('No code to export');
      return;
    }

    try {
      exportCodeToPDF(
        editableCode,
        `code_${topic.replace(/\s+/g, '_')}.pdf`,
        language,
        { 'Topic': topic }
      );
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(error.message || 'Failed to export PDF');
    }
  };

  const uploadToGoogleDrive = async () => {
    if (!historyId) {
      toast.error('No code to upload');
      return;
    }

    try {
      setLoading(true);
      await noteService.exportAIHistoryToDrive(historyId);
      toast.success('Uploaded to Google Drive successfully!');
    } catch (error) {
      console.error('Google Drive upload error:', error);
      toast.error(error.message || 'Failed to upload to Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editableCode);
    toast.success('Code copied to clipboard!');
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
    toast.success('Code downloaded!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/ai-tools')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to AI Tools"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Home"
              >
                <Home className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Code className="w-6 h-6 text-orange-600" />
                  Generate & Execute Code
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Input Section */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Code Topic or Requirement
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Describe what code you want... (e.g., 'Fibonacci function', 'Web scraper')"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                disabled={loading}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Language Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Programming Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  disabled={loading}
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Complexity Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  disabled={loading}
                >
                  {levels.map((lv) => (
                    <option key={lv.value} value={lv.value}>
                      {lv.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Generate Button */}
              <div className="flex items-end">
                <button
                  onClick={generateCode}
                  disabled={loading || !topic.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Code className="w-5 h-5" />
                      Generate Code
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Code Editor Section */}
          {generatedCode && (
            <div className="grid lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Code Editor */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    <span className="font-semibold">Code Editor</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                      title="Copy code"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={downloadCode}
                      className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                      title="Download code"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={editableCode}
                  onChange={(e) => setEditableCode(e.target.value)}
                  className="flex-1 px-6 py-4 font-mono text-sm bg-gray-50 border-0 resize-none focus:ring-0 focus:border-0 outline-none"
                  style={{ minHeight: '400px' }}
                />
              </div>

              {/* Output Terminal */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    <span className="font-semibold">Execution Output</span>
                  </div>
                  <button
                    onClick={() => setExecutionOutput('')}
                    className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                    title="Clear output"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                <div
                  ref={outputRef}
                  className="flex-1 px-6 py-4 font-mono text-sm bg-gray-900 text-green-400 overflow-y-auto"
                  style={{ minHeight: '400px', maxHeight: '500px' }}
                >
                  <pre className="whitespace-pre-wrap break-words">
                    {executionOutput || 'Output will appear here...'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Execution & Export Buttons */}
          {generatedCode && (
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={executeCode}
                disabled={executing || !editableCode.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {executing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Run Code
                  </>
                )}
              </button>
              <button
                onClick={exportToPDFHandler}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                Export as PDF
              </button>
              <button
                onClick={uploadToGoogleDrive}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                <Upload className="w-5 h-5" />
                Upload to Drive
              </button>
            </div>
          )}

          {generatedCode && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Note:</strong> You can edit the code in the editor. Click "Run Code" to execute it in the terminal. This content is not saved to your notes unless you export or upload it.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIToolsGenerateCodePage;
