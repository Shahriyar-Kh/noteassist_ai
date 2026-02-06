// FILE: src/pages/HomePage_Redesigned.jsx
// AI-Powered StudyNotes - Marketing Homepage with Advanced Design
// ============================================================================

import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  Sparkles, Brain, Zap, FileText, Code, TrendingUp,
  ArrowRight, CheckCircle, Star, Users, BookOpen,
  MessageSquare, BarChart3, Shield, Globe
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/layout/Footer';

const HomePage = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % aiFeatures.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const aiFeatures = [
    {
      icon: Sparkles,
      title: 'AI Content Generation',
      description: 'Generate comprehensive topic explanations instantly with advanced AI',
      color: 'from-violet-500 to-purple-600',
      stat: '10,000+',
      statLabel: 'Explanations Generated'
    },
    {
      icon: Zap,
      title: 'Smart Content Enhancement',
      description: 'Improve clarity, grammar, and structure of your existing notes',
      color: 'from-blue-500 to-cyan-600',
      stat: '95%',
      statLabel: 'Quality Improvement'
    },
    {
      icon: FileText,
      title: 'Intelligent Summarization',
      description: 'Condense lengthy materials into digestible summaries',
      color: 'from-emerald-500 to-teal-600',
      stat: '5x',
      statLabel: 'Faster Learning'
    },
    {
      icon: Code,
      title: 'Code Generation',
      description: 'Generate code snippets in multiple programming languages',
      color: 'from-orange-500 to-red-600',
      stat: '15+',
      statLabel: 'Languages Supported'
    }
  ];

  const stats = [
    { value: '50K+', label: 'Active Learners', icon: Users },
    { value: '1M+', label: 'AI Generations', icon: Brain },
    { value: '500K+', label: 'Notes Created', icon: FileText },
    { value: '98%', label: 'Satisfaction Rate', icon: Star }
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
      description: 'Organize knowledge with chapters, topics, and rich formatting',
      benefits: ['Hierarchical structure', 'Rich text editing', 'Code snippets', 'Source citations']
    },
    {
      icon: BarChart3,
      title: 'Learning Analytics',
      description: 'Track progress and optimize your study patterns',
      benefits: ['Progress tracking', 'Activity insights', 'Performance metrics', 'Time analytics']
    },
    {
      icon: Globe,
      title: 'Seamless Integration',
      description: 'Export and sync your notes across platforms',
      benefits: ['PDF export', 'Google Drive sync', 'Email reports', 'Cloud backup']
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Computer Science Student',
      image: '👩‍💻',
      quote: 'AI note generation saved me hours of study time. The quality is incredible!',
      rating: 5
    },
    {
      name: 'Marcus Williams',
      role: 'Medical Student',
      image: '👨‍⚕️',
      quote: 'Best study tool I\'ve used. The AI summaries are spot-on and help me retain information.',
      rating: 5
    },
    {
      name: 'Aisha Kumar',
      role: 'Data Scientist',
      image: '👩‍🔬',
      quote: 'Code generation feature is amazing! It helps me learn new programming concepts quickly.',
      rating: 5
    }
  ];

  const ActiveIcon = aiFeatures[activeFeature].icon;

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>AI-Powered StudyNotes - Learn Faster with Intelligent Note-Taking</title>
        <meta name="description" content="Transform your learning with AI-powered note generation, intelligent summaries, and smart content enhancement. StudyNotes helps students and professionals learn faster and retain more." />
        <meta name="keywords" content="AI study notes, intelligent learning, note-taking app, AI education, study assistant, automated notes, learning platform" />
        
        {/* Open Graph */}
        <meta property="og:title" content="AI-Powered StudyNotes - Learn Faster with AI" />
        <meta property="og:description" content="Generate comprehensive notes instantly with AI. Improve content quality, create summaries, and boost your learning efficiency." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og-image.jpg" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI-Powered StudyNotes" />
        <meta name="twitter:description" content="Transform your learning with AI-powered intelligent note-taking" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "StudyNotes",
            "applicationCategory": "EducationalApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "ratingCount": "5000"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-xl z-50 border-b border-gray-200/50 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative p-2.5 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                  NoteAssist AI
                </span>
              </Link>

              <div className="flex items-center gap-6">
                <Link 
                  to="/ai-tools" 
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-violet-600 font-medium transition-colors"
                >
                  <Brain className="w-4 h-4" />
                  AI Tools
                </Link>
                <Link 
                  to="/notes" 
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-violet-600 font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Full Notes
                </Link>
                <Link 
                  to="/login" 
                  className="px-5 py-2.5 text-gray-700 hover:text-violet-600 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/register" 
                  className="group relative px-6 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl font-semibold overflow-hidden transition-all hover:shadow-lg hover:shadow-violet-500/50"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started Free
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">

          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-5xl mx-auto text-center">
              {/* Badge */}
              <div 
                className="inline-flex items-center gap-2 mb-8 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 backdrop-blur-sm"
                style={{ 
                  animation: 'fadeInUp 0.6s ease-out',
                  transform: `translateY(${Math.min(scrollY * 0.3, 50)}px)`
                }}
              >
                <Sparkles className="w-5 h-5 text-violet-600" />
                <span className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                  AI-Powered Learning Platform
                </span>
              </div>

              {/* Headline */}
              <h1 
                className="text-6xl md:text-7xl font-black text-gray-900 mb-6 leading-tight"
                style={{ 
                  animation: 'fadeInUp 0.6s ease-out 0.2s both',
                  transform: `translateY(${Math.min(scrollY * 0.2, 30)}px)`
                }}
              >
                Learn Faster with{' '}
                <span className="relative inline-block">
                  <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 blur-2xl opacity-30"></span>
                  <span className="relative bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    AI Intelligence
                  </span>
                </span>
              </h1>

              <p 
                className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed"
                style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}
              >
                Generate comprehensive notes, improve content quality, and master any subject with 
                <span className="font-semibold text-violet-600"> AI-powered study tools</span>
              </p>

              {/* CTA Buttons */}
              <div 
                className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
                style={{ animation: 'fadeInUp 0.6s ease-out 0.6s both' }}
              >
                <Link 
                  to="/register" 
                  className="group relative px-8 py-4 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-2xl font-bold text-lg overflow-hidden transition-all hover:shadow-2xl hover:shadow-violet-500/50 hover:scale-105"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Start Learning for Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </Link>
                
                <Link 
                  to="/login" 
                  className="px-8 py-4 bg-white text-gray-900 rounded-2xl font-bold text-lg border-2 border-gray-200 hover:border-violet-500 hover:text-violet-600 transition-all hover:shadow-xl"
                >
                  Watch Demo
                </Link>
              </div>

              {/* Stats */}
              <div 
                className="grid grid-cols-2 md:grid-cols-4 gap-6"
                style={{ animation: 'fadeInUp 0.6s ease-out 0.8s both' }}
              >
                {stats.map((stat, index) => (
                  <div 
                    key={index} 
                    className="group p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-200/50 hover:border-violet-500/50 transition-all hover:shadow-xl hover:scale-105"
                  >
                    <div className="flex items-center justify-center mb-3">
                      <div className="p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-blue-500/10 group-hover:from-violet-500/20 group-hover:to-blue-500/20 transition-all">
                        <stat.icon className="w-6 h-6 text-violet-600" />
                      </div>
                    </div>
                    <div className="text-3xl md:text-4xl font-black text-gray-900 mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* AI Features Showcase */}
        <section className="py-20 bg-gradient-to-b from-white to-violet-50/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black text-gray-900 mb-4">
                Powered by Advanced AI
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Four specialized AI tools designed to transform how you learn and retain information
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              {/* Features List */}
              <div className="space-y-4">
                {aiFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  const isActive = activeFeature === index;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => setActiveFeature(index)}
                      className={`group p-6 rounded-2xl cursor-pointer transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-2xl shadow-violet-500/30 scale-105'
                          : 'bg-white border-2 border-gray-200 hover:border-violet-500/50 hover:shadow-lg'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl transition-all ${
                          isActive 
                            ? 'bg-white/20' 
                            : 'bg-gradient-to-r from-violet-500/10 to-blue-500/10 group-hover:from-violet-500/20 group-hover:to-blue-500/20'
                        }`}>
                          <Icon className={`w-7 h-7 ${isActive ? 'text-white' : 'text-violet-600'}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-xl font-bold mb-2 ${isActive ? 'text-white' : 'text-gray-900'}`}>
                            {feature.title}
                          </h3>
                          <p className={`text-sm ${isActive ? 'text-white/90' : 'text-gray-600'}`}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feature Preview */}
              <div className="relative">
                <div className="sticky top-24 p-10 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-2xl overflow-hidden">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-500/20 to-violet-500/20 rounded-full blur-3xl"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className={`p-4 rounded-2xl bg-gradient-to-r ${aiFeatures[activeFeature].color}`}>
                        <ActiveIcon className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold mb-1">
                          {aiFeatures[activeFeature].title}
                        </h3>
                        <p className="text-gray-400">
                          Intelligent & Powerful
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                      {aiFeatures[activeFeature].description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <div className="text-4xl font-black mb-1">
                          {aiFeatures[activeFeature].stat}
                        </div>
                        <div className="text-sm text-gray-400">
                          {aiFeatures[activeFeature].statLabel}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <div className="text-4xl font-black mb-1">
                          AI
                        </div>
                        <div className="text-sm text-gray-400">
                          Powered
                        </div>
                      </div>
                    </div>
                    
                    <Link
                      to="/register"
                      className="w-full py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 group"
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

        {/* Features Grid */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black text-gray-900 mb-4">
                Everything You Need to Excel
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Comprehensive tools designed for modern learners
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 hover:border-violet-500 transition-all hover:shadow-2xl hover:scale-105"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-blue-500/10 group-hover:from-violet-500/20 group-hover:to-blue-500/20 transition-all mb-6`}>
                    <feature.icon className="w-8 h-8 text-violet-600" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-6">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-violet-600 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-gradient-to-b from-violet-50/30 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black text-gray-900 mb-4">
                Loved by Students Worldwide
              </h2>
              <p className="text-xl text-gray-600">
                Join thousands of successful learners
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="p-8 rounded-2xl bg-white border-2 border-gray-200 hover:border-violet-500 transition-all hover:shadow-xl"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  
                  <p className="text-gray-700 mb-6 italic">
                    "{testimonial.quote}"
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">
                      {testimonial.image}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-white text-gray-900 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-5xl md:text-6xl font-black mb-6">
                Start Learning Smarter Today
              </h2>
              <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed">
                Join thousands of students using AI to accelerate their learning journey
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                <Link 
                  to="/register" 
                  className="group px-8 py-4 bg-white text-violet-600 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
                
                <Link 
                  to="/login" 
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-2xl font-bold text-lg border-2 border-white/30 hover:bg-white/20 transition-all"
                >
                  Sign In
                </Link>
              </div>
              
              <p className="text-white/70 text-sm">
                ✓ No credit card required • ✓ Free forever • ✓ Cancel anytime
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>

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

        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
      `}</style>
    </>
  );
};

export default HomePage;