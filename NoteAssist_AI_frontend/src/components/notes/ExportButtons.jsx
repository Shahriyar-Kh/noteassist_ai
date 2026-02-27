// FILE: NoteAssist_AI_frontend/src/components/notes/ExportButtons.jsx
// Adds "Preview PDF" button that opens the PDF inline in a new browser tab

import React, { useState, useEffect, useRef } from 'react';
import {
  Download, Cloud, CheckCircle, AlertCircle,
  Link as LinkIcon, Eye, Loader, X
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';

// ─── Inline PDF Preview Modal ─────────────────────────────────────────────
const PDFPreviewModal = ({ blobUrl, filename, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3
                      bg-gray-900 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Eye size={18} className="text-blue-400" />
          <span className="text-white font-semibold text-sm truncate max-w-xs">
            {filename}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Download from preview */}
          <a
            href={blobUrl}
            download={filename}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white
                       rounded-lg text-sm hover:bg-green-700 transition"
          >
            <Download size={14} />
            Download
          </a>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
            title="Close preview (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* PDF iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={blobUrl}
          title="PDF Preview"
          className="w-full h-full border-0"
          style={{ minHeight: 0 }}
        />
      </div>
    </div>
  );
};


// ─── Main ExportButtons ───────────────────────────────────────────────────
const ExportButtons = ({ note, onDriveStatusChange }) => {
  const [exporting,       setExporting]       = useState(false);
  const [previewing,      setPreviewing]       = useState(false);
  const [uploadingDrive,  setUploadingDrive]  = useState(false);
  const [driveStatus,     setDriveStatus]     = useState({ connected: false, checking: true });

  // Preview state
  const [previewUrl,      setPreviewUrl]      = useState(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const previewUrlRef = useRef(null);   // track for revoke

  useEffect(() => {
    checkDriveStatus();
    // Revoke any lingering preview URL on unmount
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const checkDriveStatus = async () => {
    try {
      const res = await api.get('/api/notes/drive_status/');
      setDriveStatus({ connected: res.data.connected, can_export: res.data.can_export, checking: false });
      onDriveStatusChange?.(res.data);
    } catch {
      setDriveStatus({ connected: false, can_export: false, checking: false });
    }
  };

  // ── Shared: fetch the PDF blob ─────────────────────────────────────────
  const fetchPDFBlob = async () => {
    const res = await api.post(
      `/api/notes/${note.id}/export_pdf/`,
      {},
      {
        responseType: 'blob',
        timeout: 5 * 60 * 1000,
        validateStatus: (s) => s < 500,
      }
    );

    const ct = res.headers['content-type'] || '';
    if (!ct.includes('application/pdf')) {
      const text = await res.data.text();
      try { throw new Error(JSON.parse(text).error || 'Server error'); }
      catch { throw new Error('PDF generation failed'); }
    }

    return new Blob([res.data], { type: 'application/pdf' });
  };

  const safeFilename = () => {
    const safe = (note.title || 'note').replace(/[^\w\-]/g, '_');
    const d    = new Date().toISOString().split('T')[0];
    return `${safe}_${d}.pdf`;
  };

  // ── Download ───────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const blob = await fetchPDFBlob();
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = safeFilename();
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 1000);
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      logger.error('Export error:', err);
      toast.error(err.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  // ── Preview ────────────────────────────────────────────────────────────
  const handlePreviewPDF = async () => {
    setPreviewing(true);
    try {
      const blob = await fetchPDFBlob();

      // Revoke previous URL if any
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewFilename(safeFilename());
      setPreviewUrl(url);
    } catch (err) {
      logger.error('Preview error:', err);
      toast.error(err.message || 'Failed to generate preview');
    } finally {
      setPreviewing(false);
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
    // Keep the blob URL alive briefly so the modal fade doesn't flash
    setTimeout(() => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    }, 500);
  };

  // ── Google Drive ───────────────────────────────────────────────────────
  const handleConnectDrive = async () => {
    try {
      const res = await api.get('/api/notes/google_auth_url/');
      if (!res.data.auth_url) return;

      const popup = window.open(res.data.auth_url, 'Google Drive Auth',
        'width=600,height=700,left=100,top=100');

      const onMsg = (e) => {
        if (e.data.type === 'google-auth-success') {
          toast.success('Google Drive connected!');
          checkDriveStatus();
          popup?.close();
        } else if (e.data.type === 'google-auth-error') {
          toast.error('Failed to connect Google Drive');
          popup?.close();
        }
      };
      window.addEventListener('message', onMsg);

      const check = setInterval(() => {
        if (popup?.closed) { clearInterval(check); window.removeEventListener('message', onMsg); checkDriveStatus(); }
      }, 500);
    } catch {
      toast.error('Failed to start Google Drive connection');
    }
  };

  const handleExportToDrive = async () => {
    if (!driveStatus.connected) { handleConnectDrive(); return; }
    setUploadingDrive(true);
    try {
      const res = await api.post(`/api/notes/${note.id}/export_to_drive/`);
      if (res.data.success) {
        toast.success(
          <div>
            <p>{res.data.updated ? 'Note updated in Google Drive!' : 'Note uploaded to Google Drive!'}</p>
            {res.data.drive_link && (
              <a href={res.data.drive_link} target="_blank" rel="noopener noreferrer"
                 className="text-blue-600 underline flex items-center gap-1 mt-1">
                <LinkIcon size={14} /> Open in Drive
              </a>
            )}
          </div>,
          { duration: 5000 }
        );
      } else if (res.data.needs_auth) {
        toast.error('Please reconnect Google Drive');
        handleConnectDrive();
      } else {
        toast.error(res.data.error || 'Upload failed');
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.data?.needs_auth) {
        toast.error('Please reconnect Google Drive');
        handleConnectDrive();
      } else {
        toast.error(err.response?.data?.error || 'Failed to upload to Drive');
      }
    } finally {
      setUploadingDrive(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Preview Modal */}
      {previewUrl && (
        <PDFPreviewModal
          blobUrl={previewUrl}
          filename={previewFilename}
          onClose={closePreview}
        />
      )}

      <div className="flex gap-2 flex-wrap items-center">
        {/* Drive status badge */}
        {!driveStatus.checking && (
          <div className="flex items-center gap-1.5 px-3 py-1.5
                          bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-medium">
            {driveStatus.connected
              ? <><CheckCircle size={13} className="text-green-500" />
                  <span className="text-green-700 dark:text-green-400">Drive Connected</span></>
              : <><AlertCircle size={13} className="text-orange-500" />
                  <span className="text-orange-700 dark:text-orange-400">Drive Not Connected</span></>
            }
          </div>
        )}

        {/* ── Preview Button ── */}
        <button
          onClick={handlePreviewPDF}
          disabled={previewing || exporting}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white
                     rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition
                     text-sm font-medium"
          title="Preview PDF in browser"
        >
          {previewing
            ? <><Loader size={15} className="animate-spin" />Generating…</>
            : <><Eye size={15} />Preview PDF</>
          }
        </button>

        {/* ── Download Button ── */}
        <button
          onClick={handleExportPDF}
          disabled={exporting || previewing}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white
                     rounded-lg hover:bg-green-700 disabled:opacity-50 transition
                     text-sm font-medium"
          title="Download PDF"
        >
          {exporting
            ? <><Loader size={15} className="animate-spin" />Exporting…</>
            : <><Download size={15} />Export PDF</>
          }
        </button>

        {/* ── Google Drive Button ── */}
        <button
          onClick={handleExportToDrive}
          disabled={uploadingDrive}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition
                      disabled:opacity-50 text-sm font-medium text-white ${
            driveStatus.connected
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-orange-500 hover:bg-orange-600'
          }`}
        >
          {uploadingDrive
            ? <><Loader size={15} className="animate-spin" />Uploading…</>
            : <><Cloud size={15} />{driveStatus.connected ? 'Upload to Drive' : 'Connect Drive'}</>
          }
        </button>
      </div>
    </>
  );
};

export default ExportButtons;