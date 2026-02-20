// FILE: src/hooks/useDraftPersistence.js
// ============================================================================
// Draft Persistence Hook - Auto-save and restore drafts for all editor pages
// Features: Debounced auto-save, auto-restore, clear draft, beforeunload
// Works for both guest and authenticated users
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';

// ─── Constants ───────────────────────────────────────────────────────────────

const DRAFT_PREFIX = 'noteassist_draft_';
const DEBOUNCE_DELAY = 1000; // 1 second debounce
const MAX_STORAGE_SIZE = 4.5 * 1024 * 1024; // 4.5MB safety limit for localStorage

// ─── Storage Utilities ───────────────────────────────────────────────────────

/**
 * Safely get item from localStorage with error handling
 */
const safeGetItem = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.warn(`[DraftPersistence] Failed to read draft: ${key}`, error);
    return null;
  }
};

/**
 * Safely set item in localStorage with size check
 */
const safeSetItem = (key, value) => {
  try {
    const serialized = JSON.stringify(value);
    
    // Check if data is too large
    if (serialized.length > MAX_STORAGE_SIZE) {
      console.warn(`[DraftPersistence] Draft too large to save: ${key}`);
      return false;
    }
    
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    // Handle quota exceeded or other errors
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      console.warn(`[DraftPersistence] Storage quota exceeded: ${key}`);
      // Try to clear old drafts
      clearOldDrafts();
    } else {
      console.error(`[DraftPersistence] Failed to save draft: ${key}`, error);
    }
    return false;
  }
};

/**
 * Safely remove item from localStorage
 */
const safeRemoveItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[DraftPersistence] Failed to remove draft: ${key}`, error);
    return false;
  }
};

/**
 * Clear old drafts older than 7 days
 */
const clearOldDrafts = () => {
  try {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX)) {
        const draft = safeGetItem(key);
        if (draft && draft.timestamp && (now - draft.timestamp > sevenDays)) {
          safeRemoveItem(key);
        }
      }
    }
  } catch (error) {
    console.warn('[DraftPersistence] Failed to clear old drafts', error);
  }
};

// ─── Main Hook ───────────────────────────────────────────────────────────────

/**
 * Custom hook for draft persistence
 * 
 * @param {string} pageKey - Unique identifier for the page (e.g., 'manual-note-editor')
 * @param {Object} initialState - Initial state object with default values
 * @param {Object} options - Configuration options
 * @param {number} options.debounceDelay - Debounce delay in ms (default: 1000)
 * @param {boolean} options.showToasts - Show toast notifications (default: false for auto-save)
 * @param {Function} options.onRestore - Callback when draft is restored
 * @param {Function} options.onClear - Callback when draft is cleared
 * @param {boolean} options.warnOnUnload - Warn user before page unload if there's unsaved content
 * 
 * @returns {Object} - { state, setState, updateField, clearDraft, hasDraft, lastSaved, isDirty }
 */
export const useDraftPersistence = (pageKey, initialState = {}, options = {}) => {
  const {
    debounceDelay = DEBOUNCE_DELAY,
    showToasts = false,
    onRestore = null,
    onClear = null,
    warnOnUnload = true,
  } = options;

  const storageKey = `${DRAFT_PREFIX}${pageKey}`;
  
  // ── State
  const [state, setStateInternal] = useState(() => {
    // Try to restore from localStorage on initial load
    const savedDraft = safeGetItem(storageKey);
    if (savedDraft && savedDraft.data) {
      // Merge saved draft with initial state (in case new fields were added)
      return { ...initialState, ...savedDraft.data };
    }
    return initialState;
  });
  
  const [lastSaved, setLastSaved] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [hasDraft, setHasDraft] = useState(() => !!safeGetItem(storageKey));
  
  // ── Refs
  const debounceTimeoutRef = useRef(null);
  const isFirstMount = useRef(true);
  const stateRef = useRef(state);
  
  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Check if content has meaningful data (not just empty/default)
  const hasContent = useMemo(() => {
    return Object.entries(state).some(([key, value]) => {
      if (typeof value === 'string') {
        // For strings, check if not empty
        const trimmed = value.trim();
        // Skip HTML empty tags like <p><br></p>
        const stripped = trimmed.replace(/<[^>]*>/g, '').trim();
        return stripped.length > 0;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length > 0;
      }
      // For primitives, check if differs from initial
      return value !== initialState[key];
    });
  }, [state, initialState]);

  // ── Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (!hasContent) {
      // Don't save empty drafts
      return;
    }
    
    const draftData = {
      data: stateRef.current,
      timestamp: Date.now(),
      version: 1,
    };
    
    const success = safeSetItem(storageKey, draftData);
    
    if (success) {
      setLastSaved(new Date());
      setHasDraft(true);
      setIsDirty(false);
      
      if (showToasts) {
        toast.success('Draft saved', { duration: 1500, id: 'draft-saved' });
      }
    }
  }, [storageKey, hasContent, showToasts]);

  // ── Debounced auto-save
  const debouncedSave = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, debounceDelay);
  }, [saveDraft, debounceDelay]);

  // ── State setter with auto-save trigger
  const setState = useCallback((newStateOrUpdater) => {
    setStateInternal((prevState) => {
      const newState = typeof newStateOrUpdater === 'function' 
        ? newStateOrUpdater(prevState) 
        : newStateOrUpdater;
      return newState;
    });
    setIsDirty(true);
  }, []);

  // ── Update single field
  const updateField = useCallback((field, value) => {
    setState((prev) => ({ ...prev, [field]: value }));
  }, [setState]);

  // ── Update multiple fields at once
  const updateFields = useCallback((fields) => {
    setState((prev) => ({ ...prev, ...fields }));
  }, [setState]);

  // ── Clear draft
  const clearDraft = useCallback((skipConfirmation = false) => {
    const performClear = () => {
      safeRemoveItem(storageKey);
      setStateInternal(initialState);
      setLastSaved(null);
      setHasDraft(false);
      setIsDirty(false);
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      if (onClear) {
        onClear();
      }
      
      toast.success('Draft cleared', { duration: 2000 });
    };
    
    if (skipConfirmation || !hasContent) {
      performClear();
      return true;
    }
    
    if (window.confirm('Clear all content? This will remove your saved draft and cannot be undone.')) {
      performClear();
      return true;
    }
    
    return false;
  }, [storageKey, initialState, hasContent, onClear]);

  // ── Force save immediately (for use before navigation)
  const forceSave = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    saveDraft();
  }, [saveDraft]);

  // ── Effect: Auto-save on state change (after first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      
      // Call onRestore if we restored a draft
      const savedDraft = safeGetItem(storageKey);
      if (savedDraft && savedDraft.data && onRestore) {
        onRestore(savedDraft.data);
      }
      return;
    }
    
    // Trigger debounced save on state change
    debouncedSave();
    
  }, [state, debouncedSave, storageKey, onRestore]);

  // ── Effect: Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Save immediately before unload
      if (hasContent) {
        // Synchronous save
        const draftData = {
          data: stateRef.current,
          timestamp: Date.now(),
          version: 1,
        };
        try {
          localStorage.setItem(storageKey, JSON.stringify(draftData));
        } catch (error) {
          // Silent fail on unload
        }
        
        // Optionally warn user
        if (warnOnUnload && isDirty) {
          e.preventDefault();
          e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
          return e.returnValue;
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [storageKey, hasContent, isDirty, warnOnUnload]);

  // ── Effect: Save on visibility change (when user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasContent) {
        saveDraft();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveDraft, hasContent]);

  // ── Effect: Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      // Save on unmount if there's content
      if (stateRef.current && Object.keys(stateRef.current).length > 0) {
        const hasAnyContent = Object.values(stateRef.current).some(v => {
          if (typeof v === 'string') return v.trim().replace(/<[^>]*>/g, '').trim().length > 0;
          return v != null;
        });
        
        if (hasAnyContent) {
          const draftData = {
            data: stateRef.current,
            timestamp: Date.now(),
            version: 1,
          };
          try {
            localStorage.setItem(storageKey, JSON.stringify(draftData));
          } catch (error) {
            // Silent fail on unmount
          }
        }
      }
    };
  }, [storageKey]);

  // ── Clear old drafts on mount (housekeeping)
  useEffect(() => {
    clearOldDrafts();
  }, []);

  return {
    state,
    setState,
    updateField,
    updateFields,
    clearDraft,
    forceSave,
    hasDraft,
    hasContent,
    lastSaved,
    isDirty,
  };
};

// ─── Utility: Get draft info for a page ──────────────────────────────────────

export const getDraftInfo = (pageKey) => {
  const storageKey = `${DRAFT_PREFIX}${pageKey}`;
  const draft = safeGetItem(storageKey);
  
  if (!draft) return null;
  
  return {
    timestamp: draft.timestamp ? new Date(draft.timestamp) : null,
    hasData: !!draft.data,
    data: draft.data,
  };
};

// ─── Utility: Clear all drafts ───────────────────────────────────────────────

export const clearAllDrafts = () => {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    return true;
  } catch (error) {
    console.error('[DraftPersistence] Failed to clear all drafts', error);
    return false;
  }
};

// ─── Page Keys (for consistency) ─────────────────────────────────────────────

export const DRAFT_KEYS = {
  MANUAL_NOTE_EDITOR: 'manual-note-editor',
  ONLINE_CODE_RUNNER: 'online-code-runner',
  AI_GENERATE_TOPIC: 'ai-generate-topic',
  AI_IMPROVE: 'ai-improve',
  AI_SUMMARIZE: 'ai-summarize',
  AI_GENERATE_CODE: 'ai-generate-code',
};

export default useDraftPersistence;
