# ✅ Authentication & Routing Implementation Guide

## 🎯 Overview

This guide details the complete implementation of role-based authentication and routing with public browsing and authenticated actions.

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Router (Frontend)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │  ProtectedRoute  │     │  PublicPageRoute │                  │
│  │  (Private Pages) │     │ (Browsable Pages)│                  │
│  └──────────────────┘     └──────────────────┘                  │
│   - Dashboard              - Notes Page                          │
│   - Profile                - AI Tools Page                       │
│   - History                - AI Tool Sub-pages                   │
│   - Settings               - Generate/Improve/Summarize/Code    │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │    Action-Level Authentication (Components)         │         │
│  │  - AuthValidator utility                            │         │
│  │  - useAuthAction hook                               │         │
│  │  - createValidatedAction wrapper                    │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
        ↓ (API Calls)
┌─────────────────────────────────────────────────────────────────┐
│              Django REST Framework (Backend)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  Permission Classes (Enforce Auth)                    │       │
│  ├──────────────────────────────────────────────────────┤       │
│  │                                                        │       │
│  │  IsAuthenticatedForMutations:                        │       │
│  │  - GET requests: ✅ Allowed (no auth)                │       │
│  │  - POST/PUT/DELETE: 🔒 Auth required                 │       │
│  │                                                        │       │
│  │  IsAuthenticatedUser:                                │       │
│  │  - All requests: 🔒 Auth required                    │       │
│  │                                                        │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  ViewSets with Enforcement                            │       │
│  ├──────────────────────────────────────────────────────┤       │
│  │  - NoteViewSet: IsAuthenticatedForMutations          │       │
│  │  - ChapterViewSet: IsAuthenticated                   │       │
│  │  - TopicViewSet: IsAuthenticated                     │       │
│  │  - AIToolsViewSet: IsAuthenticatedUser               │       │
│  │                                                        │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### 1️⃣ Public Browsing (No Auth Required)

Users can visit these pages without logging in:

```
User (Not Logged In)
    ↓
Navigate to /notes
    ↓
PublicPageRoute ✅ Allows access
    ↓
NotesPage renders ✅
    ↓
User can:
  - View page layout
  - See demo content
  - Browse AI Tools
    ↓
User attempts to CREATE/EDIT/DELETE
    ↓
AuthValidator.validateAction() ❌ BLOCKED
    ↓
Toast Message: "Please login or register"
    ↓
Redirect to /login
```

### 2️⃣ Protected Actions (Auth Required)

```
User (Guest/Not Logged In)
    ↓
Click "Create Note" / "Use AI Tool"
    ↓
@useAuthAction hook ❌ BLOCKED
  OR
AuthValidator.validateAction() ❌ BLOCKED
    ↓
Toast Message: "Please login to continue"
    ↓
Optional Redirect: /login
```

### 3️⃣ Backend Double-Check (CSRF Prevention)

Even if frontend validation is bypassed:

```
POST /api/notes/
  (without valid token)
    ↓
IsAuthenticatedForMutations Permission ❌ DENIED
    ↓
Response: 403 Forbidden
{
  "detail": "Authentication required to perform this action. 
             Please login or register to continue."
}
    ↓
Frontend catches 403 → AuthErrorHandler
    ↓
Shows: "Authentication Required"
    ↓
Redirects to: /login
```

---

## 🛠️ Frontend Implementation

### Page Routes

