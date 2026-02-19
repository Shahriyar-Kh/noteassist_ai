import { useState, useEffect } from 'react';
import { User, Mail, MapPin, BookOpen, Globe, Clock, Target, Bell, Lock, Camera, Save, X, Calendar, TrendingUp, FileText, Award, Loader2, Loader } from 'lucide-react';
import { profileService } from '@/services/profile.service';
import { toast } from 'react-hot-toast';

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Loading states for different actions
  const [loadingSaveProfile, setLoadingSaveProfile] = useState(false);
  const [loadingSavePreferences, setLoadingSavePreferences] = useState(false);
  const [loadingSaveNotifications, setLoadingSaveNotifications] = useState(false);
  const [loadingChangePassword, setLoadingChangePassword] = useState(false);
  const [loadingDeleteAccount, setLoadingDeleteAccount] = useState(false);
  const [loadingUploadAvatar, setLoadingUploadAvatar] = useState(false);
  
  // Real user data from API
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    country: '',
    educationLevel: '',
    fieldOfStudy: '',
    bio: '',
    learningGoal: '',
    preferredStudyHours: 2,
    timezone: 'UTC',
    avatar: null,
    skillInterests: [],
  });

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    weekly_summary: true,
    study_reminders: true,
  });

  const [stats, setStats] = useState({
    totalStudyDays: 0,
    totalNotes: 0,
    activeNotes: 0,
    lastLogin: null,
    accountCreated: null,
    emailVerified: false,
    currentStreak: 0,
    longestStreak: 0,
  });

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });

  // Fetch profile data on mount
  useEffect(() => {
    fetchProfileData();
    fetchActivityData();
    fetchNotifications();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await profileService.getProfile();
      
      setUserData({
        fullName: response.fullName || '',
        email: response.email || '',
        country: response.country || '',
        educationLevel: response.educationLevel || '',
        fieldOfStudy: response.fieldOfStudy || '',
        bio: response.bio || '',
        learningGoal: response.learningGoal || '',
        preferredStudyHours: response.preferredStudyHours || 2,
        timezone: response.timezone || 'UTC',
        avatar: response.avatar || null,
        skillInterests: response.skillInterests || [],
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityData = async () => {
    try {
      const response = await profileService.getActivitySummary();
      
      setStats({
        totalStudyDays: response.totalStudyDays || 0,
        totalNotes: response.totalNotes || 0,
        activeNotes: response.activeNotes || 0,
        lastLogin: response.lastLogin || null,
        accountCreated: response.accountCreated || null,
        emailVerified: response.emailVerified || false,
        currentStreak: response.currentStreak || 0,
        longestStreak: response.longestStreak || 0,
      });
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await profileService.updateNotifications({});
      setNotifications({
        email_notifications: response.email_notifications !== undefined ? response.email_notifications : true,
        weekly_summary: response.weekly_summary !== undefined ? response.weekly_summary : true,
        study_reminders: response.study_reminders !== undefined ? response.study_reminders : true,
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage({ file, preview: reader.result });
        setShowImageCrop(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedImage) return;

    try {
      setSaving(true);
      const response = await profileService.uploadAvatar(selectedImage.file);
      
      if (response.success) {
        setUserData({ ...userData, avatar: response.avatar });
        toast.success('Avatar updated successfully!');
        setShowImageCrop(false);
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(error.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoadingSaveProfile(true);
      const response = await profileService.updateProfile({
        fullName: userData.fullName,
        country: userData.country,
        educationLevel: userData.educationLevel,
        fieldOfStudy: userData.fieldOfStudy,
        bio: userData.bio,
      });

      if (response.success) {
        toast.success('✨ Profile updated successfully!');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('❌ ' + (error.response?.data?.error || 'Failed to update profile'));
    } finally {
      setLoadingSaveProfile(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setLoadingSavePreferences(true);
      const response = await profileService.updatePreferences({
        learningGoal: userData.learningGoal,
        preferredStudyHours: userData.preferredStudyHours,
        timezone: userData.timezone,
        skillInterests: userData.skillInterests,
      });

      if (response.success) {
        toast.success('✨ Preferences updated successfully!');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('❌ ' + (error.response?.data?.error || 'Failed to update preferences'));
    } finally {
      setLoadingSavePreferences(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setLoadingSaveNotifications(true);
      const response = await profileService.updateNotifications(notifications);

      if (response.success) {
        toast.success('✨ Notification settings updated!');
      }
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error('❌ Failed to update notification settings');
    } finally {
      setLoadingSaveNotifications(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.new_password_confirm) {
      toast.error('❌ New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 8) {
      toast.error('❌ Password must be at least 8 characters');
      return;
    }

    try {
      setLoadingChangePassword(true);
      const response = await profileService.changePassword(passwordData);

      if (response.success) {
        toast.success('✨ Password changed successfully!');
        setPasswordData({
          old_password: '',
          new_password: '',
          new_password_confirm: '',
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('❌ ' + (error.response?.data?.errors?.old_password?.[0] || 'Failed to change password'));
    } finally {
      setLoadingChangePassword(false);
    }
  };

  const handleAddSkill = () => {
    const skill = prompt('Enter skill name:');
    if (skill && !userData.skillInterests.includes(skill)) {
      setUserData({
        ...userData,
        skillInterests: [...userData.skillInterests, skill],
      });
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setUserData({
      ...userData,
      skillInterests: userData.skillInterests.filter(skill => skill !== skillToRemove),
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 60) return `${diffInMins} minutes ago`;
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${diffInDays} days ago`;
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'preferences', label: 'Study Preferences', icon: Target },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'activity', label: 'Account Activity', icon: TrendingUp },
  ];

  const educationLevels = [
    { value: 'high_school', label: 'High School' },
    { value: 'undergraduate', label: 'Undergraduate' },
    { value: 'graduate', label: 'Graduate' },
    { value: 'postgraduate', label: 'Postgraduate' },
    { value: 'professional', label: 'Professional' },
  ];

  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Karachi', label: 'Pakistan (PKT)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Shanghai', label: 'China (CST)' },
    { value: 'Asia/Tokyo', label: 'Japan (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:px-4 sm:py-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Profile Settings</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sidebar - Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-8">
              {/* Avatar Section */}
              <div className="text-center mb-4 sm:mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl font-bold mx-auto mb-3 sm:mb-4 overflow-hidden">
                    {userData.avatar ? (
                      <img src={userData.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      userData.fullName?.charAt(0) || userData.email?.charAt(0) || 'U'
                    )}
                  </div>
                  <button
                    onClick={() => document.getElementById('avatar-upload').click()}
                    className="absolute bottom-3 sm:bottom-4 right-0 p-1.5 sm:p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">{userData.fullName || 'User'}</h2>
                <p className="text-gray-600 text-xs sm:text-sm truncate max-w-[200px] mx-auto">{userData.email}</p>
                {stats.emailVerified && (
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    <Award className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-3 sm:gap-4 lg:space-y-3 lg:gap-0 border-t pt-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between lg:flex-row bg-gray-50 lg:bg-transparent p-2 sm:p-0 rounded-lg lg:rounded-none">
                  <span className="text-xs sm:text-sm text-gray-600">Study Days</span>
                  <span className="font-bold text-gray-900 text-sm sm:text-base">{stats.totalStudyDays}</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between lg:flex-row bg-gray-50 lg:bg-transparent p-2 sm:p-0 rounded-lg lg:rounded-none">
                  <span className="text-xs sm:text-sm text-gray-600">Current Streak</span>
                  <span className="font-bold text-orange-600 text-sm sm:text-base">{stats.currentStreak} days</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between lg:flex-row bg-gray-50 lg:bg-transparent p-2 sm:p-0 rounded-lg lg:rounded-none">
                  <span className="text-xs sm:text-sm text-gray-600">Total Notes</span>
                  <span className="font-bold text-gray-900 text-sm sm:text-base">{stats.totalNotes}</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between lg:flex-row bg-gray-50 lg:bg-transparent p-2 sm:p-0 rounded-lg lg:rounded-none">
                  <span className="text-xs sm:text-sm text-gray-600">Active Notes</span>
                  <span className="font-bold text-gray-900 text-sm sm:text-base">{stats.activeNotes}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg mb-4 sm:mb-6 overflow-hidden">
              <div className="flex overflow-x-auto border-b scrollbar-hide">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                        activeTab === tab.id
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden xs:inline sm:inline">{tab.label}</span>
                      <span className="xs:hidden sm:hidden">{tab.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
              {/* Personal Info Tab */}
              {activeTab === 'personal' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Personal Information</h3>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                      >
                        Edit Profile
                      </button>
                    ) : (
                      <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
                        <button
                          onClick={handleSaveProfile}
                          disabled={loadingSaveProfile}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                        >
                          {loadingSaveProfile ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          disabled={saving}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                        <input
                          type="text"
                          value={userData.fullName}
                          onChange={(e) => setUserData({ ...userData, fullName: e.target.value })}
                          disabled={!isEditing}
                          className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                        <input
                          type="email"
                          value={userData.email}
                          disabled
                          className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed truncate"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Country</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                        <input
                          type="text"
                          value={userData.country}
                          onChange={(e) => setUserData({ ...userData, country: e.target.value })}
                          disabled={!isEditing}
                          className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Education Level</label>
                      <select
                        value={userData.educationLevel}
                        onChange={(e) => setUserData({ ...userData, educationLevel: e.target.value })}
                        disabled={!isEditing}
                        className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                      >
                        <option value="">Select education level</option>
                        {educationLevels.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Field of Study</label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                        <input
                          type="text"
                          value={userData.fieldOfStudy}
                          onChange={(e) => setUserData({ ...userData, fieldOfStudy: e.target.value })}
                          disabled={!isEditing}
                          className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Bio</label>
                      <textarea
                        value={userData.bio}
                        onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                        disabled={!isEditing}
                        rows={3}
                        maxLength={2000}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 resize-none"
                        placeholder="Tell us about yourself..."
                      />
                      <p className="text-xs text-gray-500 mt-1">{userData.bio.length}/2000 characters</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Study Preferences Tab */}
              {activeTab === 'preferences' && (
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Study Preferences</h3>
                  
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Learning Goal</label>
                      <textarea
                        value={userData.learningGoal}
                        onChange={(e) => setUserData({ ...userData, learningGoal: e.target.value })}
                        rows={3}
                        maxLength={1000}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="What do you want to achieve?"
                      />
                      <p className="text-xs text-gray-500 mt-1">{userData.learningGoal.length}/1000 characters</p>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Preferred Study Hours per Day: {userData.preferredStudyHours} hours
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="12"
                        value={userData.preferredStudyHours}
                        onChange={(e) => setUserData({ ...userData, preferredStudyHours: parseInt(e.target.value) })}
                        className="w-full h-2 accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1 hour</span>
                        <span>12 hours</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Timezone</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                        <select
                          value={userData.timezone}
                          onChange={(e) => setUserData({ ...userData, timezone: e.target.value })}
                          className="w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {timezones.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Skill Interests</label>
                      <div className="flex flex-wrap gap-2">
                        {userData.skillInterests.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium"
                          >
                            {skill}
                            <button 
                              onClick={() => handleRemoveSkill(skill)}
                              className="hover:text-blue-900"
                            >
                              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </span>
                        ))}
                        <button 
                          onClick={handleAddSkill}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-dashed border-gray-300 rounded-full text-xs sm:text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                        >
                          + Add Skill
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={handleSavePreferences}
                      disabled={loadingSavePreferences}
                      className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      {loadingSavePreferences ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          <span>Save Preferences</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Notification Settings</h3>
                  
                  <div className="space-y-3 sm:space-y-6">
                    {Object.entries(notifications).map(([key, value]) => (
                      <div key={key} className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                            {key === 'email_notifications' && 'Receive email notifications for important updates'}
                            {key === 'weekly_summary' && 'Get a weekly summary of your learning progress'}
                            {key === 'study_reminders' && 'Receive reminders about your active notes'}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const newNotifications = { ...notifications, [key]: !value };
                            setNotifications(newNotifications);
                            handleSaveNotifications();
                          }}
                          disabled={loadingSaveNotifications}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            value ? 'bg-blue-600' : 'bg-gray-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Security Settings</h3>
                  
                  <div className="space-y-4 sm:space-y-6">
                    <div className="p-4 sm:p-6 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Change Password</h4>
                      <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Current Password</label>
                          <input
                            type="password"
                            value={passwordData.old_password}
                            onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                            required
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">New Password</label>
                          <input
                            type="password"
                            value={passwordData.new_password}
                            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                            required
                            minLength={8}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            value={passwordData.new_password_confirm}
                            onChange={(e) => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
                            required
                            minLength={8}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="••••••••"
                          />
                        </div>
                        <button 
                          type="submit"
                          disabled={loadingChangePassword}
                          className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                          {loadingChangePassword ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <span>Update Password</span>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Activity Tab */}
              {activeTab === 'activity' && (
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Account Activity</h3>
                  
                  <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
                    <div className="p-3 sm:p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <span className="text-xs sm:text-sm text-blue-600 font-medium">Total Study Days</span>
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <div className="text-xl sm:text-3xl font-bold text-blue-900">{stats.totalStudyDays}</div>
                    </div>

                    <div className="p-3 sm:p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <span className="text-xs sm:text-sm text-purple-600 font-medium">Total Notes</span>
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      </div>
                      <div className="text-xl sm:text-3xl font-bold text-purple-900">{stats.totalNotes}</div>
                    </div>

                    <div className="p-3 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <span className="text-xs sm:text-sm text-green-600 font-medium">Active Notes</span>
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      </div>
                      <div className="text-xl sm:text-3xl font-bold text-green-900">{stats.activeNotes}</div>
                    </div>

                    <div className="p-3 sm:p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <span className="text-xs sm:text-sm text-orange-600 font-medium">Best Streak</span>
                        <Award className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                      </div>
                      <div className="text-xl sm:text-3xl font-bold text-orange-900">{stats.longestStreak} days</div>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <span className="text-sm sm:text-base text-gray-700">Last Login</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">{formatRelativeTime(stats.lastLogin)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <span className="text-sm sm:text-base text-gray-700">Account Created</span>
                      <span className="font-medium text-gray-900 text-xs sm:text-base">{formatDate(stats.accountCreated)}</span>
                    </div>
                    <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-0 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <span className="text-sm sm:text-base text-gray-700">Email Status</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                        stats.emailVerified 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {stats.emailVerified ? 'Verified' : 'Not Verified'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Crop Modal */}
      {showImageCrop && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full mx-3">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Upload Profile Picture</h3>
            <div className="mb-3 sm:mb-4">
              <img src={selectedImage.preview} alt="Preview" className="w-full rounded-lg max-h-[50vh] object-contain" />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleAvatarUpload}
                disabled={saving}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save
              </button>
              <button
                onClick={() => {
                  setShowImageCrop(false);
                  setSelectedImage(null);
                }}
                disabled={saving}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;