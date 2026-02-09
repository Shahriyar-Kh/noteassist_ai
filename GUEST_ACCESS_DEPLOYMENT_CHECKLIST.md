# 🚀 Guest Access System - Deployment Checklist

## Pre-Deployment Verification

### ✅ Backend Verification

#### 1. Files Exist
- [ ] `accounts/guest_manager.py` exists
- [ ] `accounts/middleware/guest_middleware.py` exists
- [ ] Guest middleware added to `settings.py` MIDDLEWARE list
- [ ] Guest session endpoint added to `accounts/urls.py`

#### 2. Settings Configuration
```bash
# Check these settings in NoteAssist_AI/settings.py:
```
- [ ] `CORS_ALLOW_CREDENTIALS = True`
- [ ] `SESSION_COOKIE_HTTPONLY = True`
- [ ] `SESSION_COOKIE_SAMESITE = 'Lax'`
- [ ] `GuestSessionMiddleware` in MIDDLEWARE (after AuthenticationMiddleware)

#### 3. API Endpoints Work
```bash
# Test guest session creation:
curl -X POST http://localhost:8000/api/auth/guest/session/ \
  -H "Content-Type: application/json" \
  -c cookies.txt

# Response should include:
# - is_guest: true
# - guest_id: (uuid)
# - stats: {...}
```
- [ ] POST /api/auth/guest/session/ returns 201
- [ ] GET /api/auth/guest/session/ returns guest stats
- [ ] DELETE /api/auth/guest/session/ clears session

#### 4. Notes API Guest Access
```bash
# Test note creation as guest:
curl -X POST http://localhost:8000/api/notes/ \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title": "Test", "description": "Guest test"}'

# First attempt should succeed
# Second attempt should return 403 with "Guest limit reached"
```
- [ ] First note creation succeeds (returns 201)
- [ ] Second note creation fails (returns 403)
- [ ] Error message includes "Your free trial is complete..."

#### 5. AI Tools Guest Access
```bash
# Test AI tool as guest:
curl -X POST http://localhost:8000/api/ai-tools/generate/ \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"topic": "Test", "level": "beginner", "subject_area": "general"}'

# First attempt should work
# Second attempt should return 403
```
- [ ] Generate tool: First attempt works, second fails
- [ ] Improve tool: First attempt works, second fails
- [ ] Summarize tool: First attempt works, second fails
- [ ] Code tool: First attempt works, second fails

---

### ✅ Frontend Verification

#### 1. Files Exist
- [ ] `services/auth.service.js` has guest methods
- [ ] `store/slices/authSlice.js` has guest state
- [ ] `components/common/GuestLimitBanner.jsx` exists
- [ ] `components/common/GuestModeIndicator.jsx` exists
- [ ] `withCredentials: true` in `services/api.js`

#### 2. Constants Updated
```javascript
// Check utils/constants.js:
```
- [ ] `GUEST_SESSION: '/api/auth/guest/session/'` exists

#### 3. Route Guards Updated
```javascript
// Check components/guards/ProtectedRoute.jsx:
```
- [ ] `allowGuest` prop defined
- [ ] Guest users can access routes with `allowGuest={true}`
- [ ] Guest users redirected from protected routes

#### 4. Routes Configured
```javascript
// Check App.jsx:
```
- [ ] `/notes` has `allowGuest={true}`
- [ ] `/ai-tools` has `allowGuest={true}`
- [ ] `/ai-tools/generate` has `allowGuest={true}`
- [ ] `/ai-tools/improve` has `allowGuest={true}`
- [ ] `/ai-tools/summarize` has `allowGuest={true}`
- [ ] `/ai-tools/code` has `allowGuest={true}`
- [ ] `/dashboard` does NOT have `allowGuest`
- [ ] `/profile` does NOT have `allowGuest`

#### 5. HomePage Updated
```javascript
// Check pages/HomePage.jsx:
```
- [ ] Imports `startGuestSession` from Redux
- [ ] `handleStartFree()` function exists
- [ ] "Get Started Free" button calls `handleStartFree()`
- [ ] Loading state shows "Starting..." text
- [ ] Redirects to `/notes` on success

