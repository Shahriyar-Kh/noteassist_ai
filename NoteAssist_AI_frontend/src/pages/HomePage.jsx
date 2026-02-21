// FILE: src/pages/HomePage.jsx
// AI-Powered NoteAssist - Premium Marketing Homepage
// Production-Ready with Full Responsiveness, Animations & SEO
// ============================================================================

import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { 
  Sparkles, Brain, Zap, FileText, Code, TrendingUp,
  ArrowRight, CheckCircle, Star, Users, BookOpen,
  MessageSquare, BarChart3, Shield, Globe, Menu, X, Lightbulb, Rocket,
  ChevronLeft, ChevronRight, Terminal, Edit3, Wrench, ChevronDown
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/layout/Footer';
import { startGuestSession } from '@/store/slices/authSlice';

// ============================================================================
// Animated Counter Component - Uses IntersectionObserver for scroll triggers
// ============================================================================
const AnimatedCounter = ({ end, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setCount(Math.floor(end * progress));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num;
  };

  return (
    <span ref={ref} className="font-black text-4xl md:text-5xl text-white">
      {formatNumber(count)}{suffix}
    </span>
  );
};

// ============================================================================
// Animated Text Component - Cycles through words with fade transitions
// ============================================================================
const AnimatedText = ({ words = [], duration = 3000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState('in');

  useEffect(() => {
    const interval = setInterval(() => {
      setFade('out');
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setFade('in');
      }, 300);
    }, duration);

    return () => clearInterval(interval);
  }, [words, duration]);

  return (
    <span
      className={`transition-opacity duration-300 ${fade === 'in' ? 'opacity-100' : 'opacity-0'}`}
    >
      {words[currentIndex] || 'AI Intelligence'}
    </span>
  );
};