```jsx
// src/App.jsx

// ✅ Public Pages - Users can browse without login
// But actions require authentication (enforced in components)
<Route path="/notes" element={<PublicPageRoute><NotesPage /></PublicPageRoute>} />
<Route path="/ai-tools" element={<PublicPageRoute><AIToolsPage /></PublicPageRoute>} />
<Route path="/ai-tools/generate" element={<PublicPageRoute><AIToolsGenerateTopicPage /></PublicPageRoute>} />
<Route path="/ai-tools/improve" element={<PublicPageRoute><AIToolsImprovePage /></PublicPageRoute>} />
<Route path="/ai-tools/summarize" element={<PublicPageRoute><AIToolsSummarizePage /></PublicPageRoute>} />
<Route path="/ai-tools/code" element={<PublicPageRoute><AIToolsGenerateCodePage /></PublicPageRoute>} />

// 🔒 Protected Pages - Authentication required
<Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
<Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
<Route path="/ai-tools/history" element={<ProtectedRoute><AIHistoryPage /></ProtectedRoute>} />
```

### AuthValidator Usage

```javascript
// src/utils/authValidator.js - Utility for checking auth status

import AuthValidator from '@/utils/authValidator';

// Check if user is authenticated
if (!AuthValidator.isAuthenticated()) {
  // Show message and redirect
  AuthValidator.validateAction('create note', true); // Shows toast
}

// Validate before action
if (!AuthValidator.validateAction('create note')) {
  return; // User is not authenticated
}

// Execute authenticated action
AuthValidator.requireAuth('create note'); // Throws if not authenticated
```

### useAuthAction Hook Usage

```javascript
// src/hooks/useAuthAction.js - React hook for authenticated actions

import { useAuthAction } from '@/hooks/useAuthAction';
import { useNavigate } from 'react-router-dom';

function NotesPage() {
  const navigate = useNavigate();
  const { execute, canExecute, hasValidAuth } = useAuthAction(
    'create a note',
    true // auto-redirect to login
  );

  const handleCreateNote = async (noteData) => {
    // This will check auth before executing
    const { success, data, error } = await execute(async () => {
      return await noteService.createNote(noteData);
    });

    if (success) {
      // Note created successfully
      navigate(`/notes/${data.id}`);
    }
  };

  if (!hasValidAuth) {
    return <div>Please log in to create notes</div>;
  }

  return <CreateNoteForm onSubmit={handleCreateNote} />;
}
```

### API Error Handler

```javascript
// src/services/authErrorHandler.js

import { AuthErrorHandler } from '@/services/authErrorHandler';
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();

  const handleAction = async () => {
    try {
      await apiService.createNote(data);
    } catch (error) {
      // Handle 401/403 auth errors
      AuthErrorHandler.handleError(
        error,
        'create a note',
        () => navigate('/login')
      );
    }
  };
}
```

---

## 🔐 Backend Implementation

### Updated Permissions

#### `IsAuthenticatedForMutations` (Mixed Auth)

```python
# accounts/permissions.py

class IsAuthenticatedForMutations(permissions.BasePermission):
    """
    Allows GET without auth, requires auth for POST/PUT/DELETE
    """
    
    def has_permission(self, request, view):
        # ✅ Allow GET, HEAD, OPTIONS
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # ❌ Block POST/PUT/DELETE without auth
        if not request.user or not request.user.is_authenticated:
            return False
        
        # ❌ Block guest sessions
        if hasattr(request.user, 'is_guest') and request.user.is_guest:
            return False
        
        return True
```

#### `IsAuthenticatedUser` (Full Auth)

```python
# accounts/permissions.py

class IsAuthenticatedUser(permissions.BasePermission):
    """
    Blocks guest sessions and unauthenticated users for ALL methods
    """
    
    def has_permission(self, request, view):
        # ✅ Allow only authenticated, non-guest users
        if not request.user or not request.user.is_authenticated:
            return False
        
        # ❌ Block guest sessions
        if hasattr(request.user, 'is_guest') and request.user.is_guest:
            return False
        
        return True
```

### ViewSet Permissions

