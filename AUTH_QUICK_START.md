# 🚀 Authentication Implementation Quick Start

## For Frontend Developers

### Step 1: Update Your Components

In any component that performs authenticated actions (create, edit, delete, use AI tools):

```jsx
// Before ❌
function NotesPage() {
  const handleCreateNote = async (data) => {
    await noteService.createNote(data);
  };
}

// After ✅
import { useAuthAction } from '@/hooks/useAuthAction';

function NotesPage() {
  const { execute, hasValidAuth } = useAuthAction('create a note', true);

  const handleCreateNote = async (data) => {
    const { success, data: note } = await execute(async () => {
      return await noteService.createNote(data);
    });

    if (success) {
      // Continue with success flow
    }
  };

  return (
    <>
      {hasValidAuth && <CreateButton onClick={handleCreateNote} />}
      {!hasValidAuth && <p>Please log in to create notes</p>}
    </>
  );
}
```

### Step 2: Wrap API Calls with Error Handler

```jsx
// Before ❌
const handleAction = async () => {
  try {
    await apiService.performAction();
  } catch (error) {
    console.error(error);
  }
};

// After ✅
import { AuthErrorHandler } from '@/services/authErrorHandler';
import { useNavigate } from 'react-router-dom';

const handleAction = async () => {
  const navigate = useNavigate();
  try {
    await apiService.performAction();
  } catch (error) {
    AuthErrorHandler.handleError(error, 'perform this action', () => navigate('/login'));
  }
};
```

### Step 3: Use AuthValidator for Simple Checks

```jsx
// For quick validation without a hook
import AuthValidator from '@/utils/authValidator';

function SimpleButton() {
  const handleClick = () => {
    if (!AuthValidator.validateAction('use this feature')) {
      return; // User not authenticated, message shown automatically
    }
    // Proceed with action
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

---

## For Backend Developers

### Step 1: Apply Permission Classes to ViewSets

```python
# Before ❌
from rest_framework import permissions

class MyViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]

# After ✅
from accounts.permissions import IsAuthenticatedForMutations

class MyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedForMutations]
    
    # GET requests: ✅ No auth needed
    # POST/PUT/DELETE: 🔒 Auth required
```

### Step 2: For AI-Only Features (Require All Auth)

```python
# Before ❌
from rest_framework import permissions

class AIViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

# After ✅
from accounts.permissions import IsAuthenticatedUser

class AIViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticatedUser]
    
    # ALL requests: 🔒 Must be authenticated
```

### Step 3: Custom Views with Decorators

```python
from rest_framework.decorators import api_view, permission_classes
from accounts.permissions import IsAuthenticatedForMutations

# For endpoints that only handle POST (mutations)
@api_view(['POST'])
@permission_classes([IsAuthenticatedForMutations])
def my_action(request):
    # Only authenticated users reach here for POST
    return Response({'status': 'success'})

# For all-auth-required endpoints
from accounts.permissions import IsAuthenticatedUser

@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticatedUser])
def ai_action(request):
    # Only authenticated users reach here
    return Response({'status': 'success'})
```

---

## Integration Checklist

### Frontend Components

- [ ] NotesPage - Wrap create/edit/delete with `useAuthAction`
- [ ] AIToolsGenerateTopicPage - Add auth validation before submit
- [ ] AIToolsImprovePage - Add auth validation before submit
- [ ] AIToolsSummarizePage - Add auth validation before submit
- [ ] AIToolsGenerateCodePage - Add auth validation before submit
- [ ] Any component with mutation operations - Use `AuthValidator.validateAction()`

### Backend ViewSets

- [ ] NoteViewSet - ✅ Already updated
- [ ] ChapterViewSet - ✅ Already has IsAuthenticated
- [ ] TopicViewSet - ✅ Already has IsAuthenticated
- [ ] AIToolsViewSet - ✅ Already updated
- [ ] Any custom mutation endpoints - Apply `IsAuthenticatedForMutations`
- [ ] Any AI-specific endpoints - Apply `IsAuthenticatedUser`

### Error Handling

- [ ] API service layer - Add `AuthErrorHandler` for 401/403 responses
- [ ] Component error boundaries - Gracefully handle auth errors
- [ ] Toast notifications - Show user-friendly messages

---

## Testing Your Integration

### 1. Test Public Page Access (No Auth)

```bash
# Should work without token
curl http://localhost:8000/api/notes/
# Expected: 200 OK (but might be empty for non-authenticated user)
```

### 2. Test Action Blocking (No Auth)

```bash
# Should fail without token
curl -X POST http://localhost:8000/api/notes/ \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}'
# Expected: 403 Forbidden
```

### 3. Test Auth Success (With Token)

```bash
# Should work with valid token
curl -X POST http://localhost:8000/api/notes/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}'
# Expected: 201 Created
```

### 4. Frontend Testing

- [ ] Visit `/notes` without login → Page loads ✓
- [ ] Click "Create" → Gets "Please login" message ✓
- [ ] Click message → Redirects to `/login` ✓
- [ ] Log in → Redirects to `/notes` ✓
- [ ] Click "Create" → Creates note successfully ✓

---

## Migration Path (If Updating Existing Code)

If you have existing component code:

### Step 1: Identify Mutation Methods

```javascript
// Methods that need auth validation:
- handleCreateNote()
- handleEditNote()
- handleDeleteNote()
- handleGenerateAI()
- handleSaveToNote()
```

### Step 2: Add Import

```javascript
import { useAuthAction } from '@/hooks/useAuthAction';
```

### Step 3: Initialize Hook

```javascript
const { execute, hasValidAuth } = useAuthAction('your action name');
```

### Step 4: Wrap Method

```javascript
// Before
const handleCreateNote = async (data) => {
  return await noteService.createNote(data);
};

