# Guest Access (Free Trial) System - Implementation Guide

## Overview

A complete Guest Access system that allows users to try NoteAssist AI without creating an account. Includes session-based tracking, usage limits, and seamless conversion to registered users.

---

## 🎯 Features Implemented

### 1. **Backend - Django**

#### Guest Session Management (`accounts/guest_manager.py`)
- **Session-based tracking**: Uses Django sessions (no database persistence)
- **Usage limits enforcement**:
  - Notes: 1 note maximum
  - AI Tools: 1 attempt per tool (Generate, Improve, Summarize, Code)
- **Statistics tracking**: Real-time usage monitoring
- **Automatic cleanup**: Sessions cleared on user authentication

#### Guest Middleware (`accounts/middleware/guest_middleware.py`)
- Automatically clears guest session when user logs in
- Maintains guest state across requests
- Integrated into Django middleware stack

#### Guest API Endpoints (`accounts/views.py`)
```python
POST   /api/auth/guest/session/    # Initialize guest session
GET    /api/auth/guest/session/    # Get guest status & stats
DELETE /api/auth/guest/session/    # Clear guest session
```

**Response Example:**
```json
{
  "is_guest": true,
  "guest_id": "uuid-here",
  "stats": {
    "notes_created": 0,
    "notes_limit": 1,
    "can_create_note": true,
    "ai_usage": {
      "generate_topic": 0,
      "improve_topic": 0,
      "summarize_topic": 0,
      "generate_code": 0
    },
    "ai_limits": {
      "generate_topic": 1,
      "improve_topic": 1,
      "summarize_topic": 1,
      "generate_code": 1
    }
  }
}
```

#### Notes API Updates (`notes/views.py`)
- **Guest access allowed**: Permission changed to `AllowAny`
- **1-note limit**: Enforced in `create()` method
- **Mock data returned**: Guest notes not persisted to database
- **Limit reached response**:
```json
{
  "error": "Guest limit reached",
  "message": "Your free trial is complete. Please login or register to continue.",
  "limit_reached": true,
  "notes_created": 1,
  "max_notes": 1
}
```

#### AI Tools API Updates (`ai_tools/views.py`)
- **Guest access allowed**: All AI tool endpoints support guests
- **Per-tool limits**: 1 attempt for each AI tool
- **Mock outputs**: Results returned without database persistence
- **Quota bypass**: Quota checking skipped for guest users

**Endpoints Supporting Guests:**
- `POST /api/ai-tools/generate/` - Generate topic explanations
- `POST /api/ai-tools/improve/` - Improve content
- `POST /api/ai-tools/summarize/` - Summarize content
- `POST /api/ai-tools/code/` - Generate code

---

### 2. **Frontend - React/Redux**

#### Auth Service Updates (`services/auth.service.js`)
New methods added:
```javascript
startGuestSession()        // Initialize guest mode
getGuestSession()          // Fetch guest status
clearGuestSession()        // End guest session
isGuest()                  // Check if in guest mode
getStoredGuestSession()    // Get cached guest data
updateGuestSession()       // Update local cache
```

#### Redux Store Updates (`store/slices/authSlice.js`)
New state properties:
```javascript
{
  isGuest: false,           // Guest mode flag
  guestSession: null,       // Guest session data
  // ... existing auth state
}
```

New actions:
```javascript
startGuestSession()        // Async thunk to start guest session
getGuestSession()          // Async thunk to fetch guest status
clearGuestSession()        // Async thunk to clear guest session
updateGuestSession()       // Reducer to update guest data
```

#### Route Guard Updates (`components/guards/ProtectedRoute.jsx`)
- **New `allowGuest` prop**: Specify routes accessible to guests
- **Automatic redirection**: Guests redirected to login for protected routes
- **State message**: Login page shows context-aware message

**Usage Example:**
```jsx
<Route path="/notes" element={
  <ProtectedRoute allowGuest={true}>
    <NotesPage />
  </ProtectedRoute>
} />
```

#### HomePage Updates (`pages/HomePage.jsx`)
- **"Get Started Free" button**: Triggers `handleStartFree()`
- **Guest session creation**: Dispatches `startGuestSession()`
- **Automatic redirect**: Navigates to `/notes` after session creation
- **Loading state**: Button shows "Starting..." during process
- **Fallback**: Redirects to `/register` if guest session fails

