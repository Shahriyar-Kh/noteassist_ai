# Google OAuth Configuration & Testing Guide

## ✅ Configuration Complete!

Your Google OAuth is now properly configured for development. Here's what was fixed:

### Changes Made:

#### 1. **Backend (.env)**
```env
# BEFORE (Wrong):
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/auth/google/callback/

# AFTER (Correct):
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/notes/google-callback/
```

#### 2. **Frontend (.env.development)** - NEW
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_OAUTH_CLIENT_ID=732779644819-77j15g59nbfh8qe3ffjkhpg47o48hd05.apps.googleusercontent.com
VITE_GOOGLE_DRIVE_ENABLED=true
VITE_ENVIRONMENT=development
```

#### 3. **Django Settings (settings.py)** - Already Configured
```python
BACKEND_URL = 'http://localhost:8000'  # for development
GOOGLE_DRIVE_REDIRECT_URI = f"{BACKEND_URL}/api/notes/google-callback/"
GOOGLE_OAUTH_CLIENT_ID = from .env
GOOGLE_OAUTH_CLIENT_SECRET = from .env
```

---

## 🔍 Google Cloud Console Configuration (Required)

### Verify These Settings in Google Cloud:

**Authorized JavaScript Origins:**
- ✅ https://noteassesstai.vercel.app
- ✅ http://localhost:5173 (Vite frontend)
- ✅ http://localhost:3000 (React dev)
- ✅ http://localhost (localhost only)

**Authorized Redirect URIs:**
- ✅ http://localhost:8000/api/notes/google-callback/
- ✅ https://noteassist-backend.onrender.com/api/notes/google-callback/ (production)

### How to Verify:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **NoteAssisst-ai-client**
3. Go to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 client ID
5. Check **Authorized redirect URIs** includes:
   - `http://localhost:8000/api/notes/google-callback/`

---

## 🧪 Testing Google OAuth in Development

### Step 1: Start Both Servers

**Terminal 1 - Backend:**
```bash
cd NoteAssist_AI_Backend
python manage.py runserver
# Server runs on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd NoteAssist_AI_frontend
npm run dev
# Server runs on http://localhost:5173
```

### Step 2: Test Login Page

1. Open browser: http://localhost:5173
2. Click "Login" button
3. You should see Google Sign-In button
4. Click "Sign in with Google"
5. Browser opens Google login popup
6. Log in with your Google account
7. Google redirects to: `http://localhost:8000/api/notes/google-callback/`

### Step 3: Verify Callback

Check Django logs should show:
```
🔐 Google callback received
   State: <token>...
   Code: <auth_code>...
```

If successful, you should be redirected back to the app dashboard.

---

## 🔧 Troubleshooting

### Issue 1: "redirect_uri_mismatch" Error

**Cause:** The redirect URI in Google Cloud doesn't match the actual callback URL

**Fix:**
1. Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add or verify this URI exists:
   ```
   http://localhost:8000/api/notes/google-callback/
   ```
4. Save changes
5. Wait 1-5 minutes for changes to propagate
6. Try login again

### Issue 2: Google Button Not Showing

**Cause:** Frontend environment variables not loaded

**Fix:**
1. Restart frontend dev server:
   ```bash
   cd NoteAssist_AI_frontend
   npm run dev
   ```
2. Check browser console for errors (F12 → Console)
3. Verify `.env.development` has correct `VITE_GOOGLE_OAUTH_CLIENT_ID`

### Issue 3: Blank Popup or "Invalid Client ID"

**Cause:** Client ID mismatch between Google Cloud and environment variables

**Fix:**
```bash
# Backend .env
GOOGLE_OAUTH_CLIENT_ID=732779644819-77j15g59nbfh8qe3ffjkhpg47o48hd05.apps.googleusercontent.com

# Frontend .env.development
VITE_GOOGLE_OAUTH_CLIENT_ID=732779644819-77j15g59nbfh8qe3ffjkhpg47o48hd05.apps.googleusercontent.com
```