```python
# notes/views.py

from accounts.permissions import IsAuthenticatedForMutations, IsAuthenticatedUser

class NoteViewSet(viewsets.ModelViewSet):
    """
    ✅ GET: View notes without authentication
    ❌ POST/PUT/DELETE: Require authentication
    """
    permission_classes = [IsAuthenticatedForMutations]

class ChapterViewSet(viewsets.ModelViewSet):
    """
    Nested resource of notes - requires authentication
    """
    permission_classes = [permissions.IsAuthenticated]

# ai_tools/views.py

class AIToolsViewSet(viewsets.GenericViewSet):
    """
    ❌ ALL operations: Require authentication
    No free AI tool usage for guests
    """
    permission_classes = [IsAuthenticatedUser]
```

---

## 📝 Usage Examples

### Example 1: Notes Page with Create Button

```jsx
// src/pages/NotesPage.jsx

import { useAuthAction } from '@/hooks/useAuthAction';
import { AuthValidator } from '@/utils/authValidator';

function NotesPage() {
  const { execute, hasValidAuth } = useAuthAction(
    'create a note',
    true
  );

  const handleCreateNote = async (title, description) => {
    const { success, data } = await execute(async () => {
      return await noteService.createNote({ title, description });
    });

    if (success) {
      // Note created, user is authenticated
      showSuccess('Note created successfully');
    }
  };

  return (
    <div>
      <h1>My Notes</h1>
      
      {/* Create Button - Wrapped with auth validation */}
      <button onClick={() => handleCreateNote('New Note', '')}>
        {hasValidAuth ? 'Create Note' : 'Login to Create'}
      </button>

      {/* Or use simple validation */}
      <button onClick={() => {
        if (AuthValidator.validateAction('create note')) {
          handleCreateNote('New Note', '');
        }
      }}>
        Create Note
      </button>
    </div>
  );
}
```

### Example 2: AI Tools with Authentication Check

```jsx
// src/pages/AIToolsGenerateTopicPage.jsx

import { useAuthAction } from '@/hooks/useAuthAction';

function AIToolsGenerateTopicPage() {
  const { execute, canExecute } = useAuthAction(
    'generate topic with AI',
    true
  );

  const handleGenerate = async (topic, level) => {
    if (!canExecute()) {
      return; // Auth check failed, message shown automatically
    }

    const { success, data, error } = await execute(async () => {
      return await aiService.generateTopic(topic, level);
    });

    if (success) {
      // Display generated content
      displayContent(data);
    } else if (error) {
      // Handle error
      showError(error);
    }
  };

  return (
    <div>
      <input placeholder="Enter topic" />
      <button onClick={() => handleGenerate('React', 'beginner')}>
        Generate
      </button>
    </div>
  );
}
```

### Example 3: Error Handling for API Failures

```jsx
// Component that handles API errors

import { AuthErrorHandler } from '@/services/authErrorHandler';
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();

  const handleAction = async () => {
    try {
      const result = await apiService.createNote({
        title: 'New Note',
      });
      
      showSuccess('Note created!');
    } catch (error) {
      // Check if it's an auth error
      if (AuthErrorHandler.isAuthError(error)) {
        // Automatically handles 401/403
        AuthErrorHandler.handleError(
          error,
          'create a note',
          () => navigate('/login')
        );
      } else {
        // Handle other errors
        showError('Failed to create note');
      }
    }
  };

  return (
    <button onClick={handleAction}>
      Create Note
    </button>
  );
}
```

---

## ✅ Testing Checklist

### Frontend Tests

- [ ] **Public Page Access**
  - [ ] User can visit `/notes` without login ✅
  - [ ] User can visit `/ai-tools` without login ✅
  - [ ] User can visit `/ai-tools/generate` without login ✅
  - [ ] User can see page content without login ✅

- [ ] **Action Blocking**
  - [ ] "Create Note" button shown but blocked ✅
  - [ ] Click shows "Please login" message ✅
  - [ ] Redirects to `/login` after message ✅
  - [ ] Same for all AI tools ✅

- [ ] **Protected Pages**
  - [ ] User cannot access `/dashboard` without login ❌
  - [ ] User is redirected to `/login` ✅
  - [ ] User cannot access `/profile` without login ❌
  - [ ] Same for other protected pages ✅