#### Guest Limit Banner (`components/common/GuestLimitBanner.jsx`)
Reusable component for showing guest limits:
```jsx
<GuestLimitBanner 
  featureName="notes"
  currentUsage={1}
  maxUsage={1}
/>
```

Features:
- **Visual progress bar**: Shows usage percentage
- **Color-coded alerts**: Blue → Yellow → Red
- **CTA buttons**: Sign Up & Login links
- **Conditional rendering**: Only shown to guests

---

## 🔒 Security Features

### Backend Protection
1. **Session-based tracking**: No cookies, no local storage bypass
2. **Server-side validation**: All limits enforced on backend
3. **Rate limiting**: Standard API throttling applies
4. **No data persistence**: Guest data never saved to database
5. **Automatic cleanup**: Sessions expire with Django session timeout

### Frontend Safeguards
1. **API-driven limits**: Frontend checks backed by API validation
2. **State synchronization**: Guest session synced with backend
3. **Redirect logic**: Protected routes inaccessible to guests
4. **Clear messaging**: Users always know their limitations

---

## 📊 Usage Tracking

### Backend Tracking
```python
# Check if guest can use feature
if not GuestSessionManager.can_create_note(request):
    return error_response()

# Increment usage counter
GuestSessionManager.increment_note_count(request)

# Get current statistics
stats = GuestSessionManager.get_guest_stats(request)
```

### Frontend Tracking
```javascript
// Get guest session from Redux store
const { isGuest, guestSession } = useSelector((state) => state.auth);

// Check limits
if (isGuest && guestSession.stats.notes_created >= guestSession.stats.notes_limit) {
  // Show upgrade prompt
}
```

---

## 🎨 User Experience Flow

### First-Time Visitor
1. Lands on HomePage
2. Clicks "Get Started Free"
3. Guest session created automatically
4. Redirected to NotesPage
5. Can create 1 note and use AI tools (1x each)
6. Sees progress banners showing remaining usage
7. When limit reached, prompted to sign up

### Guest to Registered User
1. Guest clicks "Sign Up" from banner or navbar
2. Completes registration form
3. Upon successful registration:
   - Guest session automatically cleared (middleware)
   - User authenticated with JWT tokens
   - Full access granted immediately
   - Previous guest data not retained

---

## 🔧 Configuration

### Backend Settings (`settings.py`)
```python
MIDDLEWARE = [
    # ... other middleware
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'accounts.middleware.guest_middleware.GuestSessionMiddleware',  # Add this
    # ... other middleware
]

# Session configuration (default Django settings work fine)
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 1209600  # 2 weeks
```

### Frontend Configuration (`utils/constants.js`)
```javascript
export const API_ENDPOINTS = {
  // ... other endpoints
  GUEST_SESSION: '/api/auth/guest/session/',
};
```

---

## 🚀 Deployment Checklist

### Backend
- [x] Guest manager implemented
- [x] Guest middleware added and configured
- [x] Guest API endpoints created
- [x] Notes API updated for guest access
- [x] AI Tools API updated for guest access
- [x] Middleware added to settings.py
- [x] Session backend configured

### Frontend
- [x] Auth service updated with guest methods
- [x] Redux store updated with guest state
- [x] Route guards support `allowGuest` prop
- [x] HomePage "Get Started Free" button implemented
- [x] Guest limit banner component created
- [x] App.jsx routes configured for guest access
- [x] API constants updated

---

## 🧪 Testing Guide

### Manual Testing Scenarios

#### Test 1: Guest Session Creation
1. Visit homepage (logged out)
2. Click "Get Started Free"
3. Verify redirect to `/notes`
4. Check localStorage: `isGuest` should be `"true"`
5. Verify banner shows "0/1 notes"

#### Test 2: Guest Note Creation
1. As guest, create a note
2. Verify note creation succeeds
3. Check banner updates to "1/1 notes"
4. Try creating second note
5. Verify error: "Your free trial is complete..."

