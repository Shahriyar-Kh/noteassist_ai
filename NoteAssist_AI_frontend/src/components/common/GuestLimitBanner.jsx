// Guest Limit Banner Component
// Shows guest users their usage limits and encourages signup
// ============================================================================

import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import PropTypes from 'prop-types';

const GuestLimitBanner = ({ featureName, currentUsage, maxUsage }) => {
  const { isGuest } = useSelector((state) => state.auth);

  if (!isGuest) return null;

  const usagePercentage = (currentUsage / maxUsage) * 100;
  const isLimitReached = currentUsage >= maxUsage;

  return (
    <div className={`mb-6 rounded-lg border-2 p-4 ${
      isLimitReached 
        ? 'bg-red-50 border-red-200' 
        : usagePercentage >= 80 
        ? 'bg-yellow-50 border-yellow-200' 
        : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          isLimitReached ? 'text-red-600' : usagePercentage >= 80 ? 'text-yellow-600' : 'text-blue-600'
        }`} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold ${
              isLimitReached ? 'text-red-900' : usagePercentage >= 80 ? 'text-yellow-900' : 'text-blue-900'
            }`}>
              {isLimitReached ? '🎯 Free Trial Complete!' : '🎉 Free Trial Mode'}
            </h3>
            <span className={`text-sm font-medium ${
              isLimitReached ? 'text-red-700' : usagePercentage >= 80 ? 'text-yellow-700' : 'text-blue-700'
            }`}>
              {currentUsage}/{maxUsage} {featureName}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className={`h-2 rounded-full transition-all ${
                isLimitReached ? 'bg-red-500' : usagePercentage >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          
          <p className={`text-sm mb-3 ${
            isLimitReached ? 'text-red-700' : usagePercentage >= 80 ? 'text-yellow-700' : 'text-blue-700'
          }`}>
            {isLimitReached 
              ? `You've used all ${maxUsage} free ${featureName}. Create an account to continue using NoteAssist AI!`
              : `You have ${maxUsage - currentUsage} ${featureName} remaining. Sign up for unlimited access!`
            }
          </p>
          
          <div className="flex gap-2">
            <Link 
              to="/register"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isLimitReached 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Sign Up Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Already have an account?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

GuestLimitBanner.propTypes = {
  featureName: PropTypes.string.isRequired,
  currentUsage: PropTypes.number.isRequired,
  maxUsage: PropTypes.number.isRequired,
};

export default GuestLimitBanner;