### Backend Tests

```bash
# Test 1: GET notes without auth (should work)
curl -X GET http://localhost:8000/api/notes/

# Test 2: POST note without auth (should fail)
curl -X POST http://localhost:8000/api/notes/ \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}'
# Expected: 403 Forbidden

# Test 3: POST note with valid token (should work)
curl -X POST http://localhost:8000/api/notes/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}'
# Expected: 201 Created

# Test 4: AI tools without auth (should fail)
curl -X POST http://localhost:8000/api/ai-tools/generate/ \
  -H "Content-Type: application/json" \
  -d '{"topic": "Python"}'
# Expected: 403 Forbidden

# Test 5: AI tools with token (should work)
curl -X POST http://localhost:8000/api/ai-tools/generate/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Python", "level": "beginner"}'
# Expected: 200 OK with content
```

---

## 🐛 Common Issues & Solutions

### Issue #1: Guest can still create notes

**Problem**: Permission check not working

**Solution**:
1. Verify `IsAuthenticatedForMutations` is applied to viewset:
```python
class NoteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedForMutations]  # ✅ Correct
```

2. Ensure guest middleware sets `is_guest` attribute:
```python
# In middleware or during auth
request.user.is_guest = True  # ✅ Must be set
```

3. Check permission class logic:
```python
if hasattr(request.user, 'is_guest') and request.user.is_guest:
    return False  # Block guests
```

### Issue #2: Authenticated user gets 403

**Problem**: isAuthenticated but permission denied

**Solution**:
1. Check if user has guest flag set incorrectly:
```python
# Debug in view
print(f"User: {request.user}")
print(f"Is Guest: {getattr(request.user, 'is_guest', False)}")
print(f"Is Authenticated: {request.user.is_authenticated}")
```

2. Verify token is valid:
```bash
# Check token in header
Authorization: Bearer {valid_token}
```

### Issue #3: Frontend not showing login message

**Problem**: Actions fail silently without user feedback

**Solution**:
1. Ensure AuthValidator is imported:
```javascript
import AuthValidator from '@/utils/authValidator';
```

2. Use validateAction before API call:
```javascript
if (!AuthValidator.validateAction('create note')) {
  return; // Message shown automatically
}
```

3. Or handle API errors:
```javascript
catch (error) {
  AuthErrorHandler.handleError(error, 'create note', navigate);
}
```

---

## 📚 Summary

✅ **Public Pages**: Users can browse `/notes`, `/ai-tools`, and sub-pages without authentication

✅ **Protected Pages**: `/dashboard`, `/profile`, `/history` require authentication

🔒 **Action Protection**: All API operations (create, edit, delete) require user authentication

⚠️ **Double-Check**: Frontend validation + Backend permission classes prevent unauthorized actions

💬 **User Feedback**: Toast messages guide users to login when needed

---

## 📁 Files Modified

- ✅ `src/App.jsx` - Updated routes with PublicPageRoute
- ✅ `src/components/guards/PublicPageRoute.jsx` - New component
- ✅ `src/utils/authValidator.js` - Authentication validation utility
- ✅ `src/hooks/useAuthAction.js` - React hook for authenticated actions
- ✅ `src/services/authErrorHandler.js` - API error handler
- ✅ `accounts/permissions.py` - Added IsAuthenticatedForMutations & IsAuthenticatedUser
- ✅ `notes/views.py` - Updated to use IsAuthenticatedForMutations
- ✅ `ai_tools/views.py` - Already using IsAuthenticatedUser

---

## 🚀 Next Steps

1. **Component Updates**: Update Note and AI Tool components to use `useAuthAction` hook
2. **Error Handling**: Wrap API calls with `AuthErrorHandler` in components
3. **Testing**: Run full authentication flow tests
4. **Deployment**: Push changes to staging for QA testing
5. **Monitoring**: Log authentication failures for security analysis

