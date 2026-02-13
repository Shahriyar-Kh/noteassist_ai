// FILE: src/components/layout/Navbar.jsx
// ============================================================================

import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { Menu } from '@headlessui/react';
import { BookOpen, Home, FileText, Brain, User, LogOut, Menu as MenuIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';

const Navbar = ({ hideLinks = [] }) => {
  const { isAuthenticated, user, isGuest } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // This navbar is for regular users and guests
  const isAdmin = user?.role === 'admin' || user?.is_staff || user?.is_superuser;
  
  // Don't render if user is an admin (admins use AdminLayout navbar)
  if (isAdmin) {
    return null;
  }

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/home');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:inline">
              NoteAssist AI
            </span>
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center gap-6">
            {/* Home Link */}
            <Link to="/home" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors">
              <Home size={18} />
              Home
            </Link>
            
            {/* Guest Mode Indicator */}
            {isGuest && (
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                (Guest Mode)
              </span>
            )}
            
            {isAuthenticated && !isGuest && (
              <>
                <Link to="/dashboard" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors">
                  <Home size={18} />
                  Dashboard
                </Link>
                {!hideLinks.includes('notes') && (
                  <Link to="/notes" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors">
                    <FileText size={18} />
                    Notes
                  </Link>
                )}
                {!hideLinks.includes('ai-tools') && (
                  <Link to="/ai-tools" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors">
                    <Brain size={18} />
                    AI Tools
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Toggle - Show on mobile/tablet */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 text-gray-700 dark:text-gray-300 hover:text-primary-600"
          >
            {mobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>

          {/* User Menu - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated && !isGuest ? (
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-600">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-50">
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        to="/profile"
                        className={`flex items-center gap-2 px-4 py-2 text-sm ${
                          active ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                      >
                        <User size={16} />
                        Profile
                      </Link>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`flex items-center gap-2 px-4 py-2 text-sm w-full text-left ${
                          active ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 font-medium">
                  Login
                </Link>
                <Link to="/register" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-3 pt-4">
              <Link 
                to="/home" 
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 px-2 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home size={18} />
                Home
              </Link>
              
              {isAuthenticated && !isGuest && (
                <>
                  <Link 
                    to="/dashboard" 
                    className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 px-2 py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Home size={18} />
                    Dashboard
                  </Link>
                  {!hideLinks.includes('notes') && (
                    <Link 
                      to="/notes" 
                      className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 px-2 py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FileText size={18} />
                      Notes
                    </Link>
                  )}
                  {!hideLinks.includes('ai-tools') && (
                    <Link 
                      to="/ai-tools" 
                      className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 px-2 py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Brain size={18} />
                      AI Tools
                    </Link>
                  )}
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 px-2 py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User size={18} />
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 px-2 py-2 w-full text-left font-medium"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </>
              )}
              
              {!isAuthenticated || isGuest ? (
                <>
                  <Link 
                    to="/login" 
                    className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 px-2 py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
