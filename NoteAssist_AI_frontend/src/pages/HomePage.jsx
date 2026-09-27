// FILE: src/pages/HomePage.jsx
// AI-Powered NoteAssist - Premium Marketing Homepage
// Production-Ready with Full Responsiveness, Animations & SEO
// ============================================================================

import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { 
  Sparkles, Brain, Zap, FileText, Code, TrendingUp,
  ArrowRight, CheckCircle, BookOpen,
  MessageSquare, BarChart3, Shield, Globe, Menu, X, Lightbulb, Rocket,
  Edit3, Wrench, ChevronDown
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/layout/Footer';
import { startGuestSession } from '@/store/slices/authSlice';

// ============================================================================
// Mobile Menu Component - Smooth animations with backdrop
// ============================================================================
const MobileMenu = ({ isOpen, onClose, onStartFree }) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        />
      )}

      {/* Menu */}
      <div
        className={`fixed top-20 right-0 w-72 bg-white shadow-2xl rounded-bl-3xl z-50 transition-all duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 space-y-3">
          <div className="px-4 py-2">
            <span className="flex items-center gap-2 text-gray-500 text-sm font-medium">
              <Brain className="w-4 h-4" />
              AI Tools
            </span>
            <div className="mt-2 pl-6 space-y-2">
              <Link
                to="/ai-tools"
                className="block py-2 text-gray-600 hover:text-violet-600 text-sm font-medium transition-all"
                onClick={onClose}
              >
                <span className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5" />
                  All AI Tools
                </span>
              </Link>
              <Link
                to="/ai-tools/generate"
                className="block py-2 text-gray-600 hover:text-violet-600 text-sm font-medium transition-all"
                onClick={onClose}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Topic
                </span>
              </Link>
              <Link
                to="/ai-tools/improve"
                className="block py-2 text-gray-600 hover:text-violet-600 text-sm font-medium transition-all"
                onClick={onClose}
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  Improve Content
                </span>
              </Link>
              <Link
                to="/ai-tools/summarize"
                className="block py-2 text-gray-600 hover:text-violet-600 text-sm font-medium transition-all"
                onClick={onClose}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Summarize
                </span>
              </Link>
              <Link
                to="/ai-tools/code"
                className="block py-2 text-gray-600 hover:text-violet-600 text-sm font-medium transition-all"
                onClick={onClose}
              >
                <span className="flex items-center gap-2">
                  <Code className="w-3.5 h-3.5" />
                  Generate Code
                </span>
              </Link>
            </div>
          </div>
          <Link
            to="/notes"
            className="block px-4 py-3 text-gray-700 hover:text-violet-600 font-medium rounded-xl hover:bg-violet-50 transition-all"
            onClick={onClose}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              AI Assist Note
            </span>
          </Link>
          <div className="px-4 py-2">
            <span className="flex items-center gap-2 text-gray-500 text-sm font-medium">
              <Wrench className="w-4 h-4" />
              Manual Tools
            </span>
            <div className="mt-2 pl-6 space-y-2">
              <Link
                to="/note-editor"
                className="block py-2 text-gray-600 hover:text-violet-600 text-sm font-medium transition-all"
                onClick={onClose}
              >
                <span className="flex items-center gap-2">
                  <Edit3 className="w-3.5 h-3.5" />
                  Note Editor
                </span>
              </Link>
              <a href="/tools/" className="block py-2 text-gray-600 hover:text-violet-600 text-sm font-medium transition-all" onClick={onClose}>More free tools</a>
            </div>
          </div>
          <a href="/study-notes/" className="block px-4 py-2 text-gray-700 hover:text-violet-600">Free study notes</a>
          <a href="/blog/" className="block px-4 py-2 text-gray-700 hover:text-violet-600">Learning blog</a>
          <hr className="my-4" />
          <Link
            to="/login"
            className="block px-4 py-3 text-gray-700 hover:text-violet-600 font-medium rounded-xl hover:bg-violet-50 transition-all"
            onClick={onClose}
          >
            Sign In
          </Link>
          <button
            className="w-full px-4 py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            onClick={onStartFree}
          >
            Get Started Free
          </button>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// Main HomePage Component
// ============================================================================
const HomePage = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-rotate AI features every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % aiFeatures.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const aiFeatures = [
    {
      icon: Sparkles,
      title: 'AI Content Generation',
      description: 'Generate comprehensive topic explanations instantly with advanced AI algorithms',
      color: 'from-violet-500 to-purple-600',
      stat: 'Drafts',
      statLabel: 'Check before studying',
      benefits: ['Topic explanations', 'Outline creation', 'Content scaffolding']
    },
    {
      icon: Zap,
      title: 'Smart Enhancement',
      description: 'Improve clarity, grammar, and structure of your existing notes with AI',
      color: 'from-blue-500 to-cyan-600',
      stat: 'Clarity',
      statLabel: 'Edit your result',
      benefits: ['Grammar fixing', 'Clarity boost', 'Structure optimization']
    },
    {
      icon: FileText,
      title: 'Intelligent Summarization',
      description: 'Condense lengthy materials into digestible, focused summaries',
      color: 'from-emerald-500 to-teal-600',
      stat: 'Review',
      statLabel: 'Compare with the source',
      benefits: ['Concise summaries', 'Key points extraction', 'Quick review']
    },
    {
      icon: Code,
      title: 'Code Generation',
      description: 'Generate code snippets in multiple programming languages instantly',
      color: 'from-orange-500 to-red-600',
      stat: 'Practice',
      statLabel: 'Test generated code',
      benefits: ['Multiple languages', 'Best practices', 'Explanations included']
    }
  ];

  const stats = [
    { title: 'Free study notes', label: 'Worked examples and exercises', icon: BookOpen },
    { title: 'Free guides', label: 'Turn lessons into practice', icon: FileText },
    { title: 'Free browser tools', label: 'Word counter and focus timer', icon: Wrench },
    { title: 'Limited free AI', label: 'Optional help with your notes', icon: Brain }
  ];

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Intelligence',
      description: 'Four specialized AI tools working together to supercharge your learning',
      benefits: ['Topic generation', 'Content improvement', 'Smart summaries', 'Code creation']
    },
    {
      icon: FileText,
      title: 'Structured Note-Taking',
      description: 'Organize knowledge with chapters, topics, and rich formatting options',
      benefits: ['Hierarchical structure', 'Rich text editing', 'Code snippets', 'Sources']
    },
    {
      icon: BarChart3,
      title: 'Learning Analytics',
      description: 'Track your progress and optimize studying patterns with insights',
      benefits: ['Progress tracking', 'Activity insights', 'Performance metrics', 'Analytics']
    },
    {
      icon: Globe,
      title: 'Export Options',
      description: 'Download your notes as PDF or connect Google Drive when the integration is configured',
      benefits: ['PDF download', 'Google Drive export', 'Personal note storage', 'Share controls']
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Keep personal notes in your account and choose what to share',
      benefits: ['Account login', 'Private notes', 'Sharing controls', 'Password reset']
    },
    {
      icon: Rocket,
      title: 'Learn at Your Pace',
      description: 'Move from a worked example to a personal note and an optional AI explanation',
      benefits: ['Free reading', 'Practice exercises', 'Browser tools', 'Limited daily AI']
    }
  ];

  const ActiveIcon = aiFeatures[activeFeature].icon;

  // Handle guest mode start
  const handleStartFree = async () => {
    setGuestLoading(true);
    try {
      await dispatch(startGuestSession()).unwrap();
      navigate('/notes');
    } catch (error) {
      // Production: log error to monitoring service or show safe message
      navigate('/register');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <>
      {/* ================================================================
          SEO - Meta Tags & Structured Data
          ================================================================ */}
      <Helmet>
        <title>NoteAssist AI | Free Study Notes and Learning Tools</title>
        <meta name="description" content="Read free programming notes and study guides, create your own notes, and use limited free AI help when needed." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#7c3aed" />
        
        {/* Open Graph - Social Sharing */}
        <meta property="og:title" content="NoteAssist AI - Learn Faster with AI" />
        <meta property="og:description" content="Generate comprehensive notes instantly with AI. Improve your notes, create summaries, and boost learning efficiency." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://noteassistai.vercel.app/" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="NoteAssist AI - AI-Powered Learning" />
        <meta name="twitter:description" content="Transform your learning with AI-powered intelligent note-taking platform" />
        <link rel="canonical" href="https://noteassistai.vercel.app/" />
        
        {/* Schema.org Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "NoteAssist AI",
            "applicationCategory": "EducationalApplication",
            "description": "AI-powered note-taking platform for students",
            "url": "https://noteassistai.vercel.app/",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "creator": {
              "@type": "Organization",
              "name": "NoteAssist AI"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-white overflow-x-hidden">
        {/* ================================================================
            HEADER - Sticky Navigation with Mobile Response
            ================================================================ */}
        <header className="fixed top-0 w-full bg-white/80 backdrop-blur-xl z-50 border-b border-gray-200/50 shadow-sm transition-all duration-300" style={{ boxShadow: scrollY > 50 ? '0 10px 30px rgba(0,0,0,0.1)' : 'none' }}>
          <nav className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative p-2.5 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent hidden sm:inline">
                  NoteAssist AI
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-2">
                <div className="relative group">
                  <Link 
                    to="/ai-tools" 
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-violet-600 font-medium transition-colors"
                  >
                    <Brain className="w-4 h-4" />
                    <span className="hidden lg:inline">AI Tools</span>
                    <ChevronDown className="w-3 h-3" />
                  </Link>
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <Link 
                      to="/ai-tools" 
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Brain className="w-4 h-4" />
                      <span className="text-sm font-medium">All AI Tools</span>
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                    <Link 
                      to="/ai-tools/generate" 
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium">Generate Topic</span>
                    </Link>
                    <Link 
                      to="/ai-tools/improve" 
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      <span className="text-sm font-medium">Improve Content</span>
                    </Link>
                    <Link 
                      to="/ai-tools/summarize" 
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-medium">Summarize</span>
                    </Link>
                    <Link 
                      to="/ai-tools/code" 
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Code className="w-4 h-4" />
                      <span className="text-sm font-medium">Generate Code</span>
                    </Link>
                  </div>
                </div>
                <Link 
                  to="/notes" 
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-violet-600 font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden lg:inline">AI Assist Note</span>
                </Link>
                <div className="relative group">
                  <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-violet-600 font-medium transition-colors">
                    <Wrench className="w-4 h-4" />
                    <span className="hidden lg:inline">Manual Tools</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <Link 
                      to="/note-editor" 
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="text-sm font-medium">Note Editor</span>
                    </Link>
                    <a
                      href="/tools/"
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Wrench className="w-4 h-4" />
                      <span className="text-sm font-medium">More free tools</span>
                    </a>
                  </div>
                </div>
              </div>
              <a href="/study-notes/" className="hidden md:inline text-sm font-medium text-gray-700 hover:text-violet-600">Study notes</a>
              <a href="/blog/" className="hidden md:inline text-sm font-medium text-gray-700 hover:text-violet-600">Blog</a>

              {/* Desktop Buttons */}
              <div className="hidden md:flex items-center gap-4">
                <Link 
                  to="/login" 
                  className="px-4 py-2.5 text-gray-700 hover:text-violet-600 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <button
                  onClick={handleStartFree}
                  disabled={guestLoading}
                  className="group relative px-6 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl font-semibold overflow-hidden transition-all hover:shadow-lg hover:shadow-violet-500/50 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {guestLoading ? 'Starting...' : 'Get Started Free'}
                    {!guestLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-900" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-900" />
                )}
              </button>
            </div>
          </nav>

          {/* Mobile Menu */}
          <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} onStartFree={handleStartFree} />
        </header>

        {/* ================================================================
            HERO SECTION - Premium intro with animations & CTA
            ================================================================ */}
        <section className="relative pt-40 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          {/* Background image with overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="AI study technology background"
              className="w-full h-full object-cover object-center"
              loading="eager"
              fetchpriority="high"
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          </div>

          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-5xl mx-auto text-center">
              {/* Badge */}
              <div 
                className="inline-flex items-center gap-2 mb-6 md:mb-8 px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm"
                style={{ 
                  animation: 'fadeInUp 0.6s ease-out',
                  transform: `translateY(${Math.min(scrollY * 0.3, 50)}px)`,
                  opacity: 1 - scrollY * 0.001
                }}
              >
                <Sparkles className="w-4 md:w-5 h-4 md:h-5 text-white flex-shrink-0" />
                <span className="text-xs md:text-sm font-semibold text-white">
                  Free notes, guides and study tools
                </span>
              </div>

              {/* Headline - Proper H1 */}
              <h1 
                className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 md:mb-6 leading-tight md:leading-tight"
                style={{ 
                  animation: 'fadeInUp 0.6s ease-out 0.2s both',
                  transform: `translateY(${Math.min(scrollY * 0.2, 30)}px)`,
                  opacity: 1 - scrollY * 0.0005
                }}
              >
                Learn with free notes on{' '}
                <span className="relative inline-block">
                  <span className="relative bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    <AnimatedText 
                      words={['Python', 'Django', 'SQL']}
                      duration={3000}
                    />
                  </span>
                </span>
              </h1>

              {/* Subheading - H2 semantic structure */}
              <p 
                className="text-lg md:text-xl lg:text-2xl text-white/90 mb-8 md:mb-10 max-w-3xl mx-auto leading-relaxed"
                style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}
              >
                Read original worked examples and learning guides. Practice with free browser tools,
                then use up to 3 free AI requests per day when you need them.
              </p>

              {/* CTA Buttons */}
              <div 
                className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-12 md:mb-16"
                style={{ animation: 'fadeInUp 0.6s ease-out 0.6s both' }}
              >
                <a
                  href="/study-notes/"
                  className="w-full sm:w-auto group relative px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-2xl font-bold text-base md:text-lg overflow-hidden transition-all hover:shadow-2xl hover:shadow-violet-500/50 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Read free study notes
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </a>
                
                <a
                  href="/tools/"
                  className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-white/10 text-white rounded-2xl font-bold text-base md:text-lg border-2 border-white/30 hover:border-white/60 hover:bg-white/20 transition-all hover:shadow-xl text-center backdrop-blur-sm"
                >
                  Explore free tools
                </a>
              </div>

              {/* Stats Grid with Animated Counters */}
              <div 
                className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
                style={{ animation: 'fadeInUp 0.6s ease-out 0.8s both' }}
              >
                {stats.map((stat, index) => (
                  <div 
                    key={index} 
                    className="group p-4 md:p-6 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 hover:border-white/60 transition-all hover:shadow-xl hover:scale-105 hover:bg-white/30"
                  >
                    <div className="flex items-center justify-center mb-3">
                      <div className="p-2 md:p-3 rounded-xl bg-gradient-to-r from-violet-500/30 to-blue-500/30 group-hover:from-violet-500/50 group-hover:to-blue-500/50 transition-all">
                        <stat.icon className="w-5 md:w-6 h-5 md:h-6 text-white" />
                      </div>
                    </div>
                    <div className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-1">
                      {stat.title}
                    </div>
                    <div className="text-xs md:text-sm text-white/80 font-medium">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-gradient-to-b from-violet-50/30 to-white">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Learn for free, then make your own notes</h2>
            <p className="text-lg text-gray-600 max-w-3xl mb-8">Start with a worked example, answer the practice questions, and use the free editor to organize what you learned.</p>
            <div className="grid md:grid-cols-3 gap-6">
              <a href="/study-notes/" className="p-8 rounded-2xl bg-white border border-violet-100 shadow-sm hover:shadow-lg"><BookOpen className="text-violet-600 mb-4" /><h3 className="font-bold text-xl mb-2">Ready-made study notes</h3><p className="text-gray-600">Python, Django and SQL examples with exercises and answers.</p></a>
              <a href="/blog/" className="p-8 rounded-2xl bg-white border border-violet-100 shadow-sm hover:shadow-lg"><FileText className="text-violet-600 mb-4" /><h3 className="font-bold text-xl mb-2">Practical guides</h3><p className="text-gray-600">Make useful notes and turn class material into questions.</p></a>
              <a href="/tools/" className="p-8 rounded-2xl bg-white border border-violet-100 shadow-sm hover:shadow-lg"><Wrench className="text-violet-600 mb-4" /><h3 className="font-bold text-xl mb-2">Free browser tools</h3><p className="text-gray-600">Count words or plan a focused study session without an account.</p></a>
            </div>
            <p className="mt-6 text-gray-600">Need an order to follow? Try the <a className="font-semibold text-violet-700 underline" href="/learning-paths/">free Python to Django learning path</a>.</p>
          </div>
        </section>

        {/* ================================================================
            AI FEATURES SHOWCASE - Interactive feature panel
            ================================================================ */}
        <section className="py-16 md:py-20 lg:py-24 bg-gradient-to-b from-white to-violet-50/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-3 md:mb-4">
                Powered by Advanced AI
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Four specialized AI tools working together to revolutionize your learning
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-start max-w-6xl mx-auto">
              {/* Features List */}
              <div className="space-y-4">
                {aiFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  const isActive = activeFeature === index;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => setActiveFeature(index)}
                      className={`group p-5 md:p-6 rounded-2xl cursor-pointer transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-2xl shadow-violet-500/30 scale-105'
                          : 'bg-white border-2 border-gray-200 hover:border-violet-500/50 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                          isActive 
                            ? 'bg-white/20' 
                            : 'bg-gradient-to-r from-violet-500/10 to-blue-500/10 group-hover:from-violet-500/20 group-hover:to-blue-500/20'
                        }`}>
                          <Icon className={`w-6 md:w-7 h-6 md:h-7 ${isActive ? 'text-white' : 'text-violet-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-lg md:text-xl font-bold mb-1 ${isActive ? 'text-white' : 'text-gray-900'}`}>
                            {feature.title}
                          </h3>
                          <p className={`text-sm md:text-base ${isActive ? 'text-white/90' : 'text-gray-600'}`}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feature Preview Card */}
              <div className="relative">
                <div className="sticky top-28 p-6 md:p-10 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-2xl overflow-hidden">
                  {/* Decorative Background */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-500/20 to-violet-500/20 rounded-full blur-3xl"></div>
                  
                  <div className="relative z-10">
                    {/* Feature Header */}
                    <div className="flex items-center gap-4 mb-6 md:mb-8">
                      <div className={`p-3 md:p-4 rounded-2xl bg-gradient-to-r ${aiFeatures[activeFeature].color} flex-shrink-0`}>
                        <ActiveIcon className="w-8 md:w-10 h-8 md:h-10 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-2xl md:text-3xl font-bold mb-1">
                          {aiFeatures[activeFeature].title}
                        </h3>
                        <p className="text-gray-400 text-sm md:text-base">
                          Intelligent & Powerful
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-base md:text-lg text-gray-300 mb-6 md:mb-8 leading-relaxed">
                      {aiFeatures[activeFeature].description}
                    </p>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
                      <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <div className="text-3xl md:text-4xl font-black mb-1">
                          {aiFeatures[activeFeature].stat}
                        </div>
                        <div className="text-xs md:text-sm text-gray-400">
                          {aiFeatures[activeFeature].statLabel}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <div className="text-3xl md:text-4xl font-black mb-1">
                          ⚡
                        </div>
                        <div className="text-xs md:text-sm text-gray-400">
                          AI Powered
                        </div>
                      </div>
                    </div>

                    {/* Benefits List */}
                    <ul className="mb-8 space-y-2">
                      {aiFeatures[activeFeature].benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm md:text-base text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    
                    <Link
                      to="/register"
                      className="w-full py-3 md:py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 group"
                    >
                      Try This Feature
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            FEATURES GRID - Six feature cards with benefits
            ================================================================ */}
        <section className="py-16 md:py-20 lg:py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-3 md:mb-4">
                Everything You Need to Excel
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Comprehensive tools designed for modern learners
              </p>
            </div>

            <div className="grid md:grid-cols-2 mx-6 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group p-6 md:p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 hover:border-violet-500 transition-all hover:shadow-2xl hover:scale-105"
                  style={{ 
                    animation: `fadeInUp 0.6s ease-out ${0.1 * index}s both`,
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div className={`inline-flex p-3 md:p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-blue-500/10 group-hover:from-violet-500/20 group-hover:to-blue-500/20 transition-all mb-4 md:mb-6`}>
                    <feature.icon className="w-7 md:w-8 h-7 md:h-8 text-violet-600" />
                  </div>
                  
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm md:text-base mb-4 md:mb-6">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm md:text-base text-gray-700">
                        <CheckCircle className="w-4 h-4 text-violet-600 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            CTA SECTION - Final call to action with value props
            ================================================================ */}
        <section className="py-16 md:py-20 lg:py-24 bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center text-white">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 leading-tight">
                Start Learning Smarter Today
              </h2>
              <p className="text-base md:text-lg lg:text-xl text-white/90 mb-8 md:mb-10 leading-relaxed max-w-2xl mx-auto">
                Read free study notes, use practical tools and organize your learning. AI help is optional and limited.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-8 md:mb-10">
                <Link 
                  to="/register" 
                  className="w-full sm:w-auto group px-6 md:px-8 py-3 md:py-4 bg-white text-violet-600 rounded-2xl font-bold text-base md:text-lg hover:bg-gray-100 transition-all hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
                
                <Link 
                  to="/login" 
                  className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-white/10 backdrop-blur-sm text-white rounded-2xl font-bold text-base md:text-lg border-2 border-white/30 hover:bg-white/20 transition-all text-center"
                >
                  Sign In
                </Link>
              </div>
              
              <p className="text-white/70 text-xs md:text-sm">
                ✓ No credit card required • ✓ Free forever • ✓ Cancel anytime
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>

      {/* ================================================================
          GLOBAL CSS ANIMATIONS
          ================================================================ */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-pulse {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </>
  );
};

export default HomePage;