// ============================================================================
// Mobile Menu Component - Smooth animations with backdrop
// ============================================================================
const MobileMenu = ({ isOpen, onClose }) => {
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
              <Link
                to="/code-runner"
                className="block py-2 text-gray-600 hover:text-violet-600 text-sm font-medium transition-all"
                onClick={onClose}
              >
                <span className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" />
                  Online Code Runner
                </span>
              </Link>
            </div>
          </div>
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
            onClick={onClose}
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
  const [carouselIndex, setCarouselIndex] = useState(0);
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

  // Auto-rotate testimonials carousel every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % Math.ceil(testimonials.length / 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const aiFeatures = [
    {
      icon: Sparkles,
      title: 'AI Content Generation',
      description: 'Generate comprehensive topic explanations instantly with advanced AI algorithms',
      color: 'from-violet-500 to-purple-600',
      stat: '10,000+',
      statLabel: 'Explanations Generated',
      benefits: ['Topic explanations', 'Outline creation', 'Content scaffolding']
    },
    {
      icon: Zap,
      title: 'Smart Enhancement',
      description: 'Improve clarity, grammar, and structure of your existing notes with AI',
      color: 'from-blue-500 to-cyan-600',
      stat: '95%',
      statLabel: 'Quality Improvement',
      benefits: ['Grammar fixing', 'Clarity boost', 'Structure optimization']
    },
    {
      icon: FileText,
      title: 'Intelligent Summarization',
      description: 'Condense lengthy materials into digestible, focused summaries',
      color: 'from-emerald-500 to-teal-600',
      stat: '5x',
      statLabel: 'Faster Learning',
      benefits: ['Concise summaries', 'Key points extraction', 'Quick review']
    },
    {
      icon: Code,
      title: 'Code Generation',
      description: 'Generate code snippets in multiple programming languages instantly',
      color: 'from-orange-500 to-red-600',
      stat: '15+',
      statLabel: 'Languages Supported',
      benefits: ['Multiple languages', 'Best practices', 'Explanations included']
    }
  ];

  const stats = [
    { value: 50000, suffix: '+', label: 'Active Learners', icon: Users },
    { value: 1000000, suffix: '+', label: 'AI Generations', icon: Brain },
    { value: 500000, suffix: '+', label: 'Notes Created', icon: FileText },
    { value: 98, suffix: '%', label: 'Satisfaction Rate', icon: Star }
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
      title: 'Seamless Integration',
      description: 'Export and sync your notes across multiple platforms effortlessly',
      benefits: ['PDF export', 'Cloud sync', 'Email reports', 'Cloud backup']
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is encrypted and protected with enterprise-grade security',
      benefits: ['End-to-end encryption', 'GDPR compliant', 'No data sharing', 'Secure login']
    },
    {
      icon: Rocket,
      title: 'Lightning Fast',
      description: 'Experience blazing-fast performance optimized for seamless access',
      benefits: ['Instant loading', 'Optimized sync', 'Smooth animations', 'Low latency']
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Computer Science Student',
      image: '👩‍💻',
      quote: 'NoteAssist AI saved me hours of study time. The note quality is absolutely incredible!',
      rating: 5
    },
    {
      name: 'Marcus Williams',
      role: 'Medical Student',
      image: '👨‍⚕️',
      quote: 'Best study tool I\'ve used. AI summaries are spot-on and help retain information.',
      rating: 5
    },
    {
      name: 'Aisha Kumar',
      role: 'Data Science Professional',
      image: '👩‍🔬',
      quote: 'Code generation feature is amazing! Helps me learn new concepts rapidly.',
      rating: 5
    },
    {
      name: 'James Rodriguez',
      role: 'MBA Student',
      image: '👨‍🎓',
      quote: 'The organization features are fantastic. Study groups love it!',
      rating: 5
    },
    {
      name: 'Priya Patel',
      role: 'Law Student',
      image: '👩‍⚖️',
      quote: 'Content enhancement helps me boost my notes to publication quality.',
      rating: 5
    },
    {
      name: 'Alex Kim',
      role: 'Full-Stack Developer',
      image: '👨‍💻',
      quote: 'Perfect for learning new frameworks. The AI explanations are comprehensive.',
      rating: 5
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

  // Carousel helper functions
  const testimonialsPerPage = 3;
  const totalPages = Math.ceil(testimonials.length / testimonialsPerPage);
  const visibleTestimonials = testimonials.slice(
    carouselIndex * testimonialsPerPage,
    carouselIndex * testimonialsPerPage + testimonialsPerPage
  );

  const goToPreviousSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const goToNextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % totalPages);
  };

  return (
    <>
      {/* ================================================================
          SEO - Meta Tags & Structured Data
          ================================================================ */}
      <Helmet>
        <title>NoteAssist AI - AI-Powered Learning Platform for Students</title>
        <meta name="description" content="Transform your learning with AI-powered note generation, intelligent summaries, content enhancement, and code generation. Join 50K+ students learning smarter." />
        <meta name="keywords" content="AI study notes, intelligent learning, note-taking app, AI education, study assistant, automated notes, learning platform, note generation" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#7c3aed" />
        
        {/* Open Graph - Social Sharing */}
        <meta property="og:title" content="NoteAssist AI - Learn Faster with AI" />
        <meta property="og:description" content="Generate comprehensive notes instantly with AI. Improve your notes, create summaries, and boost learning efficiency." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og-image.jpg" />
        <meta property="og:url" content="https://noteassist.ai" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="NoteAssist AI - AI-Powered Learning" />
        <meta name="twitter:description" content="Transform your learning with AI-powered intelligent note-taking platform" />
        <meta name="twitter:image" content="/og-image.jpg" />
        
        {/* Schema.org Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "NoteAssist AI",
            "applicationCategory": "EducationalApplication",
            "description": "AI-powered note-taking platform for students",
            "url": "https://noteassist.ai",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "ratingCount": "5000"
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
                    <Link 
                      to="/code-runner" 
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Terminal className="w-4 h-4" />
                      <span className="text-sm font-medium">Online Code Runner</span>
                    </Link>
                  </div>
                </div>
              </div>

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
          <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
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
                  AI-Powered Learning Platform
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
                Learn Faster with{' '}
                <span className="relative inline-block">
                  <span className="relative bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    <AnimatedText 
                      words={['AI Intelligence', 'Smart Learning', 'Excellence']}
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
                Generate comprehensive notes, improve content quality, and master any subject with 
                <span className="font-semibold text-cyan-300"> AI-powered study tools</span>
              </p>

              {/* CTA Buttons */}
              <div 
                className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-12 md:mb-16"
                style={{ animation: 'fadeInUp 0.6s ease-out 0.6s both' }}
              >
                <button
                  onClick={handleStartFree}
                  disabled={guestLoading}
                  className="w-full sm:w-auto group relative px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-2xl font-bold text-base md:text-lg overflow-hidden transition-all hover:shadow-2xl hover:shadow-violet-500/50 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {guestLoading ? 'Starting...' : 'Start Learning for Free'}
                    {!guestLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
                
                <Link 
                  to="/login" 
                  className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-white/10 text-white rounded-2xl font-bold text-base md:text-lg border-2 border-white/30 hover:border-white/60 hover:bg-white/20 transition-all hover:shadow-xl text-center backdrop-blur-sm"
                >
                  Explore Platform
                </Link>
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
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} duration={2500} />
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
            TESTIMONIALS - Six user testimonials with ratings
            ================================================================ */}
        <section className="py-16 md:py-20 lg:py-24 bg-gradient-to-b from-violet-50/30 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-3 md:mb-4">
                Loved by Students Worldwide
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Join thousands of learners transforming their education
              </p>
            </div>

            <div className="max-w-7xl mx-auto">
              {/* Carousel Container */}
              <div className="relative">
                {/* Testimonials Grid - 3 columns */}
                <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                  {visibleTestimonials.map((testimonial, index) => (
                    <div
                      key={index}
                      className="h-full p-6 md:p-8 rounded-2xl bg-white border-2 border-gray-200 hover:border-violet-500 transition-all hover:shadow-xl hover:translate-y-1 animate-fade-in flex flex-col"
                      style={{ animation: `fadeInUp 0.6s ease-out ${0.1 * index}s both` }}
                    >
                      {/* Star Rating */}
                      <div className="flex items-center gap-1 mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 md:w-5 h-4 md:h-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      
                      <p className="text-gray-700 text-sm md:text-base mb-4 md:mb-6 italic">
                        "{testimonial.quote}"
                      </p>
                      
                      {/* Author Info */}
                      <div className="flex items-center gap-3 mt-auto">
                        <div className="text-2xl md:text-3xl">
                          {testimonial.image}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 text-sm md:text-base">
                            {testimonial.name}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">
                            {testimonial.role}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-center gap-4 mt-8 md:mt-12">
                  <button
                    onClick={goToPreviousSlide}
                    className="p-3 md:p-4 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-600 transition-all hover:scale-110 active:scale-95"
                    aria-label="Previous testimonials"
                  >
                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                  </button>

                  {/* Dot Indicators */}
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCarouselIndex(idx)}
                        className={`h-2 md:h-3 rounded-full transition-all ${
                          idx === carouselIndex
                            ? 'bg-violet-600 w-6 md:w-8'
                            : 'bg-gray-300 w-2 md:w-3 hover:bg-gray-400'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={goToNextSlide}
                    className="p-3 md:p-4 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-600 transition-all hover:scale-110 active:scale-95"
                    aria-label="Next testimonials"
                  >
                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>

                {/* Auto-rotation Indicator */}
              
              </div>
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
                Join thousands of students and professionals using NoteAssist AI to accelerate their learning journey
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
      <style jsx>{`
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