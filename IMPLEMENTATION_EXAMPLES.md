# 📄 Example Component Implementations

This document shows real-world examples of how to implement authentication validation in your components.

---

## Example 1: Notes Page - Create Note Action

```jsx
// src/pages/NotesPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthAction } from '@/hooks/useAuthAction';
import AuthValidator from '@/utils/authValidator';
import { showToast } from '@/services/api';
import noteService from '@/services/note.service';

function NotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });

  // ✅ Use hook for authenticated actions
  const { execute, hasValidAuth } = useAuthAction(
    'create a note',
    true  // auto-redirect to login if not authenticated
  );

  // Handle create note
  const handleCreateNote = async (e) => {
    e.preventDefault();

    // This will check auth and show message if not authenticated
    const { success, data, error } = await execute(async () => {
      return await noteService.createNote({
        title: formData.title,
        description: formData.description,
      });
    });

    if (success) {
      // Note created successfully
      setNotes([...notes, data]);
      setFormData({ title: '', description: '' });
      setShowCreateModal(false);
      showToast({
        type: 'success',
        message: 'Note created',
        description: `"${data.title}" has been created successfully`,
      });
      navigate(`/notes/${data.id}`);
    } else if (error) {
      showToast({
        type: 'error',
        message: 'Failed to create note',
        description: error,
      });
    }
  };

  // Handle edit note
  const handleEditNote = async (noteId, updatedData) => {
    // Simple validation without executing
    if (!AuthValidator.validateAction('edit note')) {
      return null;
    }

    try {
      const updated = await noteService.updateNote(noteId, updatedData);
      showToast({
        type: 'success',
        message: 'Note updated',
      });
      return updated;
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to update note',
      });
      throw error;
    }
  };

  return (
    <div className="notes-container">
      <header className="notes-header">
        <h1>My Notes</h1>

        {/* ✅ Create button - only shown if authenticated */}
        {hasValidAuth ? (
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Note
          </button>
        ) : (
          <p className="text-muted">
            Log in to create and manage notes
          </p>
        )}
      </header>

      {/* Create Note Modal */}
      {showCreateModal && (
        <div className="modal">
          <form onSubmit={handleCreateNote}>
            <input
              type="text"
              placeholder="Note title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <button type="submit">Create Note</button>
            <button type="button" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Notes List */}
      <div className="notes-list">
        {notes.length === 0 ? (
          <p>
            {hasValidAuth
              ? 'No notes yet. Create one to get started!'
              : 'Log in to see your notes'}
          </p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="note-card">
              <h3>{note.title}</h3>
              <p>{note.description}</p>
              {hasValidAuth && (
                <>
                  <button onClick={() => navigate(`/notes/${note.id}`)}>
                    View
                  </button>
                  <button onClick={() => handleEditNote(note.id, { starred: true })}>
                    Star
                  </button>
                  <button onClick={() => handleDeleteNote(note.id)}>
                    Delete
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotesPage;
```

---

## Example 2: AI Tools - Generate Topic

```jsx
// src/pages/AIToolsGenerateTopicPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthAction } from '@/hooks/useAuthAction';
import { AuthErrorHandler } from '@/services/authErrorHandler';
import { showToast } from '@/services/api';
import aiToolsService from '@/services/aiTools.service';

function AIToolsGenerateTopicPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    topic: '',
    level: 'beginner',
    subject_area: 'programming',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // ✅ Setup auth validation for AI generation
  const { execute, hasValidAuth, canExecute } = useAuthAction(
    'generate content with AI',
    true
  );

  const handleGenerate = async (e) => {
    e.preventDefault();

    // Double-check auth before proceeding
    if (!canExecute()) {
      return; // Message shown, user redirected to login
    }

    setLoading(true);

    try {
      // Use execute wrapper for auth-validated API call
      const { success, data, error } = await execute(async () => {
        return await aiToolsService.generateTopic({
          topic: formData.topic,
          level: formData.level,
          subject_area: formData.subject_area,
        });
      });

      if (success) {
        setResult(data);
        showToast({
          type: 'success',
          message: 'Content generated',
          description: 'AI has generated the content successfully',
        });
      } else if (error) {
        showToast({
          type: 'error',
          message: 'Generation failed',
          description: error,
        });
      }
    } catch (apiError) {
      // Handle API errors including auth errors
      if (AuthErrorHandler.isAuthError(apiError)) {
        AuthErrorHandler.handleError(
          apiError,
          'generate content',
          () => navigate('/login')
        );
      } else {
        showToast({
          type: 'error',
          message: 'Error generating content',
          description: 'An unexpected error occurred',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-tools-container">
      <h1>Generate Topic Explanation</h1>

      {!hasValidAuth && (
        <div className="alert alert-info">
          <p>Please log in to use AI tools</p>
          <button onClick={() => navigate('/login')}>Log In</button>
        </div>
      )}

      {hasValidAuth && (
        <>
          <form onSubmit={handleGenerate} className="ai-form">
            <div className="form-group">
              <label htmlFor="topic">Topic</label>
              <input
                id="topic"
                type="text"
                placeholder="e.g., React Hooks"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="level">Level</label>
              <select
                id="level"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                disabled={loading}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="subject">Subject Area</label>
              <select
                id="subject"
                value={formData.subject_area}
                onChange={(e) => setFormData({ ...formData, subject_area: e.target.value })}
                disabled={loading}
              >
                <option value="programming">Programming</option>
                <option value="science">Science</option>
                <option value="math">Math</option>
                <option value="history">History</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.topic}
              className="btn btn-primary"
            >
              {loading ? 'Generating...' : 'Generate Explanation'}
            </button>
          </form>

          {/* Display Results */}
          {result && (
            <div className="ai-result">
              <h2>Generated Content</h2>
              <div className="content">{result.content}</div>
              <button onClick={() => navigate('/notes')}>Save to Note</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AIToolsGenerateTopicPage;
```