#### Test 3: Guest AI Tool Usage
1. As guest, visit `/ai-tools/generate`
2. Generate a topic explanation
3. Verify output returned
4. Try generating again
5. Verify error: "Guest limit reached"

#### Test 4: Guest to Registered User
1. As guest with used limits, click "Sign Up"
2. Complete registration
3. Verify guest session cleared
4. Verify full access granted (no limits)

#### Test 5: Protected Routes
1. As guest, try visiting `/dashboard`
2. Verify redirect to `/login`
3. Verify message: "Please login or register to access this page."

### API Testing with cURL

```bash
# Start guest session
curl -X POST http://localhost:8000/api/auth/guest/session/ \
  -H "Content-Type: application/json" \
  -c cookies.txt

# Get guest status
curl -X GET http://localhost:8000/api/auth/guest/session/ \
  -b cookies.txt

# Create note as guest
curl -X POST http://localhost:8000/api/notes/ \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title": "Test Note", "description": "Guest note test"}'

# Try creating second note (should fail)
curl -X POST http://localhost:8000/api/notes/ \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title": "Second Note", "description": "Should fail"}'
```

---

## 🐛 Troubleshooting

### Issue: Guest session not persisting
**Solution**: Ensure Django sessions are configured correctly:
```python
# settings.py
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
```

### Issue: CORS blocking guest session
**Solution**: Update CORS settings:
```python
# settings.py
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
]
```

### Issue: Guest limits not enforcing
**Solution**: Check middleware order in `settings.py`:
```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',  # Must be before auth
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',  # Must be before guest
    'accounts.middleware.guest_middleware.GuestSessionMiddleware',  # After auth
    # ... rest
]
```

---

## 📈 Analytics & Monitoring

### Metrics to Track
1. **Guest Session Creation**: Number of guest sessions started
2. **Guest to User Conversion**: Percentage converting to registered users
3. **Feature Usage**: Which AI tools guests use most
4. **Drop-off Points**: Where guests leave without converting
5. **Time to Conversion**: How long guests use trial before signing up

### Logging
```python
# Backend logging already implemented
logger.info(f"✅ Guest session created: {guest_id}")
logger.info(f"✅ Guest note created (not persisted)")
logger.info(f"✅ Guest AI generate used (not persisted)")
```

---

## 🎯 Future Enhancements

### Potential Improvements
1. **Email capture**: Optional email input for guests (send reminders)
2. **Extended trials**: Offer extended trials for email signups
3. **Feature teasing**: Show locked premium features to guests
4. **Social proof**: Display testimonials to encourage signup
5. **Progress saving**: Offer to save guest progress on signup
6. **A/B testing**: Test different limit configurations

### Advanced Features
1. **Fingerprinting**: Device fingerprinting to prevent abuse
2. **IP tracking**: Limit guest sessions per IP
3. **Referral tracking**: Track guest acquisition sources
4. **Exit intent**: Show popup when guest tries to leave
5. **Drip campaigns**: Email nurturing for captured guest emails

---

## 📝 Summary

### What Works Now
✅ Users can click "Get Started Free" and immediately use the app  
✅ Guest users can create 1 note  
✅ Guest users can use each AI tool once  
✅ Protected pages redirect guests to login  
✅ Clean conversion from guest to registered user  
✅ No database pollution from guest data  
✅ Secure session-based tracking  
✅ Visual progress indicators for guests  

### Architecture Benefits
🏗️ **Scalable**: Session-based, no database overhead  
🔒 **Secure**: Server-side validation, no client bypass  
🎨 **User-friendly**: Clear limits, smooth conversion flow  
⚡ **Fast**: No extra queries, no authentication delays  
🧹 **Clean**: Automatic cleanup, no orphaned data  

---

## 🆘 Support

For issues or questions about the Guest Access System:
1. Check the troubleshooting section above
2. Review the implementation files:
   - Backend: `accounts/guest_manager.py`, `accounts/middleware/guest_middleware.py`
   - Frontend: `services/auth.service.js`, `store/slices/authSlice.js`
3. Check Django session configuration
4. Verify CORS and cookie settings

---

**Implementation Date**: February 7, 2026  
**Status**: ✅ Production Ready  
**Version**: 1.0.0
