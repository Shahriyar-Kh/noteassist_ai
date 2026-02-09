# Deploy Backend to Render - Complete Guide

## ✅ Current Status

- ✅ Frontend deployed on Vercel: **https://noteassesstai.vercel.app**
- ✅ Supabase PostgreSQL database created
- ✅ Database configuration: SQLite3 (local) → Supabase (production)
- ⏳ Backend deployment: READY

---

## 🚀 Step 1: Push Code to GitHub

```bash
cd d:\Django Projects\NoteAssist_AI

# Commit all changes
git add .
git commit -m "Prepare backend for production deployment on Render"
git push origin main
```

**Verify on GitHub:**
- Go to: https://github.com/Shahriyar-Kh/noteassist_ai
- Should see all files on `main` branch

---

## 🔧 Step 2: Create Render Web Service

### 2.1 Go to Render Dashboard
1. Open: https://dashboard.render.com
2. Sign in with GitHub
3. Click **"New +"** button
4. Select **"Web Service"**

### 2.2 Connect GitHub Repository
1. Click **"Connect GitHub account"**
2. Find and select: **noteassist_ai** repository
3. Click **"Connect"**

### 2.3 Configure Web Service

**Fill in these fields:**

| Field | Value |
|-------|-------|
| **Name** | `noteassist-backend` |
| **Environment** | `Python 3.9` |
| **Region** | Choose closest to you (e.g., `us-east-1`) |
| **Branch** | `main` |
| **Root Directory** | `NoteAssist_AI_Backend` |
| **Build Command** | `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate` |
| **Start Command** | `gunicorn NoteAssist_AI.wsgi:application --bind 0.0.0.0:$PORT --workers 2` |
| **Plan** | `Free` |

### 2.4 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

**Add these variables one by one:**

```env
DEBUG=False
ENVIRONMENT=production
SECRET_KEY=generate-new-secret-key
ALLOWED_HOSTS=noteassist-backend.onrender.com,localhost
DATABASE_URL=postgresql://postgres:YOUR_SUPABASE_PASSWORD@db.uxbdbkopymgjqwccghvq.supabase.co:5432/postgres
GOOGLE_OAUTH_CLIENT_ID=732779644819-77j15g59nbfh8qe3ffjkhpg47o48hd05.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=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
EMAIL_HOST_USER=shahriyarkhanpk1@gmail.com
EMAIL_HOST_PASSWORD=qsazgleqkccsgnuk
CORS_ALLOWED_ORIGINS=https://noteassesstai.vercel.app,http://localhost:5173,http://localhost:3000
```

### 2.5 Generate SECRET_KEY

Open PowerShell and run:

```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the output and paste it as `SECRET_KEY` in Render.

### 2.6 Deploy

Click **"Create Web Service"**

**Wait 5-10 minutes for:**
- Build to complete
- Migrations to run
- Server to start

---

## ✅ Step 3: Verify Deployment

### 3.1 Check Render Dashboard

1. Go to: https://dashboard.render.com
2. Click on **"noteassist-backend"** service
3. Check the **Logs** tab for:
   ```
   ✅ Build successful
   ✅ Running migrations
   ✅ Server started on port
   ```

### 3.2 Get Backend URL

Your backend URL will be shown in the dashboard:
```
https://noteassist-backend.onrender.com
```

### 3.3 Test API Endpoints

```bash
# Test if server is running
curl https://noteassist-backend.onrender.com/

# Test health check (if endpoint exists)
curl https://noteassist-backend.onrender.com/api/

# Test admin panel
# Open in browser: https://noteassist-backend.onrender.com/admin/
```

---

## 🌐 Step 4: Update Vercel Environment Variables

Now that backend is deployed, update Vercel with the production backend URL.

### 4.1 Go to Vercel Dashboard

1. Open: https://vercel.com/dashboard
2. Click on **"noteassist-frontend"** project
3. Go to **"Settings"** → **"Environment Variables"**

### 4.2 Update/Add Variables

**Update this variable:**
```
VITE_API_BASE_URL=https://noteassist-backend.onrender.com
```

(Previously was `http://localhost:8000` for local dev)

### 4.3 Redeploy Frontend

1. Go to **"Deployments"** tab
2. Click the latest deployment
3. Click **"Redeploy"** button

Wait for frontend to rebuild and redeploy.

---

## 🔐 Step 5: Update Google Cloud Console

Add production URLs to your Google OAuth credentials.

### 5.1 Go to Google Cloud Console

1. Open: https://console.cloud.google.com/
2. Select your project
3. Go to **"APIs & Services"** → **"Credentials"**
4. Click on your OAuth 2.0 Client ID

### 5.2 Add Production URIs

**Authorized JavaScript Origins** - Add:
```
https://noteassesstai.vercel.app
```

**Authorized Redirect URIs** - Add:
```
https://noteassist-backend.onrender.com/api/notes/google-callback/
```

### 5.3 Save and Verify

Click **"Save"**

Wait 5-10 minutes for changes to propagate.

---

## 📋 Environment Variables Reference

### Backend (.env - DO NOT COMMIT)
```env
# Development (Local - SQLite3)
DEBUG=True
ENVIRONMENT=development
DATABASE_URL=  # Leave empty to use SQLite3
ALLOWED_HOSTS=localhost,127.0.0.1

# Production (Render - Supabase)
DEBUG=False
ENVIRONMENT=production
DATABASE_URL=postgresql://postgres:PASSWORD@db.uxbdbkopymgjqwccghvq.supabase.co:5432/postgres
ALLOWED_HOSTS=noteassist-backend.onrender.com,localhost
```

