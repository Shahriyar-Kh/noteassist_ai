# Guest Access System - Quick Start Guide

## 🚀 Quick Implementation Summary

### Backend Changes Made

1. **New Files Created:**
   - `accounts/guest_manager.py` - Core guest session management
   - `accounts/middleware/guest_middleware.py` - Middleware for session handling

2. **Modified Files:**
   - `accounts/views.py` - Added GuestSessionView API endpoint
   - `accounts/urls.py` - Added guest session route
   - `notes/views.py` - Updated to allow guest access with limits
   - `ai_tools/views.py` - Updated to allow guest access with limits
   - `NoteAssist_AI/settings.py` - Added guest middleware to MIDDLEWARE list

### Frontend Changes Made

1. **New Files Created:**
   - `components/common/GuestLimitBanner.jsx` - Usage limit display component
   - `components/common/GuestModeIndicator.jsx` - Navbar guest badge component

2. **Modified Files:**
   - `services/auth.service.js` - Added guest session methods
   - `services/api.js` - Enabled withCredentials for cookies
   - `store/slices/authSlice.js` - Added guest state and actions
   - `utils/constants.js` - Added GUEST_SESSION endpoint
   - `components/guards/ProtectedRoute.jsx` - Added allowGuest prop
   - `pages/HomePage.jsx` - Added guest session starter button
   - `App.jsx` - Marked routes as guest-accessible

3. **Documentation Created:**
   - `GUEST_ACCESS_GUIDE.md` - Comprehensive implementation guide

---

## 🎯 How It Works

### User Flow
```
1. User clicks "Get Started Free" on homepage
   ↓
2. Backend creates guest session (Django session)
   ↓
3. Frontend stores guest state in Redux + localStorage
   ↓
4. User redirected to /notes
   ↓
5. User can:
   - Create 1 note
   - Use each AI tool once (Generate, Improve, Summarize, Code)
   ↓
6. When limit reached → Shown signup prompt
   ↓
7. On signup → Guest session cleared, full access granted
```

### Technical Flow
```
Frontend                    Backend
--------                    -------
Click "Get Started Free"
    ↓
dispatch(startGuestSession())
    ↓                       
POST /api/auth/guest/session/
                            ↓
                         Creates Django session
                         Sets session variables
                         Returns guest_id + stats
    ↓
Store in Redux + localStorage
    ↓
Navigate to /notes
    ↓
Create note (with session cookie)
    ↓
POST /api/notes/
                            ↓
                         Check guest session
                         Check limits
                         Increment counter
                         Return mock note
```

---

## ⚙️ Configuration

### Required Settings (Already Done)

**Backend (`settings.py`):**
```python
MIDDLEWARE = [
    # ... other middleware
    'accounts.middleware.guest_middleware.GuestSessionMiddleware',
]

CORS_ALLOW_CREDENTIALS = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
```

**Frontend (`api.js`):**
```javascript
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,  // Essential for cookies
});
```

---

## 🧪 Testing Checklist

### Manual Testing Steps

**Test 1: Basic Guest Flow**
- [ ] Visit homepage (not logged in)
- [ ] Click "Get Started Free"
- [ ] Should redirect to /notes
- [ ] Should see guest banner showing 0/1 notes
- [ ] Create a note successfully
- [ ] Banner updates to 1/1
- [ ] Try creating second note → Should see error message

**Test 2: AI Tools**
- [ ] As guest, visit /ai-tools/generate
- [ ] Generate a topic → Should work
- [ ] Try generating again → Should show limit reached
- [ ] Repeat for /improve, /summarize, /code

**Test 3: Protected Routes**
- [ ] As guest, try visiting /dashboard → Redirect to login
- [ ] As guest, try visiting /profile → Redirect to login
- [ ] As guest, try visiting /ai-tools/history → Redirect to login

**Test 4: Guest to User Conversion**
- [ ] As guest with used limits, click "Sign Up"
- [ ] Complete registration
- [ ] Should have full access (no limits)
- [ ] Try creating multiple notes → Should work

---

## 📝 Usage in Components

### Check if User is Guest
```javascript
import { useSelector } from 'react-redux';

const { isGuest, guestSession } = useSelector((state) => state.auth);

if (isGuest) {
  // Show guest-specific UI
}
```

### Display Guest Limit Banner
```javascript
import GuestLimitBanner from '@/components/common/GuestLimitBanner';

<GuestLimitBanner 
  featureName="notes"
  currentUsage={notesCreated}
  maxUsage={1}
/>
```

### Add Guest Mode Indicator to Navbar
```javascript
import GuestModeIndicator from '@/components/common/GuestModeIndicator';

<nav>
  {/* ... other nav items */}
  <GuestModeIndicator />
</nav>
```

### Make Route Guest-Accessible
```javascript
<Route path="/notes" element={
  <ProtectedRoute allowGuest={true}>
    <NotesPage />
  </ProtectedRoute>
} />
```

---

## 🔧 Customization

### Change Guest Limits

**Backend (`accounts/guest_manager.py`):**
```python
class GuestSessionManager:
    MAX_NOTES = 1  # Change this
    MAX_AI_TOOL_ATTEMPTS = {
        'generate_topic': 1,   # Change these
        'improve_topic': 1,
        'summarize_topic': 1,
        'generate_code': 1,
    }
```

### Add New Guest-Accessible Routes

**Frontend (`App.jsx`):**
```javascript
<Route path="/your-route" element={
  <ProtectedRoute allowGuest={true}>
    <YourComponent />
  </ProtectedRoute>
} />
```

---

## 🐛 Common Issues & Fixes

### Issue: "Guest session not persisting between requests"
**Cause**: Cookies not being sent  
**Fix**: Ensure `withCredentials: true` in `api.js`

### Issue: "CORS errors when creating guest session"
**Cause**: CORS not configured for credentials  
**Fix**: Check `CORS_ALLOW_CREDENTIALS = True` in settings.py

### Issue: "Guest limits not enforcing"
**Cause**: Middleware not running  
**Fix**: Verify `GuestSessionMiddleware` in MIDDLEWARE list

### Issue: "Guest session cleared unexpectedly"
**Cause**: Session expired  
**Fix**: Increase `SESSION_COOKIE_AGE` in settings.py

---

## 📊 Monitoring & Analytics

### Key Metrics to Track
1. **Conversion Rate**: Guest → Registered User %
2. **Feature Usage**: Which AI tools do guests use most?
3. **Drop-off Rate**: % of guests who leave without signing up
4. **Time to Conversion**: How long from guest → signup?

### Add Logging
```python
# Backend
logger.info(f"Guest session started: {guest_id}")
logger.info(f"Guest converted to user: {user.email}")

# Frontend
console.log('Guest session created:', guestSession);
console.log('Guest limit reached:', featureName);
```

---

## 🎉 Next Steps

### Optional Enhancements
1. **Email Capture**: Add optional email field for guests
2. **Progress Saving**: Offer to save guest work on signup
3. **Social Proof**: Show testimonials to guests
4. **Extended Trial**: Email signup = more free usage
5. **Exit Intent**: Popup when guest tries to leave

### Advanced Features
1. **Device Fingerprinting**: Prevent limit bypass
2. **IP Rate Limiting**: Prevent abuse
3. **Referral Tracking**: Track where guests come from
4. **A/B Testing**: Test different limit configurations

---

## 📞 Need Help?

**Check these first:**
1. Review `GUEST_ACCESS_GUIDE.md` for detailed documentation
2. Check Django session configuration
3. Verify CORS settings
4. Ensure middleware is in correct order

**Common Files to Check:**
- Backend: `accounts/guest_manager.py`
- Frontend: `services/auth.service.js`, `store/slices/authSlice.js`
- Config: `settings.py`, `api.js`

---

**Status**: ✅ Fully Implemented & Ready  
**Last Updated**: February 7, 2026
