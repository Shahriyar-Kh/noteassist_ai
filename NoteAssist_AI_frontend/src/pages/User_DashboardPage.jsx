// FILE: src/pages/UserDashboard_Modern.jsx
// Modern User Dashboard with AI Tools Integration
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout as logoutAction } from '@/store/slices/authSlice';
import { 
  Brain, Sparkles, TrendingUp, Zap, FileText, Code,
  BookOpen, Menu, X, Bell, Settings, User, LogOut, 
  Clock, Flame, Target, BarChart3, History, ChevronRight,
  Play, CheckCircle, ArrowRight, MessageSquare
} from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';
import { toast } from 'react-hot-toast';

const DashboardPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Dashboard Data
  const [dashboardData, setDashboardData] = useState(null);
  const [recentNotes, setRecentNotes] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [overview, notes] = await Promise.all([
        dashboardService.getOverview(),
        dashboardService.getRecentNotes()
      ]);

      setDashboardData(overview.data);
      setRecentNotes(notes.data || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutAction()).unwrap();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const navigationItems = [
    { 
      id: 'dashboard',
      icon: BarChart3, 
      label: 'Dashboard', 
      path: '/dashboard'
    },
    { 
      id: 'notes',
      icon: FileText, 
      label: 'Study Notes', 
      path: '/notes',
      description: 'Organize & structure your knowledge'
    },
    { 
      id: 'ai-tools',
      icon: Brain, 
      label: 'AI Tools', 
      path: '/ai-tools',
      badge: 'AI',
      description: 'Intelligent content generation',
      subItems: [
        { id: 'generate', label: 'Generate Topic', icon: Sparkles, path: '/ai-tools/generate' },
        { id: 'improve', label: 'Improve Content', icon: Zap, path: '/ai-tools/improve' },
        { id: 'summarize', label: 'Summarize', icon: FileText, path: '/ai-tools/summarize' },
        { id: 'code', label: 'Generate Code', icon: Code, path: '/ai-tools/code' }
      ]
    },
    { 
      id: 'history',
      icon: History, 
      label: 'History', 
      path: '/history',
      description: 'View past AI generations'
    },
    { 
      id: 'notifications',
      icon: Bell, 
      label: 'Notifications', 
      path: '/notifications',
      badge: 3
    }
  ];

  const statsCards = [
    {
      title: 'Total Notes',
      value: dashboardData?.total_notes || 0,
      change: dashboardData?.notes_this_week || 0,
      changeLabel: 'this week',
      icon: FileText,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/10 to-cyan-500/10'
    },
    {
      title: 'AI Generations',
      value: dashboardData?.total_ai_requests || 0,
      change: dashboardData?.ai_requests_this_week || 0,
      changeLabel: 'this week',
      icon: Brain,
      gradient: 'from-violet-500 to-purple-500',
      bgGradient: 'from-violet-500/10 to-purple-500/10'
    },
    {
      title: 'Topics Created',
      value: dashboardData?.total_topics || 0,
      change: dashboardData?.topics_this_week || 0,
      changeLabel: 'this week',
      icon: Target,
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-500/10 to-teal-500/10'
    },
    {
      title: 'Current Streak',
      value: `${dashboardData?.current_streak || 0}d`,
      change: dashboardData?.current_streak || 0,
      changeLabel: 'days',
      icon: Flame,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-500/10 to-red-500/10'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex">
      {/* Modern Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-xl transform transition-all duration-300 lg:relative lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative p-2.5 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent block">
                    StudyNotes
                  </span>
                  <span className="text-xs text-gray-500">AI Powered</span>
                </div>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              
              return (
                <div key={item.id}>
                  <Link
                    to={item.path}
                    onClick={() => {
                      setActivePage(item.id);
                      if (!hasSubItems) setSidebarOpen(false);
                    }}
                    className={`group relative flex items-center justify-between px-4 py-3.5 rounded-xl transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/30'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-violet-500/10 hover:to-blue-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-violet-600'}`} />
                      <div>
                        <span className={`font-semibold block ${isActive ? 'text-white' : ''}`}>
                          {item.label}
                        </span>
                        {item.description && !isActive && (
                          <span className="text-xs text-gray-500 block">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.badge && (
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        isActive 
                          ? 'bg-white text-violet-600' 
                          : item.badge === 'AI'
                            ? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white'
                            : 'bg-blue-100 text-blue-600'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* Sub Items for AI Tools */}
                  {hasSubItems && isActive && (
                    <div className="ml-4 mt-2 space-y-1">
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        return (
                          <Link
                            key={subItem.id}
                            to={subItem.path}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:text-violet-600 hover:bg-violet-50 transition-all"
                          >
                            <SubIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{subItem.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Settings Section */}
            <div className="pt-4 border-t border-gray-200/50 mt-4">
              <Link
                to="/settings"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-all"
              >
                <Settings className="w-5 h-5" />
                <span className="font-semibold">Settings</span>
              </Link>
            </div>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200/50">
            <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {dashboardData?.user_name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {dashboardData?.user_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {dashboardData?.user_email || ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/profile"
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white hover:bg-gray-50 rounded-lg transition-all font-medium"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center px-3 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        {/* Top Bar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                  Welcome back! 👋
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Here's your learning progress today
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-3 hover:bg-gray-100 rounded-xl transition-all">
                <Bell className="w-6 h-6 text-gray-700" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-2xl bg-white border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all p-6"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      {stat.change > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="font-bold text-green-600">+{stat.change}</span>
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-sm font-semibold text-gray-600 mb-1">
                      {stat.title}
                    </h3>
                    <p className="text-4xl font-black text-gray-900 mb-1">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500">
                      {stat.changeLabel}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Notes */}
            <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Recent Notes</h2>
                  <p className="text-sm text-gray-600 mt-1">Continue where you left off</p>
                </div>
                <Link
                  to="/notes"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {recentNotes.length > 0 ? (
                <div className="space-y-3">
                  {recentNotes.map((note) => (
                    <Link
                      key={note.id}
                      to={`/notes?id=${note.id}`}
                      className="group flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 hover:border-violet-500 hover:shadow-lg transition-all"
                    >
                      <div className="p-3 bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-xl group-hover:from-violet-500/20 group-hover:to-blue-500/20 transition-all">
                        <FileText className="w-6 h-6 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate group-hover:text-violet-600 transition-colors">
                          {note.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">{note.time_ago}</span>
                          {note.tags && note.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-violet-600 transition-colors" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-6 font-medium">No notes yet. Start creating!</p>
                  <Link
                    to="/notes"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                  >
                    Create First Note
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Right Sidebar - Quick Actions & AI Tools */}
            <div className="space-y-6">
              {/* AI Quick Actions */}
              <div className="bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">AI Tools</h3>
                    <p className="text-sm text-white/80">Generate instantly</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { icon: Sparkles, label: 'Generate Topic', path: '/ai-tools/generate' },
                    { icon: Zap, label: 'Improve Content', path: '/ai-tools/improve' },
                    { icon: FileText, label: 'Summarize', path: '/ai-tools/summarize' },
                    { icon: Code, label: 'Generate Code', path: '/ai-tools/code' }
                  ].map((tool, idx) => {
                    const ToolIcon = tool.icon;
                    return (
                      <Link
                        key={idx}
                        to={tool.path}
                        className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm border border-white/20"
                      >
                        <ToolIcon className="w-5 h-5" />
                        <span className="font-semibold text-sm">{tool.label}</span>
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Streak Card */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {dashboardData?.current_streak || 0}-Day Streak!
                    </h3>
                    <p className="text-sm text-gray-600">Keep it going!</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all" 
                      style={{ width: `${Math.min((dashboardData?.current_streak || 0) * 10, 100)}%` }} 
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {dashboardData?.current_streak || 0}/{dashboardData?.longest_streak || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