Both must match exactly! They should be identical.

### Issue 4: CORS Error When Calling Backend API

**Cause:** CORS not properly configured

**Fix:** Already configured in `settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://noteassesstai.vercel.app',
]
```

Verify:
1. Backend is running on `http://localhost:8000`
2. Frontend is running on `http://localhost:5173` (or 3000)
3. Your `.env` file has correct values

---

## 📋 Environment Variables Checklist

### Backend (.env)
```
✅ GOOGLE_OAUTH_CLIENT_ID=<your-client-id>
✅ GOOGLE_OAUTH_CLIENT_SECRET=<your-client-secret>
✅ GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/notes/google-callback/
✅ DATABASE_URL=postgresql://...
✅ DEBUG=True
✅ ENVIRONMENT=development
✅ CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend (.env.development)
```
✅ VITE_API_BASE_URL=http://localhost:8000
✅ VITE_GOOGLE_OAUTH_CLIENT_ID=<same-as-backend>
✅ VITE_GOOGLE_DRIVE_ENABLED=true
✅ VITE_ENVIRONMENT=development
```

---

## 🚀 Production Configuration

For production deployment to Render and Vercel:

### Render Environment Variables
```
ENVIRONMENT=production
DEBUG=False
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
GOOGLE_OAUTH_CLIENT_ID=<your-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<your-client-secret>
ALLOWED_HOSTS=noteassist-backend.onrender.com
CORS_ALLOWED_ORIGINS=https://noteassesstai.vercel.app
```

### Vercel Environment Variables
```
VITE_API_BASE_URL=https://noteassist-backend.onrender.com
VITE_GOOGLE_OAUTH_CLIENT_ID=<your-client-id>
```

### Google Cloud Console Production URIs
```
Authorized JavaScript Origins:
- https://noteassesstai.vercel.app

Authorized Redirect URIs:
- https://noteassist-backend.onrender.com/api/notes/google-callback/
```

---

## ✨ Quick Test

Run this in Django shell to verify configuration:

```bash
python manage.py shell
```

```python
from django.conf import settings
print(f"GOOGLE_OAUTH_CLIENT_ID: {settings.GOOGLE_OAUTH_CLIENT_ID}")
print(f"GOOGLE_OAUTH_CONFIGURED: {settings.GOOGLE_OAUTH_CONFIGURED}")
print(f"GOOGLE_DRIVE_REDIRECT_URI: {settings.GOOGLE_DRIVE_REDIRECT_URI}")
print(f"BACKEND_URL: {settings.BACKEND_URL}")
print(f"CORS_ALLOWED_ORIGINS: {settings.CORS_ALLOWED_ORIGINS}")
```

Expected output:
```
GOOGLE_OAUTH_CLIENT_ID: 732779644819-77j15g59nbfh8qe3ffjkhpg47o48hd05.apps.googleusercontent.com
GOOGLE_OAUTH_CONFIGURED: True
GOOGLE_DRIVE_REDIRECT_URI: http://localhost:8000/api/notes/google-callback/
BACKEND_URL: http://localhost:8000
CORS_ALLOWED_ORIGINS: ['http://localhost:3000', 'http://localhost:5173', ...]
```

---

## 📚 Related Files

- Backend settings: [NoteAssist_AI_Backend/NoteAssist_AI/settings.py](../NoteAssist_AI_Backend/NoteAssist_AI/settings.py)
- Google callback view: [NoteAssist_AI_Backend/notes/google_callback.py](../NoteAssist_AI_Backend/notes/google_callback.py)
- Frontend config: [NoteAssist_AI_frontend/.env.development](./.env.development)
- Login page: [NoteAssist_AI_frontend/src/pages/LoginPage.jsx](./src/pages/LoginPage.jsx)

---

**Last Updated:** February 7, 2026  
**Status:** ✅ Development Ready