---

## 🧪 Manual Testing Checklist

### Test Scenario 1: Guest Session Creation
1. [ ] Open homepage (not logged in)
2. [ ] Click "Get Started Free" button
3. [ ] Should see loading state briefly
4. [ ] Should redirect to `/notes`
5. [ ] Check localStorage: `isGuest` = "true"
6. [ ] Check localStorage: `guestSession` exists with stats

**Expected Result:**
- Redirect to notes page
- Guest session created
- No errors in console

---

### Test Scenario 2: Guest Note Creation
1. [ ] On notes page as guest
2. [ ] Should see guest banner: "0/1 notes"
3. [ ] Click "Create Note"
4. [ ] Fill in title and description
5. [ ] Submit form
6. [ ] Note should be created
7. [ ] Banner updates to "1/1 notes"
8. [ ] Try creating second note
9. [ ] Should see error: "Your free trial is complete..."

**Expected Result:**
- First note succeeds
- Second note fails with friendly message
- Banner shows correct usage

---

### Test Scenario 3: Guest AI Tool Usage
1. [ ] As guest, visit `/ai-tools/generate`
2. [ ] Fill in form (topic, level, subject)
3. [ ] Click "Generate"
4. [ ] Should see AI output
5. [ ] Banner shows "1/1 attempts"
6. [ ] Try generating again
7. [ ] Should see error: "Guest limit reached"

**Expected Result:**
- First attempt succeeds
- Second attempt fails
- Clear upgrade prompt shown

**Repeat for:**
- [ ] `/ai-tools/improve`
- [ ] `/ai-tools/summarize`
- [ ] `/ai-tools/code`

---

### Test Scenario 4: Protected Route Access
1. [ ] As guest, try visiting `/dashboard`
2. [ ] Should redirect to `/login`
3. [ ] Should see message: "Please login or register to access this page"

**Test these routes:**
- [ ] `/dashboard` → Redirects to login
- [ ] `/profile` → Redirects to login
- [ ] `/ai-tools/history` → Redirects to login
- [ ] `/admin` → Redirects to login

**Expected Result:**
- All protected routes redirect guests
- Clear messaging displayed

---

### Test Scenario 5: Guest to User Conversion
1. [ ] As guest with used limits
2. [ ] Click "Sign Up" from banner
3. [ ] Complete registration form
4. [ ] Submit registration
5. [ ] Should be logged in
6. [ ] Guest session should be cleared
7. [ ] Try creating multiple notes → Should work!
8. [ ] Try using AI tools multiple times → Should work!

**Expected Result:**
- Smooth conversion to registered user
- Full access granted immediately
- No more guest restrictions

---

### Test Scenario 6: Navbar Guest Indicator (Optional)
If you add `<GuestModeIndicator />` to navbar:
1. [ ] As guest, should see "Guest Mode" badge
2. [ ] Badge shows current usage
3. [ ] Clicking badge → redirects to register

---

## 🔍 Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Mobile Chrome
- [ ] Mobile Safari
- [ ] Mobile Firefox

### Cookie/Session Tests
- [ ] Guest session persists after page refresh
- [ ] Guest session persists after closing/reopening tab
- [ ] Guest session clears after user login
- [ ] Incognito mode works (new session each time)

---

## 🐛 Common Issues & Solutions

### Issue: "Guest session not creating"
**Check:**
- [ ] Backend server running
- [ ] CORS configured correctly
- [ ] `withCredentials: true` in api.js
- [ ] No console errors

**Fix:** Check browser network tab for 500 errors

---

### Issue: "Guest session not persisting"
**Check:**
- [ ] Cookies enabled in browser
- [ ] `SESSION_COOKIE_HTTPONLY = True`
- [ ] `CORS_ALLOW_CREDENTIALS = True`

**Fix:** Check browser cookie storage

---

### Issue: "Limits not enforcing"
**Check:**
- [ ] Guest middleware in MIDDLEWARE list
- [ ] Middleware order correct
- [ ] Backend validation running

**Fix:** Add debug logging to guest_manager.py

---

### Issue: "Routes not accessible to guests"
**Check:**
- [ ] `allowGuest={true}` on route
- [ ] ProtectedRoute accepts `allowGuest` prop
- [ ] PropTypes defined correctly

**Fix:** Check route configuration in App.jsx

---

## 📊 Performance Checklist

### Backend Performance
- [ ] No database queries for guest sessions
- [ ] Session data stored in cache/memory
- [ ] No N+1 query issues
- [ ] API responses < 200ms

### Frontend Performance
- [ ] No unnecessary re-renders
- [ ] Redux state updates minimal
- [ ] Components lazy-loaded where possible
- [ ] No memory leaks

---

## 🔐 Security Checklist

### Backend Security
- [ ] Server-side validation only
- [ ] No client-side bypass possible
- [ ] Session timeout configured
- [ ] CSRF protection enabled
- [ ] Rate limiting applied

### Frontend Security
- [ ] No sensitive data in localStorage
- [ ] Session tokens httpOnly
- [ ] XSS protection enabled
- [ ] HTTPS enforced in production

---

## 📝 Documentation Checklist

- [ ] `GUEST_ACCESS_GUIDE.md` created
- [ ] `GUEST_ACCESS_QUICK_START.md` created
- [ ] `GUEST_ACCESS_SUMMARY.md` created
- [ ] Code comments clear and helpful
- [ ] API endpoints documented
- [ ] Testing procedures documented

---

## 🚀 Production Deployment Steps

### 1. Code Review
- [ ] All code reviewed and approved
- [ ] No console.log statements in production code
- [ ] Error handling comprehensive
- [ ] Edge cases considered

### 2. Environment Variables
```bash
# Ensure these are set in production:
```
- [ ] `SECRET_KEY` (strong, unique)
- [ ] `DEBUG = False`
- [ ] `ALLOWED_HOSTS` includes production domain
- [ ] `CORS_ALLOWED_ORIGINS` includes frontend URL
- [ ] `SESSION_COOKIE_SECURE = True` (HTTPS only)

### 3. Database
- [ ] Migrations applied
- [ ] Database backed up
- [ ] Session table ready

### 4. Static Files
- [ ] Frontend built for production
- [ ] Static files collected (Django)
- [ ] Assets optimized

### 5. Monitoring
- [ ] Logging configured
- [ ] Error tracking enabled (e.g., Sentry)
- [ ] Analytics tracking ready
- [ ] Performance monitoring active

### 6. Testing in Production
- [ ] Smoke tests pass
- [ ] Guest flow works end-to-end
- [ ] No console errors
- [ ] Performance acceptable

---

## 📈 Post-Deployment Monitoring

### Week 1
- [ ] Monitor guest session creation rate
- [ ] Track conversion rate (guest → user)
- [ ] Check for errors in logs
- [ ] Verify performance metrics
- [ ] Gather user feedback

### Week 2-4
- [ ] Analyze conversion funnel
- [ ] Identify drop-off points
- [ ] A/B test messaging
- [ ] Optimize limits if needed
- [ ] Iterate based on data

---

## ✅ Final Sign-Off

**Before going live, confirm:**
- [ ] All manual tests passed
- [ ] No critical bugs found
- [ ] Documentation complete
- [ ] Team trained on new feature
- [ ] Rollback plan ready
- [ ] Support team informed

---

## 🎉 Go Live!

Once all boxes are checked:

```bash
# Deploy backend
cd NoteAssist_AI_Backend
python manage.py migrate
python manage.py collectstatic --noinput
gunicorn NoteAssist_AI.wsgi:application

# Deploy frontend
cd NoteAssist_AI_frontend
npm run build
# Deploy build folder to hosting
```

**Congratulations! Guest Access System is LIVE! 🚀**

---

**Date**: February 7, 2026  
**Status**: Ready for Production ✅  
**Version**: 1.0.0
