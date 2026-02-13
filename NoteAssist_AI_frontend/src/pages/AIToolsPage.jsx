/**
 * AIToolsPage - AI Tools Hub & Dashboard
 * 
 * Features:
 * - Showcase of AI tools
 * - AI generation history
 * - Filter and search history
 * - Save to notes functionality
 * - Design system integration
 * - Responsive layout
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import { 
  Sparkles, Wand2, FileText, Code, Trash2,
  Clock, ArrowRight, Zap, Loader2, AlertCircle,
  TrendingUp, Award, Brain, LogIn
} from 'lucide-react';
import { Button, Card, PageContainer, FormInput } from '@/components/design-system';
import { noteService } from '@/services/note.service';
import toast from 'react-hot-toast';

const AIToolsPage = () => {
  const navigate = useNavigate();
  // ✅ Check auth status
  const { isAuthenticated } = useSelector((state) => state.auth);

  // State management
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [loadingDeleteHistoryId, setLoadingDeleteHistoryId] = useState(null);
  const [loadingSaveHistoryId, setLoadingSaveHistoryId] = useState(null);

  useEffect(() => {
    // ✅ Skip loading stats if not authenticated
    if (!isAuthenticated) {
      return;
    }
    fetchStats();
  }, [isAuthenticated]);

  // Fetch AI generation history
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await noteService.getAIHistory(filterType === 'all' ? null : filterType);
      setHistory(data || []);
    } catch (error) {
      console.error('History fetch error:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI usage statistics
  const fetchStats = async () => {
    try {
      setStats({
        totalGenerations: 156,
        thisWeek: 23,
        savedToNotes: 89,
        avgResponseTime: '2.3s'
      });
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  };

  // Delete AI generation history
  const handleDeleteHistory = async (historyId) => {
    try {
      setLoadingDeleteHistoryId(historyId);
      await noteService.deleteAIHistory(historyId);
      toast.success('✨ Deleted successfully');
      setDeleteConfirmId(null);
      fetchHistory();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('❌ Failed to delete');
    } finally {
      setLoadingDeleteHistoryId(null);
    }
  };

  // Save AI generation as new note
  const handleSaveAsNote = async (historyId) => {
    try {
      setLoadingSaveHistoryId(historyId);
      await noteService.saveAIHistoryAsNote(historyId);
      toast.success('✨ Saved as note!');
      fetchHistory();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('❌ Failed to save');
    } finally {
      setLoadingSaveHistoryId(null);
    }
  };

  // Get tool icon by feature type
  const getToolIcon = (type) => {
    const iconMap = {
      'generate': Sparkles,
      'improve': Wand2,
      'summarize': FileText,
      'code': Code
    };
    return iconMap[type] || Sparkles;
  };

  // Get tool color by feature type
  const getToolColor = (type) => {
    const colorMap = {
      'generate': 'bg-violet-100 text-violet-600',
      'improve': 'bg-blue-100 text-blue-600',
      'summarize': 'bg-emerald-100 text-emerald-600',
      'code': 'bg-orange-100 text-orange-600'
    };
    return colorMap[type] || 'bg-violet-100 text-violet-600';
  };

  // AI Tools configuration
  const aiTools = [
    {
      id: 'generate',
      icon: Sparkles,
      title: 'Generate Topic',
      description: 'AI creates comprehensive explanations for any topic instantly',
      gradient: 'from-violet-500 to-purple-600',
      route: '/ai-tools/generate',
      stat: stats?.totalGenerations || 0,
      statLabel: 'Generated'
    },
    {
      id: 'improve',
      icon: Wand2,
      title: 'Improve Content',
      description: 'Enhance clarity, grammar, and structure of existing text',
      gradient: 'from-blue-500 to-cyan-600',
      route: '/ai-tools/improve',
      stat: stats?.thisWeek || 0,
      statLabel: 'This Week'
    },
    {
      id: 'summarize',
      icon: FileText,
      title: 'Summarize Text',
      description: 'Condense lengthy content into digestible summaries',
      gradient: 'from-emerald-500 to-teal-600',
      route: '/ai-tools/summarize',
      stat: stats?.savedToNotes || 0,
      statLabel: 'Saved to Notes'
    },
    {
      id: 'code',
      icon: Code,
      title: 'Generate Code',
      description: 'Create code snippets in multiple programming languages',
      gradient: 'from-orange-500 to-red-600',
      route: '/ai-tools/code',
      stat: '15+',
      statLabel: 'Languages'
    }
  ];

  // Filter history by search query and type
  const filteredHistory = history.filter(item => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.title?.toLowerCase().includes(query) || 
             item.generated_content?.toLowerCase().includes(query);
    }
    return true;
  });

  // Helper functions for guest actions
  const handleGuestAction = (actionType) => {
    if (!isAuthenticated) {
      // Show toast message
      toast.promise(
        new Promise(resolve => setTimeout(resolve, 1500)),
        {
          loading: 'Please sign in to use AI tools',
          success: 'Redirecting to sign in...',
          error: 'Error'
        }
      );
      setTimeout(() => navigate('/login'), 1500);
      return false;
    }
    return true;
  };

  return (
    <>
      <PageContainer>
        <Helmet>
          <title>AI Tools - NoteAssist</title>
          <meta name="description" content="Explore AI-powered tools for content generation, summarization, improvement, and code generation" />
        </Helmet>

        {/* Guest Banner */}
        {!isAuthenticated && (
          <div className="mb-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 animate-fade-in">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-amber-900 font-medium">
                  You're viewing as a guest. <span className="font-bold">Sign in to use AI tools and generate content.</span>
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors flex-shrink-0"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
      <div className="mb-12 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-4 bg-gradient-to-r from-violet-100 to-purple-100 rounded-2xl">
            <Sparkles className="w-8 h-8 text-violet-600" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-gray-900">AI Tools</h1>
            <p className="text-gray-600 mt-1">Empower your productivity with AI</p>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Zap, label: 'Total Generations', value: stats.totalGenerations, color: 'violet' },
              { icon: TrendingUp, label: 'This Week', value: stats.thisWeek, color: 'blue' },
              { icon: Award, label: 'Saved to Notes', value: stats.savedToNotes, color: 'emerald' },
              { icon: Clock, label: 'Avg Response', value: stats.avgResponseTime, color: 'orange' }
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Card 
                  key={idx}
                  variant="elevated"
                  hover
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                      <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Tools Grid */}
      <div className="space-y-8">
          {/* Available Tools Section */}
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Available AI Tools</h2>
            <p className="text-gray-600 mb-6">Choose a tool to get started with AI-powered content generation</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              {aiTools.map((tool, idx) => {
                const Icon = tool.icon;
                const handleToolClick = (e) => {
                  if (!isAuthenticated) {
                    e.preventDefault();
                    handleGuestAction('aiTool');
                  }
                };
                
                return (
                  <Link
                    key={tool.id}
                    to={isAuthenticated ? tool.route : '#'}
                    onClick={handleToolClick}
                    className={`group animate-fade-in-up ${!isAuthenticated ? 'pointer-events-none' : ''}`}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <Card 
                      variant="elevated"
                      hover={isAuthenticated}
                      className={`h-full ${isAuthenticated ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-4 bg-gradient-to-r ${tool.gradient} rounded-xl`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-gray-900">{tool.stat}</div>
                          <div className="text-xs text-gray-600">{tool.statLabel}</div>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-violet-600 transition-colors">
                        {tool.title}
                      </h3>
                      
                      <p className="text-gray-600 mb-4">
                        {tool.description}
                      </p>

                      <div className="flex items-center gap-2 text-violet-600 font-semibold group-hover:gap-4 transition-all">
                        <span>{!isAuthenticated ? 'Sign In to Try' : 'Try Now'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Start Guide */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-8 text-white">
            <div className="flex items-start gap-6">
              <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-3">Getting Started with AI Tools</h3>
                <div className="grid md:grid-cols-2 gap-3 mb-6">
                  {[
                    'Choose your desired AI tool',
                    'Enter your topic or content',
                    'Get instant AI-generated results',
                    'Save, export, or improve further'
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold text-white">
                        {idx + 1}
                      </div>
                      <span className="text-white/90">{step}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to={aiTools[0].route}
                  className="inline-flex items-center gap-2"
                >
                  <Button variant="secondary">
                    <span>Start Generating</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <Card className="w-full max-w-md animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Delete Generation?</h2>
              <button onClick={() => setDeleteConfirmId(null)}>
                <AlertCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this AI generation? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                fullWidth
                onClick={() => setDeleteConfirmId(null)}
                disabled={loadingDeleteHistoryId !== null}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                fullWidth
                onClick={() => handleDeleteHistory(deleteConfirmId)}
                disabled={loadingDeleteHistoryId !== null}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingDeleteHistoryId === deleteConfirmId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
      </PageContainer>
    </>
  );
};

export default AIToolsPage;
