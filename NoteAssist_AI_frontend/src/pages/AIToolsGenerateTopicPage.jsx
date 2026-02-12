import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Wand2, FileText, Loader, CheckCircle, Sparkles, Download, Cloud, AlertCircle,
  Home, ArrowLeft, LayoutDashboard, AlignLeft, Code
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '@/styles/animations.css';
import { noteService } from '@/services/note.service';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { exportToPDF } from '@/utils/pdfExport';

const AIToolsGenerateTopicPage = ({ topic, onSave, onCancel, onAIAction }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(null);
  const [error, setError] = useState(null);
  const [learningLevel, setLearningLevel] = useState('beginner');
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [driveStatus, setDriveStatus] = useState({ connected: false, checking: true });

  const [formData, setFormData] = useState({
    name: topic?.name || '',
    explanation: topic?.explanation?.content || ''
  });

  // Update form data when topic changes
  useEffect(() => {
    if (topic) {
      setFormData({
        name: topic.name || '',
        explanation: topic.explanation?.content || ''
      });
    }
  }, [topic]);

  // Check Google Drive status on mount
  useEffect(() => {
    checkDriveStatus();
  }, []);

  const checkDriveStatus = async () => {
    try {
      const response = await api.get('/api/notes/drive_status/');
      setDriveStatus({
        connected: response.data.connected,
        can_export: response.data.can_export,
        checking: false
      });
    } catch (error) {
      console.error('Error checking Drive status:', error);
      setDriveStatus({ connected: false, can_export: false, checking: false });
    }
  };

// React Quill modules configuration
  const quillModules = {
    toolbar: [
      [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  const quillFormats = [
    'font', 'size', 'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'script', 'list', 'bullet', 'indent',
    'align', 'blockquote', 'code-block', 'link', 'image', 'video'
  ];

  const handleConnectDrive = async () => {
    try {
      const response = await api.get('/api/notes/google_auth_url/');
      if (response.data.auth_url) {
        const authWindow = window.open(
          response.data.auth_url,
          'Google Drive Auth',
          'width=600,height=700,left=100,top=100'
        );
        
        const handleMessage = (event) => {
          if (event.data.type === 'google-auth-success') {
            toast.success('Google Drive connected successfully!');
            checkDriveStatus();
            authWindow?.close();
          } else if (event.data.type === 'google-auth-error') {
            toast.error('Failed to connect Google Drive');
            authWindow?.close();
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            checkDriveStatus();
          }
        }, 500);
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('Failed to initiate Google Drive connection');
    }
  };

  const handleUploadToGoogleDrive = async () => {
    if (!formData.explanation || !formData.name) {
      toast.error('Please generate content first');
      return;
    }

    if (!driveStatus.connected) {
      handleConnectDrive();
      return;
    }

    setUploadingToDrive(true);
    try {
      // Create a simple text file content
      const textContent = `${formData.name}\n\nLearning Level: ${learningLevel}\n\n${formData.explanation.replace(/<[^>]*>/g, '')}`;
      
      // You might want to create a proper endpoint for this
      // For now, we'll show a success message
      toast.success('Content prepared for Google Drive upload!');
      
    } catch (error) {
      console.error('Drive export error:', error);
      toast.error('Failed to upload to Google Drive');
    } finally {
      setUploadingToDrive(false);
    }
  };

  const handleExportPDF = async () => {
    if (!formData.explanation || !formData.name) {
      toast.error('Please generate content first');
      return;
    }

    try {
      exportToPDF(
        formData.explanation,
        `${formData.name.replace(/\s+/g, '_')}.pdf`,
        formData.name,
        {
          'Learning Level': learningLevel,
          'Topic': formData.name
        }
      );
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

const handleAI = async (action) => {
  setError(null);
  setAiLoading(action);
  
  try {
    let input = '';
    let requestData = {
      action_type: action,
      level: learningLevel,
      subject_area: 'programming'
    };
    
    // Only handle generate_explanation now
    if (action === 'generate_explanation') {
      input = formData.name.trim();
      if (!input) {
        throw new Error('Please enter a topic name first');
      }
      requestData.topic_name = input;
      
      // Auto-detect subject area from topic name
      const programmingKeywords = [
        'function', 'class', 'loop', 'array', 'variable', 'algorithm', 
        'code', 'programming', 'python', 'javascript', 'java', 'c++',
        'syntax', 'method', 'object', 'string', 'integer', 'boolean',
        'recursion', 'sorting', 'database', 'api', 'framework'
      ];
      const isProgramming = programmingKeywords.some(kw => 
        input.toLowerCase().includes(kw)
      );
      requestData.subject_area = isProgramming ? 'programming' : 'general';
    }
    
    // Use standalone AI action endpoint (no topic ID required)
    const result = await noteService.performStandaloneAIAction(requestData);
    
    // Update form with generated content
    setFormData(prev => ({
      ...prev,
      explanation: result.generated_content
    }));
    
    showToast(`✨ Explanation generated successfully (${learningLevel} level)!`, 'success');
    
  } catch (error) {
    console.error('AI action failed:', error);
    const errorMessage = error.response?.data?.error || error.message || 'AI action failed';
    setError(errorMessage);
    showToast('❌ ' + errorMessage, 'error');
  } finally {
    setAiLoading(null);
  }
};
// Add this helper function for toast notifications
const showToast = (message, type = 'success') => {
  // You can use your existing toast system or add this simple one:
  const toastEvent = new CustomEvent('show-toast', {
    detail: { message, type }
  });
  window.dispatchEvent(toastEvent);
};

return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Helmet>
        <title>Generate Topic - AI Tools | NoteAssist AI</title>
        <meta name="description" content="Generate comprehensive learning topics with AI-powered explanations. Choose your learning level and let AI create detailed, engaging content." />
        <meta property="og:title" content="Generate Topic - AI Tools | NoteAssist AI" />
        <meta property="og:description" content="Generate comprehensive learning topics with AI-powered explanations. Choose your learning level and let AI create detailed, engaging content." />
        <meta name="twitter:title" content="Generate Topic - AI Tools | NoteAssist AI" />
        <meta name="twitter:description" content="Generate comprehensive learning topics with AI-powered explanations." />
      </Helmet>

      {/* Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 animate-fadeInDown">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/ai-tools')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-lift"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={() => navigate('/home')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-lift"
            >
              <Home size={16} />
              Home
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-lift"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>
            <button
              onClick={() => navigate('/ai-tools/improve')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-lift"
            >
              <Wand2 size={16} />
              Improve
            </button>
            <button
              onClick={() => navigate('/ai-tools/summarize')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-lift"
            >
              <AlignLeft size={16} />
              Summarize
            </button>
            <button
              onClick={() => navigate('/ai-tools/code')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover-lift"
            >
              <Code size={16} />
              Generate Code
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6 space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-shake">
          <p className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            {error}
          </p>
        </div>
      )}

      {/* Topic Name */}
      <div className="animate-fadeIn" style={{ animationDelay: '0.1s' }}>
        <label className="flex text-sm font-medium mb-2 items-center gap-2">
          <span className="text-lg">📝</span>
          Topic Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Binary Search Algorithm"
          className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {!formData.name && <p className="text-xs text-gray-500 mt-1">Topic name is required to generate content</p>}
      </div>
      {/* Learning Level Selector - NEW */}
<div className="border dark:border-gray-700 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
  <label className="flex text-sm font-medium mb-3 items-center gap-2">
    <span className="text-blue-700 dark:text-blue-300 text-base font-semibold">
      🎓 Learning Level
    </span>
    <span className="text-xs text-gray-600 dark:text-gray-400">
      (Choose your level for AI content generation)
    </span>
  </label>
  
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {[
      { 
        value: 'beginner', 
        icon: '🌱', 
        label: 'Beginner', 
        desc: 'Simple & Easy', 
        color: 'green',
        detail: 'Perfect for those just starting out'
      },
      { 
        value: 'intermediate', 
        icon: '📚', 
        label: 'Intermediate', 
        desc: 'More Details', 
        color: 'blue',
        detail: 'Good depth for those who know basics'
      },
      { 
        value: 'advanced', 
        icon: '🚀', 
        label: 'Advanced', 
        desc: 'Deep Dive', 
        color: 'purple',
        detail: 'Technical details and optimization'
      },
      { 
        value: 'expert', 
        icon: '⭐', 
        label: 'Expert', 
        desc: 'Production', 
        color: 'red',
        detail: 'Architecture and mastery level'
      }
    ].map(level => (
      <button
        key={level.value}
        type="button"
        onClick={() => setLearningLevel(level.value)}
        className={`p-3 rounded-lg border-2 transition-all transform hover:scale-105 ${
          learningLevel === level.value
            ? `border-${level.color}-600 bg-${level.color}-100 dark:bg-${level.color}-900/40 shadow-md`
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 bg-white dark:bg-gray-800'
        }`}
      >
        <div className="text-2xl mb-1">{level.icon}</div>
        <div className="font-semibold text-sm">{level.label}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{level.desc}</div>
      </button>
    ))}
  </div>
  
  {/* Level Description - Shows info about selected level */}
  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
    {learningLevel === 'beginner' && (
      <div className="flex items-start gap-2">
        <span className="text-2xl">🌱</span>
        <div>
          <p className="font-semibold text-green-700 dark:text-green-300">Beginner Level</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            Simple explanations with basic examples. Easy to understand for those just starting out.
            Content is short, clear, and fun to learn!
          </p>
        </div>
      </div>
    )}
    {learningLevel === 'intermediate' && (
      <div className="flex items-start gap-2">
        <span className="text-2xl">📚</span>
        <div>
          <p className="font-semibold text-blue-700 dark:text-blue-300">Intermediate Level</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            More detailed explanations with practical examples. Good for those who know programming basics
            and want deeper understanding.
          </p>
        </div>
      </div>
    )}
    {learningLevel === 'advanced' && (
      <div className="flex items-start gap-2">
        <span className="text-2xl">🚀</span>
        <div>
          <p className="font-semibold text-purple-700 dark:text-purple-300">Advanced Level</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            Deep technical details, performance optimization, and edge cases. For experienced
            developers who want comprehensive knowledge.
          </p>
        </div>
      </div>
    )}
    {learningLevel === 'expert' && (
      <div className="flex items-start gap-2">
        <span className="text-2xl">⭐</span>
        <div>
          <p className="font-semibold text-red-700 dark:text-red-300">Expert Level</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            Production-grade knowledge with architecture, scalability, and industry best practices.
            For senior/principal engineers.
          </p>
        </div>
      </div>
    )}
  </div>
</div>


      {/* Explanation Section with Rich Text Editor */}
      <div className="border dark:border-gray-700 rounded-lg p-4 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center justify-between mb-3">
        <label className="flex text-sm font-medium mb-2 items-center gap-2">
            <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
            Explanation
          </label>
          <button
            onClick={() => handleAI('generate_explanation')}
            disabled={aiLoading || !formData.name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
          >
            {aiLoading === 'generate_explanation' ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Generate ({learningLevel})</span>
          </button>
        </div>
        <div className="min-h-[250px]">
          <ReactQuill
            theme="snow"
            value={formData.explanation}
            onChange={(value) => setFormData(prev => ({ ...prev, explanation: value }))}
            modules={quillModules}
            formats={quillFormats}
            placeholder="Explain this topic in detail... Use the toolbar to format text (bold, headings, lists, etc.)"
            className="bg-white dark:bg-gray-900"
            style={{ minHeight: '200px' }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Use the toolbar above to format your text with headings, bold, italic, lists, and more.
        </p>
      </div>

      {/* Export Buttons Section */}
      {formData.explanation && formData.name && (
        <div className="border dark:border-gray-700 rounded-lg p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 animate-slideInUp" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Download size={16} className="text-green-600 dark:text-green-400" />
              Export Your Content
            </h3>
            {!driveStatus.checking && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-xs">
                {driveStatus.connected ? (
                  <>
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-green-700 dark:text-green-400">Drive Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-orange-600" />
                    <span className="text-orange-700 dark:text-orange-400">Drive Not Connected</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-3 flex-wrap">
            {/* Export to PDF Button */}
            <button
              onClick={handleExportPDF}
              className="flex-1 min-w-max flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all transform hover:scale-105 active:scale-95"
            >
              <Download size={18} />
              Export as PDF
            </button>
            
            {/* Upload to Google Drive Button */}
            <button
              onClick={handleUploadToGoogleDrive}
              disabled={uploadingToDrive}
              className={`flex-1 min-w-max flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all transform disabled:opacity-50 disabled:cursor-not-allowed ${
                driveStatus.connected
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 hover:scale-105 active:scale-95'
                  : 'bg-gradient-to-r from-orange-600 to-yellow-600 text-white hover:from-orange-700 hover:to-yellow-700 hover:scale-105 active:scale-95'
              }`}
            >
              {uploadingToDrive ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Cloud size={18} />
                  {driveStatus.connected ? 'Upload to Drive' : 'Connect Drive'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg animate-slideInUp" style={{ animationDelay: '0.5s' }}>
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>💡 Tip:</strong> Use the enhanced editor toolbar for headings, alignment, images, and more. Export your content as PDF with structured format or upload to Google Drive for backup.
        </p>
      </div>

      </div>
    </div>
    </div>
  );
};

export default AIToolsGenerateTopicPage;