---

## Example 3: Protected Action Wrapper Component

```jsx
// src/components/common/ProtectedAction.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthAction } from '@/hooks/useAuthAction';

/**
 * ProtectedAction - Wraps any action to require authentication
 *
 * @param {function} children - Render function receiving { execute, hasValidAuth }
 * @param {string} actionName - Name of the action (for messages)
 * @param {boolean} autoRedirect - Auto-redirect to login if not authenticated
 */
function ProtectedAction({
  children,
  actionName = 'Perform this action',
  autoRedirect = true,
}) {
  const navigate = useNavigate();
  const { execute, hasValidAuth, canExecute } = useAuthAction(
    actionName,
    autoRedirect
  );

  return children({
    execute,
    hasValidAuth,
    canExecute,
    navigate,
  });
}

// Usage Example:
export function ExampleUsage() {
  return (
    <ProtectedAction actionName="create a note">
      {({ execute, hasValidAuth, canExecute }) => (
        <>
          {hasValidAuth ? (
            <button
              onClick={() =>
                execute(async () => {
                  // Your API call
                })
              }
            >
              Create
            </button>
          ) : (
            <p>Please log in to create notes</p>
          )}
        </>
      )}
    </ProtectedAction>
  );
}

export default ProtectedAction;
```

---

## Example 4: Service Layer with Auth Handling

```javascript
// src/services/note.service.js

import { api } from './api';
import { AuthErrorHandler } from './authErrorHandler';
import AuthValidator from '@/utils/authValidator';

const noteService = {
  /**
   * Get all notes (public endpoint)
   * Can be called without authentication
   */
  async getNotes() {
    try {
      const response = await api.get('/notes/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get single note (public endpoint)
   */
  async getNote(id) {
    try {
      const response = await api.get(`/notes/${id}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create note (requires authentication)
   * Throws 403 if not authenticated
   */
  async createNote(data) {
    // Frontend validation
    if (!AuthValidator.isAuthenticated()) {
      throw new Error('Authentication required to create notes');
    }

    try {
      const response = await api.post('/notes/', data);
      return response.data;
    } catch (error) {
      // Handle auth errors specifically
      if (AuthErrorHandler.isAuthError(error)) {
        throw new Error('Your session has expired. Please log in again.');
      }
      throw error;
    }
  },

  /**
   * Update note (requires authentication)
   */
  async updateNote(id, data) {
    if (!AuthValidator.isAuthenticated()) {
      throw new Error('Authentication required to update notes');
    }

    try {
      const response = await api.put(`/notes/${id}/`, data);
      return response.data;
    } catch (error) {
      if (AuthErrorHandler.isAuthError(error)) {
        throw new Error('Your session has expired. Please log in again.');
      }
      throw error;
    }
  },

  /**
   * Delete note (requires authentication)
   */
  async deleteNote(id) {
    if (!AuthValidator.isAuthenticated()) {
      throw new Error('Authentication required to delete notes');
    }

    try {
      await api.delete(`/notes/${id}/`);
      return { success: true };
    } catch (error) {
      if (AuthErrorHandler.isAuthError(error)) {
        throw new Error('Your session has expired. Please log in again.');
      }
      throw error;
    }
  },
};

export default noteService;
```

---

## Example 5: Custom Hook for Complex Flows

```javascript
// src/hooks/useNoteActions.js

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthAction } from './useAuthAction';
import { AuthErrorHandler } from '@/services/authErrorHandler';
import noteService from '@/services/note.service';

/**
 * useNoteActions - Handles all note-related mutations with auth
 */
export function useNoteActions() {
  const navigate = useNavigate();
  const { execute: executeAuthAction } = useAuthAction('modify notes');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createNote = useCallback(
    async (noteData) => {
      setLoading(true);
      setError(null);

      try {
        const result = await executeAuthAction(async () => {
          return await noteService.createNote(noteData);
        });

        return result;
      } catch (err) {
        setError(err.message);

        if (AuthErrorHandler.isAuthError(err)) {
          navigate('/login');
        }

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [executeAuthAction, navigate]
  );

  const updateNote = useCallback(
    async (id, noteData) => {
      setLoading(true);
      setError(null);

      try {
        return await noteService.updateNote(id, noteData);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteNote = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        return await noteService.deleteNote(id);
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    createNote,
    updateNote,
    deleteNote,
    loading,
    error,
  };
}

// Usage in component:
function MyComponent() {
  const { createNote, loading, error } = useNoteActions();

  const handleCreate = async (data) => {
    try {
      const newNote = await createNote(data);
      console.log('Note created:', newNote);
    } catch (err) {
      console.error('Failed to create:', err);
    }
  };

  return (
    <>
      {error && <p className="error">{error}</p>}
      <button onClick={() => handleCreate({ title: 'New Note' })} disabled={loading}>
        {loading ? 'Creating...' : 'Create Note'}
      </button>
    </>
  );
}
```

---

## Example 6: API Interceptor for Global Auth Handling

```javascript
// src/services/api.js (Update existing file)

import axios from 'axios';
import { AuthErrorHandler } from './authErrorHandler';
import { showToast } from './toast'; // Adjust import based on your setup

const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:8000/api',
});

/**
 * Response interceptor - Handle auth errors globally
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401/403 authentication errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        // Remove token and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        showToast({
          type: 'error',
          message: 'Session Expired',
          description: 'Please log in again',
          duration: 5000,
        });

        window.location.href = '/login';
      }

      if (status === 403) {
        // Forbidden - likely needs authentication
        const message = data?.message || 'You are not authorized to perform this action';

        showToast({
          type: 'warning',
          message: 'Access Denied',
          description: message,
          duration: 5000,
        });
      }
    }

    return Promise.reject(error);
  }
);

export { api };

export const showToast = (options) => {
  // Implementation depends on your toast system
  console.log('Toast:', options);
};
```

---

## Example 7: Backend API Error Response Format

```python
# In your DRF views/serializers

from rest_framework.response import Response
from rest_framework import status

# When authentication fails:
def my_view(request):
    if not request.user.is_authenticated:
        return Response(
            {
                'error': 'Authentication required',
                'message': 'Please login or register to continue.',
                'action': 'REDIRECT_LOGIN',
                'redirect_url': '/login',
            },
            status=status.HTTP_403_FORBIDDEN
        )

    # ... rest of view

# In your permission class:
from rest_framework import permissions

class IsAuthenticatedForMutations(permissions.BasePermission):
    message = 'Authentication required to perform this action. Please login or register to continue.'

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        return request.user and request.user.is_authenticated
```

---

## Testing Examples

```javascript
// Test: Check component renders login message when not authenticated
test('shows login message when user is not authenticated', () => {
  // Mock localStorage to appear not authenticated
  localStorage.clear();

  render(<NotesPage />);

  expect(screen.getByText(/log in to create/i)).toBeInTheDocument();
});

// Test: Check component hides create button when not authenticated
test('hides create button when user is not authenticated', () => {
  localStorage.clear();

  const { queryByText } = render(<NotesPage />);

  expect(queryByText(/create note/i)).not.toBeInTheDocument();
});

// Test: Check auth validation is called
test('calls auth validation before creating note', async () => {
  const mockValidate = jest.spyOn(AuthValidator, 'validateAction');

  render(<NotesPage />);
  const createButton = screen.getByText(/create/i);

  fireEvent.click(createButton);

  expect(mockValidate).toHaveBeenCalled();
});
```

---

## Summary

These examples show:
- ✅ How to wrap actions with `useAuthAction`
- ✅ How to handle API errors with `AuthErrorHandler`
- ✅ How to use `AuthValidator` for simple checks
- ✅ How to structure service layers with auth
- ✅ How to create reusable hooks and components
- ✅ How to handle errors globally
- ✅ How to test protected components

Apply these patterns to your existing components to fully implement the authentication system.
