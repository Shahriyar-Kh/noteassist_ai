// FILE: ModernNotesPage.jsx - BEAUTIFUL & FULLY FUNCTIONAL
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Plus, FileText, Search, Filter, Grid, List as ListIcon,
  BookOpen, Sparkles, TrendingUp, Clock, Tag, Trash2,
  Edit, Eye, BarChart3, Download, Share2, Save, X,
  AlertCircle, CheckCircle2, Info, ChevronRight, ChevronDown,
  Loader, ExternalLink, Copy, MoreVertical, Calendar,
  FolderPlus, Folder, FileCode, Link, Upload, ArrowLeft, LogIn
} from 'lucide-react';
import { noteService } from '@/services/note.service';
import NoteStructure from '@/components/notes/NoteStructure';
import TopicEditor from '@/components/notes/TopicEditor';
import ExportButtons from '@/components/notes/ExportButtons';
import DailyReportModal from '@/components/notes/DailyReportModal';
import '../styles/animations.css';

const NotesPage = () => {
  // ✅ Check auth status
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  
  // State from old functional file
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  
  // Loading states for different actions
  const [loadingCreateNote, setLoadingCreateNote] = useState(false);
  const [loadingDeleteNote, setLoadingDeleteNote] = useState(false);
  const [loadingCreateChapter, setLoadingCreateChapter] = useState(false);
  const [loadingUpdateTitle, setLoadingUpdateTitle] = useState(false);
  
  // Modals (from old file)
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showNewChapterModal, setShowNewChapterModal] = useState(false);
  const [showTopicEditor, setShowTopicEditor] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  
  // Delete confirmation (from old file)
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Toast notifications (from old file)
  const [toast, setToast] = useState(null);
  
  // Note title editing (from old file)
  const [editingNoteTitle, setEditingNoteTitle] = useState(false);
  const [noteTitleValue, setNoteTitleValue] = useState('');
  
  // New note/chapter input
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // Stats calculation
  const stats = {
    total: notes.length,
    draft: notes.filter(n => n.status === 'draft').length,
    published: notes.filter(n => n.status === 'published').length,
    totalChapters: notes.reduce((sum, n) => sum + (n.chapter_count || 0), 0),
    totalTopics: notes.reduce((sum, n) => sum + (n.total_topics || 0), 0),
  };

  // ================ FUNCTIONALITY FROM OLD FILE ================

  useEffect(() => {
    // ✅ Skip loading if user is not authenticated (guest)
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    fetchNotes();
  }, [statusFilter, isAuthenticated]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const data = await noteService.getNotes(params);
      setNotes(data.results || data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      showToast('Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchNoteDetail = async (noteId) => {
    try {
      const data = await noteService.getNoteStructure(noteId);
      setSelectedNote(data);
      setNoteTitleValue(data.title);
    } catch (error) {
      console.error('Error fetching note detail:', error);
      showToast('Failed to load note details', 'error');
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) {
      showToast('Please enter a note title', 'error');
      return;
    }
    
    setLoadingCreateNote(true);
    try {
      const newNote = await noteService.createNote({ 
        title: newNoteTitle.trim(), 
        status: 'draft' 
      });
      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
      setNoteTitleValue(newNote.title);
      setNewNoteTitle('');
      setShowNewNoteModal(false);
      showToast('✨ Note created successfully!', 'success');
    } catch (error) {
      console.error('Error creating note:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create note';
      showToast('❌ ' + errorMessage, 'error');
    } finally {
      setLoadingCreateNote(false);
    }
  };

  const handleUpdateNoteTitle = async () => {
    if (!selectedNote || !noteTitleValue.trim()) {
      setEditingNoteTitle(false);
      setNoteTitleValue(selectedNote?.title || '');
      return;
    }
    
    if (noteTitleValue === selectedNote.title) {
      setEditingNoteTitle(false);
      return;
    }
    
    setLoadingUpdateTitle(true);
    try {
      await noteService.updateNote(selectedNote.id, { title: noteTitleValue });
      setSelectedNote({ ...selectedNote, title: noteTitleValue });
      await fetchNotes();
      setEditingNoteTitle(false);
      showToast('✨ Note title updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating note title:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update note title';
      showToast('❌ ' + errorMessage, 'error');
      setNoteTitleValue(selectedNote.title);
      setEditingNoteTitle(false);
    } finally {
      setLoadingUpdateTitle(false);
    }
  };

  const handleCreateChapter = async () => {
    if (!selectedNote || !newChapterTitle.trim()) {
      showToast('Please enter a chapter title', 'error');
      return;
    }
    
    setLoadingCreateChapter(true);
    try {
      await noteService.createChapter({ 
        note_id: selectedNote.id, 
        title: newChapterTitle.trim() 
      });
      await fetchNoteDetail(selectedNote.id);
      setNewChapterTitle('');
      setShowNewChapterModal(false);
      showToast('✨ Chapter created successfully!', 'success');
    } catch (error) {
      console.error('Error creating chapter:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create chapter';
      showToast('❌ ' + errorMessage, 'error');
    } finally {
      setLoadingCreateChapter(false);
    }
  };

  const handleStructureUpdate = async (action, data) => {
    switch (action) {
      case 'add-chapter':
        setShowNewChapterModal(true);
        break;
      case 'delete-chapter':
        setDeleteConfirm({
          type: 'chapter',
          id: data,
          message: 'Are you sure you want to delete this chapter and all its topics?'
        });
        break;
      case 'chapter':
        try {
          await noteService.updateChapter(data.id, { title: data.title });
          await fetchNoteDetail(selectedNote.id);
          showToast('Chapter updated successfully!');
        } catch (error) {
          showToast('Failed to update chapter', 'error');
        }
        break;
      case 'add-topic':
        setSelectedTopic({ chapter_id: data });
        setShowTopicEditor(true);
        break;
      case 'select-topic':
        await fetchTopicDetail(data);
        break;
      case 'delete-topic':
        setDeleteConfirm({
          type: 'topic',
          id: data,
          message: 'Are you sure you want to delete this topic?'
        });
        break;
      case 'topic':
        try {
          await noteService.updateTopic(data.id, { name: data.name });
          await fetchNoteDetail(selectedNote.id);
          showToast('Topic updated successfully!');
        } catch (error) {
          showToast('Failed to update topic', 'error');
        }
        break;
      case 'ai-topic':
        await fetchTopicDetail(data);
        break;
    }
  };

  const fetchTopicDetail = async (topicId) => {
    try {
      const data = await noteService.getTopicDetail(topicId);
      setSelectedTopic(data);
      setShowTopicEditor(true);
    } catch (error) {
      console.error('Error fetching topic:', error);
      showToast('Failed to load topic', 'error');
    }
  };

  const handleSaveTopic = async (topicData) => {
    try {
      if (selectedTopic?.id) {
        await noteService.updateTopic(selectedTopic.id, topicData);
        showToast('Topic updated successfully!');
      } else {
        await noteService.createTopic({
          ...topicData,
          chapter_id: selectedTopic.chapter_id
        });
        showToast('Topic created successfully!');
      }
      
      await fetchNoteDetail(selectedNote.id);
      setShowTopicEditor(false);
      setSelectedTopic(null);
    } catch (error) {
      console.error('Error saving topic:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save topic';
      throw new Error(errorMessage);
    }
  };

  const handleAIAction = async (action, input, language) => {
    try {
      if (!selectedTopic?.id) {
        throw new Error('Please save the topic first before using AI features');
      }
      
      const data = await noteService.performAIAction(selectedTopic.id, {
        action_type: action,
        input_content: input,
        language: language
      });
      
      const actionMessages = {
        'generate_explanation': 'Explanation generated successfully!',
        'improve_explanation': 'Explanation improved successfully!',
        'summarize_explanation': 'Summary generated successfully!',
        'generate_code': 'Code generated successfully!'
      };
      showToast(actionMessages[action] || 'AI action completed!', 'info');
      
      return data.generated_content;
    } catch (error) {
      console.error('AI action error:', error);
      const errorMessage = error.response?.data?.error || 'AI action failed';
      throw new Error(errorMessage);
    }
  };

  const handleDeleteNote = () => {
    if (!selectedNote) return;
    setDeleteConfirm({
      type: 'note',
      id: selectedNote.id,
      message: `Are you sure you want to delete "${selectedNote.title}" and all its content?`
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    setLoadingDeleteNote(true);
    try {
      if (deleteConfirm.type === 'note') {
        await noteService.deleteNote(deleteConfirm.id);
        setSelectedNote(null);
        setNoteTitleValue('');
        await fetchNotes();
        showToast('✨ Note deleted successfully!', 'success');
      } else if (deleteConfirm.type === 'chapter') {
        await noteService.deleteChapter(deleteConfirm.id);
        if (selectedNote) {
          await fetchNoteDetail(selectedNote.id);
        }
        showToast('✨ Chapter deleted successfully!', 'success');
      } else if (deleteConfirm.type === 'topic') {
        await noteService.deleteTopic(deleteConfirm.id);
        if (selectedNote) {
          await fetchNoteDetail(selectedNote.id);
        }
        showToast('✨ Topic deleted successfully!', 'success');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete';
      showToast('❌ ' + errorMessage, 'error');
    } finally {
      setDeleteConfirm(null);
      setLoadingDeleteNote(false);
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || note.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ================ RENDER ================

  // Helper function to handle guest clicks
  const handleGuestAction = (action) => {
    if (!isAuthenticated) {
      showToast('Please sign in to use this feature', 'info');
      setTimeout(() => navigate('/login'), 1500);
      return false;
    }
    return true;
  };

  const handleCreateNoteClick = () => {
    if (handleGuestAction('create')) {
      setShowNewNoteModal(true);
    }
  };

  const handleDailyReportClick = () => {
    if (handleGuestAction('report')) {
      setShowDailyReport(true);
    }
  };

  return (
    <>
      <Helmet>
        <title>Study Notes - NoteAssist AI | Organize Your Learning</title>
        <meta name="description" content="Create, organize, and manage your study notes with rich text formatting, AI assistance, and powerful export features." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/10 dark:to-indigo-900/10">
        
        {/* Toast Notifications */}
        {toast && (
          <div className="fixed top-24 right-4 z-50 animate-slideInRight">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-lg ${
              toast.type === 'success' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-l-4 border-emerald-700' 
                : toast.type === 'error'
                ? 'bg-gradient-to-r from-red-500 to-rose-600 border-l-4 border-rose-700'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 border-l-4 border-indigo-700'
            }`}>
              <span className="text-white font-medium">{toast.message}</span>
              <button onClick={() => setToast(null)} className="text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Guest Banner */}
        {!isAuthenticated && (
          <div className="bg-amber-50 border-b-2 border-amber-200 animate-fade-in">
            <div className="container mx-auto px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-amber-900 font-medium">
                    You're viewing as a guest. <span className="font-bold">Sign in to create and manage your notes.</span>
                  </p>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors flex-shrink-0"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl animate-fade-in-down">
          <div className="container mx-auto px-6 py-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-6">
              <div className="space-y-2 animate-fade-in-up">
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight flex items-center gap-4">
                  <BookOpen className="w-10 h-10 lg:w-12 lg:h-12 animate-bounce" />
                  Full Study Notes
                </h1>
                <p className="text-blue-100 text-lg font-medium">
                  Organize your learning with rich text formatting & AI assistance
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDailyReportClick}
                  className={`group flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl border animate-fade-in-up hover-lift ${
                    !isAuthenticated 
                      ? 'bg-white/10 hover:bg-white/20 backdrop-blur-lg border-white/20 opacity-75 cursor-not-allowed'
                      : 'bg-white/10 hover:bg-white/20 backdrop-blur-lg border-white/20'
                  }`}
                  style={{ animationDelay: '0.1s' }}
                  disabled={!isAuthenticated}
                >
                  <BarChart3 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span className="font-semibold">{!isAuthenticated ? 'Daily Report (Sign in)' : 'Daily Report'}</span>
                </button>
                <button
                  onClick={handleCreateNoteClick}
                  className={`group flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl font-bold animate-fade-in-up hover-lift ${
                    !isAuthenticated 
                      ? 'bg-white text-blue-600 bg-opacity-50 cursor-not-allowed'
                      : 'bg-white text-blue-600'
                  }`}
                  style={{ animationDelay: '0.2s' }}
                  disabled={!isAuthenticated}
                >
                  <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  {!isAuthenticated ? 'Create Note (Sign in)' : 'Create Note'}
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Notes', value: stats.total, icon: FileText, color: 'from-blue-400 to-blue-600' },
                { label: 'Draft', value: stats.draft, icon: Edit, color: 'from-yellow-400 to-orange-500' },
                { label: 'Published', value: stats.published, icon: Eye, color: 'from-green-400 to-emerald-600' },
                { label: 'Chapters', value: stats.totalChapters, icon: BookOpen, color: 'from-purple-400 to-purple-600' },
                { label: 'Topics', value: stats.totalTopics, icon: Tag, color: 'from-pink-400 to-rose-600' },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="group bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 cursor-pointer animate-fade-in hover-lift"
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white/80 group-hover:scale-110 transition-transform" />
                    <span className={`text-2xl lg:text-3xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                      {stat.value}
                    </span>
                  </div>
                  <div className="text-xs lg:text-sm text-white/80 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-lg animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="container mx-auto px-4 lg:px-6 py-4 lg:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search notes by title, tags, chapters..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 lg:py-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 font-semibold cursor-pointer hover:border-blue-500 transition-all"
                >
                  <option value="all">All Notes</option>
                  <option value="draft">Drafts</option>
                  <option value="published">Published</option>
                </select>

                <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all hover-lift ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600'
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    <Grid size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all hover-lift ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600'
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    <ListIcon size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 lg:px-6 py-6 lg:py-8">
          {selectedNote ? (
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={() => {
                  setSelectedNote(null);
                  setNoteTitleValue('');
                }}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-2"
              >
                <ArrowLeft size={20} />
                Back to All Notes
              </button>

              {/* Note Detail View */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 lg:p-8 border border-gray-200 dark:border-gray-700">
                {/* Note Header with Edit Title */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                  <div className="flex-1">
                    {editingNoteTitle ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={noteTitleValue}
                          onChange={(e) => setNoteTitleValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateNoteTitle();
                            if (e.key === 'Escape') {
                              setEditingNoteTitle(false);
                              setNoteTitleValue(selectedNote.title);
                            }
                          }}
                          className="flex-1 px-4 py-3 text-2xl lg:text-3xl font-bold border-2 border-blue-500 rounded-xl focus:ring-4 focus:ring-blue-500/20"
                          autoFocus
                          disabled={loadingUpdateTitle}
                        />
                        <button 
                          onClick={handleUpdateNoteTitle}
                          disabled={loadingUpdateTitle}
                          className="p-3 text-green-600 hover:bg-green-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={loadingUpdateTitle ? "Saving..." : "Save"}
                        >
                          {loadingUpdateTitle ? (
                            <Loader className="w-5 h-5 animate-spin" />
                          ) : (
                            <Save size={20} />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingNoteTitle(false);
                            setNoteTitleValue(selectedNote.title);
                          }}
                          disabled={loadingUpdateTitle}
                          className="p-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 group">
                        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white break-words">
                          {selectedNote.title}
                        </h2>
                        <button
                          onClick={() => setEditingNoteTitle(true)}
                          className="p-2 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <ExportButtons note={selectedNote} />
                    <button
                      onClick={handleDeleteNote}
                      className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Note Status & Info */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                    selectedNote.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedNote.status.charAt(0).toUpperCase() + selectedNote.status.slice(1)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <Calendar size={16} />
                    Created: {new Date(selectedNote.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <Clock size={16} />
                    Updated: {new Date(selectedNote.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Note Structure */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <NoteStructure 
                    note={selectedNote} 
                    onUpdate={handleStructureUpdate}
                  />
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Loading your notes...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <FileText className="w-16 h-16 text-blue-600" />
              </div>
              <h3 className="text-3xl font-bold mb-3 animate-fade-in-down">No Notes Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                {search ? 'Try a different search term' : 'Create your first note to get started'}
              </p>
              <button
                onClick={handleCreateNoteClick}
                className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 animate-fade-in-up ${
                  !isAuthenticated
                    ? 'bg-gradient-to-r from-blue-600/50 to-indigo-600/50 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                }`}
                style={{ animationDelay: '0.2s' }}
              >
                <Plus size={20} />
                {!isAuthenticated ? 'Sign In to Create Notes' : 'Create Your First Note'}
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
            }>
              {filteredNotes.map((note, index) => (
                <div
                  key={note.id}
                  onClick={() => fetchNoteDetail(note.id)}
                  className={`group bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] animate-fade-in hover-lift ${
                    viewMode === 'list' ? 'flex items-center p-6' : 'p-6'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">
                              {note.title}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                              note.status === 'published'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {note.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          <div className="text-2xl font-black text-blue-600">{note.chapter_count || 0}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Chapters</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                          <div className="text-2xl font-black text-purple-600">{note.total_topics || 0}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Topics</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-blue-600 font-semibold">Open</span>
                          <ChevronRight size={16} className="text-blue-600" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                          <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {note.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <Folder size={14} />
                              {note.chapter_count || 0} chapters
                            </span>
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <Tag size={14} />
                              {note.total_topics || 0} topics
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                              note.status === 'published'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {note.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-500">{new Date(note.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================ MODALS ================ */}
        
        {/* New Note Modal */}
        {showNewNoteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold">Create New Note</h3>
                </div>
                <button onClick={() => setShowNewNoteModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateNote()}
                placeholder="Enter note title..."
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl mb-6 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                autoFocus
              />
              
              <div className="flex gap-3">
                <button
                  onClick={handleCreateNote}
                  disabled={!newNoteTitle.trim() || loadingCreateNote}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingCreateNote ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Create Note</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowNewNoteModal(false)}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Chapter Modal */}
        {showNewChapterModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <FolderPlus className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold">Create New Chapter</h3>
                </div>
                <button onClick={() => setShowNewChapterModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateChapter()}
                placeholder="Enter chapter title..."
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl mb-6 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                autoFocus
              />
              
              <div className="flex gap-3">
                <button
                  onClick={handleCreateChapter}
                  disabled={!newChapterTitle.trim() || loadingCreateChapter}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingCreateChapter ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-5 h-5" />
                      <span>Create Chapter</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowNewChapterModal(false)}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Topic Editor Modal */}
        {showTopicEditor && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
              <TopicEditor
                topic={selectedTopic?.id ? selectedTopic : null}
                onSave={handleSaveTopic}
                onCancel={() => {
                  setShowTopicEditor(false);
                  setSelectedTopic(null);
                }}
                onAIAction={handleAIAction}
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Confirm Deletion</h3>
                  <p className="text-gray-600 dark:text-gray-400">{deleteConfirm.message}</p>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={loadingDeleteNote}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={loadingDeleteNote}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-rose-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingDeleteNote ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Modals */}
        <DailyReportModal 
          isOpen={showDailyReport} 
          onClose={() => setShowDailyReport(false)}
        />
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }

        .hover\:scale-\[1\.02\]:hover {
          transform: scale(1.02);
        }
      `}</style>
    </>
  );
};

export default NotesPage;