### Frontend (.env.development - for local dev)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_OAUTH_CLIENT_ID=732779644819-77j15g59nbfh8qe3ffjkhpg47o48hd05.apps.googleusercontent.com
VITE_ENVIRONMENT=development
```

### Vercel (Environment Variables)
```env
VITE_API_BASE_URL=https://noteassist-ai.onrender.com
VITE_GOOGLE_OAUTH_CLIENT_ID=732779644819-77j15g59nbfh8qe3ffjkhpg47o48hd05.apps.googleusercontent.com
VITE_ENVIRONMENT=production
```

### Render (Environment Variables)
```env
DEBUG=False
ENVIRONMENT=production
SECRET_KEY=<generate-new>
ALLOWED_HOSTS=noteassist-backend.onrender.com,localhost
DATABASE_URL=postgresql://postgres:PASSWORD@db.uxbdbkopymgjqwccghvq.supabase.co:5432/postgres
GOOGLE_OAUTH_CLIENT_ID=732779644819-77j15g59nbfh8qe3ffjkhpg47o48hd05.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=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
CORS_ALLOWED_ORIGINS=https://noteassesstai.vercel.app,http://localhost:5173,http://localhost:3000
EMAIL_HOST_USER=shahriyarkhanpk1@gmail.com
EMAIL_HOST_PASSWORD=qsazgleqkccsgnuk
```

---

## 🧪 Testing After Deployment

### Test 1: Backend API
```bash
# Test API is accessible
curl https://noteassist-backend.onrender.com/admin/

# Should show Django admin login page (HTML)
```

### Test 2: Frontend Connection
1. Open: https://noteassesstai.vercel.app
2. Should load without errors
3. Check browser console (F12) for errors

### Test 3: Google OAuth
1. Open: https://noteassesstai.vercel.app
2. Click "Login" → "Sign in with Google"
3. Should open Google login popup
4. After login, should redirect to dashboard

### Test 4: Database
1. Render dashboard → Logs
2. Should show: `Running migrations...`
3. No database errors in logs

---

## 🐛 Troubleshooting

### Issue 1: "Build failed"
**Check Render Logs:**
- Go to Dashboard → noteassist-backend → Logs
- Look for error messages
- Common causes:
  - Missing requirements
  - Syntax errors
  - Permission issues

**Fix:**
```bash
# Verify requirements.txt locally
pip install -r requirements.txt
python manage.py check
```

### Issue 2: "ALLOWED_HOSTS error"
**Error:** `Invalid HTTP_HOST header`

**Fix:**
Add your domain to Render environment variables:
```
ALLOWED_HOSTS=noteassist-backend.onrender.com
```

### Issue 3: "Database connection error"
**Error:** `FATAL: remaining connection slots are reserved`

**Check:**
1. DATABASE_URL is correct in Render
2. Supabase database is running
3. Connection string matches exactly

### Issue 4: "Static files 404"
**Error:** CSS/JS files return 404

**Fix:**
Already handled by:
- WhiteNoise middleware in settings.py
- `collectstatic` in build command

### Issue 5: "Google OAuth redirect_uri_mismatch"
**Error:** OAuth error when logging in

**Fix:**
1. Add production redirect URI to Google Cloud Console:
   ```
   https://noteassist-backend.onrender.com/api/notes/google-callback/
   ```
2. Wait 5 minutes for propagation
3. Try login again

---

## 📊 Database Setup

### Verify Supabase Connection

1. Go to: https://supabase.com
2. Select your project: **NoteAssist-AI**
3. Check **Table Editor**
4. Should see all tables:
   - `accounts_user`
   - `notes_note`
   - And 60+ other tables

### Create Superuser in Production

After first deploy:

```bash
# Option 1: Via Render Shell (if available)
1. Render Dashboard → noteassist-backend → Shell
2. Run: python manage.py createsuperuser

# Option 2: Local machine
export DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
python manage.py createsuperuser
```

### Access Django Admin

```
URL: https://noteassist-backend.onrender.com/admin/
Username: admin@noteassist.ai
Password: (whatever you set)
```

---

## ✨ Summary

| Step | Status | Time |
|------|--------|------|
| Push code to GitHub | ✅ Ready | 1 min |
| Create Render service | ⏳ TODO | 5 min |
| Add environment variables | ⏳ TODO | 5 min |
| Wait for build & deploy | ⏳ TODO | 10 min |
| Update Vercel | ⏳ TODO | 5 min |
| Update Google OAuth | ⏳ TODO | 5 min |
| Test production | ⏳ TODO | 5 min |

**Total Time: ~40 minutes**

---

## 🎯 What Happens When?

### Local (Development)
```
You run: npm run dev
Frontend: http://localhost:5173
Backend: http://localhost:8000
Database: SQLite3 (db.sqlite3)
```

### Production (After Deploy)
```
Frontend: https://noteassesstai.vercel.app
Backend: https://noteassist-backend.onrender.com
Database: Supabase PostgreSQL
```

---

**Status:** Ready for Render deployment  
**Last Updated:** February 7, 2026
