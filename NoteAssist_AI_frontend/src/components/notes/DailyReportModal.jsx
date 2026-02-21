// FILE: DailyReportModal.jsx - FIXED ENDPOINT
import React, { useEffect, useState } from 'react';
import { X, TrendingUp, BookOpen, Target, Clock } from 'lucide-react';
import api from '@/services/api';
import logger from '@/utils/logger';

const DailyReportModal = ({ isOpen, onClose, note }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  if (isOpen) {
    fetchDailyReport();
  }
}, [isOpen]);


  const fetchDailyReport = async () => {
    setLoading(true);
    try {
      logger.info('Fetching daily report...');
      // FIXED ENDPOINT - needs note ID
      const response = await api.get(`/api/notes/daily_report/`);
      logger.info('Daily report response:', response.data);
      
      if (response.data && response.data.success) {
        setReport(response.data.report);
      } else {
        window.toastManager?.addToast({
          type: 'error',
          title: 'Failed to Load Report',
          message: response.data?.error || 'Unknown error',
          duration: 5000
        });
      }
    } catch (error) {
      logger.error('Error fetching report:', error);
      logger.error('Error response:', error.response);
      
      if (error.response?.status === 401) {
        window.toastManager?.addToast({
          type: 'error',
          title: 'Authentication Required',
          message: 'Please login to view your daily report',
          duration: 5000
        });
      } else {
        window.toastManager?.addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load daily report',
          duration: 5000
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const [sendingEmail, setSendingEmail] = useState(false);

  const handleEmailReport = async (e) => {
    e?.preventDefault?.();
    setSendingEmail(true);
    
    try {
      logger.info('Sending daily report email...');
      const response = await api.post(`/api/notes/send_daily_report_email/`);
      
      logger.info('Response:', response.data);
      logger.info('window.toastManager exists?', !!window.toastManager);
      
      if (response.data && response.data.success) {
        logger.info('Calling toast with success message');
        if (window.toastManager && typeof window.toastManager.addToast === 'function') {
          window.toastManager.addToast({
            type: 'success',
            title: 'Email Sent',
            message: 'Daily report sent successfully to your email!',
            duration: 4000
          });
          logger.info('✅ Toast addToast called successfully');
        } else {
          logger.error('❌ window.toastManager.addToast is not available:', window.toastManager);
        }
      } else {
        const errorMsg = response.data?.error || 'Failed to send report';
        if (window.toastManager && typeof window.toastManager.addToast === 'function') {
          window.toastManager.addToast({
            type: 'error',
            title: 'Failed to Send',
            message: errorMsg,
            duration: 5000
          });
        }
      }
    } catch (error) {
      logger.error('Error sending email:', error);
      logger.error('Error response:', error.response);
      logger.info('window.toastManager exists?', !!window.toastManager);
      
      if (error.response?.status === 401) {
        if (window.toastManager && typeof window.toastManager.addToast === 'function') {
          window.toastManager.addToast({
            type: 'error',
            title: 'Authentication Required',
            message: 'Please login to send email reports',
            duration: 5000
          });
        }
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.error || 'Invalid request';
        if (window.toastManager && typeof window.toastManager.addToast === 'function') {
          window.toastManager.addToast({
            type: 'error',
            title: 'Invalid Request',
            message: errorMsg,
            duration: 5000
          });
        }
      } else {
        const errorMsg = error.response?.data?.error || 'Failed to send report. Please try again.';
        if (window.toastManager && typeof window.toastManager.addToast === 'function') {
          window.toastManager.addToast({
            type: 'error',
            title: 'Error',
            message: errorMsg,
            duration: 5000
          });
          } else {
          logger.error('❌ window.toastManager.addToast is not available');
        }
      }
    } finally {
      setSendingEmail(false);
    }
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold">Today's Learning Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading report...</p>
          </div>
        ) : report ? (
          <div className="p-6">
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={20} className="text-blue-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Notes Created</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{report.notes_created}</p>
              </div>

              <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={20} className="text-green-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Notes Updated</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{report.notes_updated}</p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={20} className="text-purple-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Topics Added</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">{report.topics_created}</p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={20} className="text-orange-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Study Time</span>
                </div>
                <p className="text-3xl font-bold text-orange-600">{report.study_time_estimate}m</p>
              </div>
            </div>

            {/* Notes List */}
            {report.notes_list && report.notes_list.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Notes Worked On Today</h3>
                <div className="space-y-2">
                  {report.notes_list.map((noteItem) => (
                    <div
                      key={noteItem.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-medium">{noteItem.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {noteItem.chapters_count} chapters • {noteItem.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleEmailReport}
              disabled={sendingEmail}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {sendingEmail ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                'Email This Report'
              )}
            </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-600">No activity today</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyReportModal;