// FILE: src/pages/AIToolsPage.jsx
// AI Tools Hub - Main Dashboard for AI Features
// ============================================================================

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Sparkles, Wand2, FileText, Code, History, Download, Trash2,
  Clock, CheckCircle, ArrowRight, Zap, Brain, Loader2, AlertCircle,
  Filter, Search, Tag, Calendar, TrendingUp, Award, Target, Home, LayoutDashboard
} from 'lucide-react';
import { noteService } from '@/services/note.service';
import { toast } from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const AIToolsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
    fetchStats();
  }, [activeTab, filterType]);

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

  const fetchStats = async () => {
    try {
      // Mock stats - replace with real API call
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

  const handleDeleteHistory = async (historyId) => {
    if (!window.confirm('Delete this AI generation?')) return;

    try {
      await noteService.deleteAIHistory(historyId);
      toast.success('Deleted successfully');
      fetchHistory();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete');
    }
  };

  const handleSaveAsNote = async (historyId) => {
    try {
      await noteService.saveAIHistoryAsNote(historyId);
      toast.success('Saved as note!');
      fetchHistory();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save');
    }
  };

  const aiTools = [
    {
      id: 'generate',
      icon: Sparkles,
      title: 'Generate Topic',
      description: 'AI creates comprehensive explanations for any topic instantly',
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-500/10 to-purple-500/10',
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
      bgGradient: 'from-blue-500/10 to-cyan-500/10',
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
      bgGradient: 'from-emerald-500/10 to-teal-500/10',
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
      bgGradient: 'from-orange-500/10 to-red-500/10',
      route: '/ai-tools/code',
      stat: '15+',
      statLabel: 'Languages'
    }
  ];

  const filteredHistory = history.filter(item => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.title?.toLowerCase().includes(query) || 
             item.generated_content?.toLowerCase().includes(query);
    }
    return true;
  });

  const getToolIcon = (type) => {
    switch(type) {
      case 'generate': return Sparkles;
      case 'improve': return Wand2;
      case 'summarize': return FileText;
      case 'code': return Code;
      default: return Brain;
    }
  };

  const getToolColor = (type) => {
    switch(type) {
      case 'generate': return 'text-violet-600 bg-violet-100';
      case 'improve': return 'text-blue-600 bg-blue-100';
      case 'summarize': return 'text-emerald-600 bg-emerald-100';
      case 'code': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col">
      <Navbar hideLinks={['ai-tools']} />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-16 z-30">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                    AI Tools Hub
                  </h1>
                  <p className="text-sm text-gray-600">Supercharge your learning with AI</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="?tab=history"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <History className="w-4 h-4" />
                History
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* AI Tools Overview */}
        {activeTab !== 'history' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: Zap, label: 'Total Generations', value: stats?.totalGenerations || 0, color: 'violet' },
                { icon: TrendingUp, label: 'This Week', value: stats?.thisWeek || 0, color: 'blue' },
                { icon: Target, label: 'Saved to Notes', value: stats?.savedToNotes || 0, color: 'emerald' },
                { icon: Award, label: 'Avg Response', value: stats?.avgResponseTime || '0s', color: 'orange' }
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-violet-500 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-${stat.color}-100`}>
                        <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                  </div>
                );
              })}
            </div>

            {/* AI Tools Grid */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900 mb-2">Available AI Tools</h2>
                <p className="text-gray-600">Choose a tool to get started with AI-powered content generation</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {aiTools.map((tool, idx) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.id}
                      to={tool.route}
                      className="group relative overflow-hidden bg-white rounded-2xl border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all p-8"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${tool.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-6">
                          <div className={`p-4 rounded-2xl bg-gradient-to-r ${tool.gradient}`}>
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-gray-900">{tool.stat}</div>
                            <div className="text-xs text-gray-600">{tool.statLabel}</div>
                          </div>
                        </div>

                        <h3 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-violet-600 transition-colors">
                          {tool.title}
                        </h3>
                        
                        <p className="text-gray-600 mb-6 leading-relaxed">
                          {tool.description}
                        </p>

                        <div className="flex items-center gap-2 text-violet-600 font-semibold group-hover:gap-4 transition-all">
                          <span>Try Now</span>
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Quick Start Guide */}
            <div className="bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl p-8 text-white">
              <div className="flex items-start gap-6">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3">Getting Started with AI Tools</h3>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {[
                      'Choose your desired AI tool',
                      'Enter your topic or content',
                      'Get instant AI-generated results',
                      'Save, export, or improve further'
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <span className="text-white/90">{step}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    to={aiTools[0].route}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-violet-600 rounded-xl font-bold hover:bg-gray-100 transition-all"
                  >
                    Start Generating
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Filters and Search */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all font-semibold"
                  >
                    <option value="all">All Types</option>
                    <option value="generate">Generate</option>
                    <option value="improve">Improve</option>
                    <option value="summarize">Summarize</option>
                    <option value="code">Code</option>
                  </select>
                </div>
              </div>
            </div>

            {/* History List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-violet-600" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-16 text-center">
                <History className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No History Yet</h3>
                <p className="text-gray-600 mb-6">Start using AI tools to see your generation history here</p>
                <Link
                  to="?tab=overview"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  Explore AI Tools
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((item) => {
                  const ToolIcon = getToolIcon(item.feature_type);
                  const toolColorClass = getToolColor(item.feature_type);
                  
                  return (
                    <div key={item.id} className="bg-white rounded-2xl border-2 border-gray-200 hover:border-violet-500 hover:shadow-xl transition-all p-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${toolColorClass}`}>
                          <ToolIcon className="w-6 h-6" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h4>
                              <div className="flex items-center gap-3 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{item.time_ago}</span>
                                </div>
                                {item.saved_to_note && (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Saved to Note</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!item.saved_to_note && (
                                <button
                                  onClick={() => handleSaveAsNote(item.id)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                  title="Save as Note"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteHistory(item.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-xl p-4 max-h-32 overflow-hidden relative">
                            <p className="text-sm text-gray-700 line-clamp-3">
                              {item.generated_content?.substring(0, 200)}...
                            </p>
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AIToolsPage;