// After
const handleCreateNote = async (data) => {
  const { success, data: note } = await execute(async () => {
    return await noteService.createNote(data);
  });
  return success ? note : null;
};
```

### Step 5: Use in JSX

```jsx
<button 
  onClick={() => handleCreateNote(data)}
  disabled={!hasValidAuth}
>
  Create Note
</button>
```

---

## Common Patterns

### Pattern 1: Button with Conditional Rendering

```jsx
function MyComponent() {
  const { hasValidAuth, execute } = useAuthAction('create note');

  return (
    <>
      {hasValidAuth ? (
        <button onClick={() => execute(apiCall)}>Create</button>
      ) : (
        <p>Please log in to create notes</p>
      )}
    </>
  );
}
```

### Pattern 2: Form with Validation

```jsx
function NoteForm() {
  const { execute, canExecute } = useAuthAction('save note');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canExecute()) return;

    setLoading(true);
    const { success } = await execute(async () => {
      return await noteService.save(formData);
    });
    setLoading(false);

    if (success) {
      navigate('/notes');
    }
  };

  return <form onSubmit={handleSubmit}>.../form>;
}
```

### Pattern 3: API Interceptor

```jsx
function MyComponent() {
  const { execute } = useAuthAction('perform action');

  const apiCall = async (endpoint, options) => {
    const { success, data, error } = await execute(async () => {
      return await api.post(endpoint, options);
    });

    if (!success && error) {
      // Handle error
    }

    return data;
  };
}
```

---

## FAQ

**Q: Do I need to update all components?**
A: Only components that perform mutations (create, edit, delete, submit forms). GET/read-only operations don't need updates.

**Q: What if the user loses connection?**
A: The AuthValidator will re-check authentication on next action. If token expired, they'll get "Session Expired" message.

**Q: Can guests see public pages?**
A: Yes! PublicPageRoute allows browsing. They just can't perform actions without logging in.

**Q: How does backend protect against direct API calls?**
A: Permission classes enforce authentication at the HTTP layer. If someone bypasses frontend validation, the backend will return 403 Forbidden.

**Q: Should I use useAuthAction or AuthValidator?**
A: Use `useAuthAction` hook in React components for cleaner integration. Use `AuthValidator` utility for simple, non-hook scenarios (like button event handlers).

---

## Support

If components still allow unauthorized actions:

1. **Check permission class is applied**:
```python
permission_classes = [IsAuthenticatedForMutations]  # ✅
```

2. **Verify auth validation in component**:
```javascript
const { hasValidAuth, execute } = useAuthAction();  // ✅
```

3. **Review backend logs for details**:
```
[403] Authentication required - user unauthorized for POST
```

4. **Test with curl to verify backend**:
```bash
curl -X POST http://localhost:8000/api/endpoint/
```

---

## Summary

✅ **For Browsing**: Create PublicPageRoute pages, users can view without auth

✅ **For Actions**: Use IsAuthenticatedForMutations in viewsets

✅ **For Frontend**: Use useAuthAction hook or AuthValidator utility

✅ **For Errors**: Handle 403 responses with AuthErrorHandler

🔒 **Security**: Backend enforces authentication, frontend prevents unnecessary errors

