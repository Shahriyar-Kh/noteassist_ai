# 🚀 Deployment Checklist - NoteAssist AI

## ✅ Phase 1: Local Development (COMPLETE)

### Database Setup ✅
- [x] Supabase PostgreSQL created (NoteAssist-AI project)
- [x] DATABASE_URL configured
- [x] All 66 migrations applied
- [x] Superuser created
- [x] Database connectivity verified

### Backend Configuration ✅
- [x] Django settings updated for production
- [x] Google OAuth configured correctly
- [x] CORS properly set up
- [x] Email backend configured
- [x] Static files configuration ready
- [x] Security settings configured

### Frontend Configuration ✅
- [x] Vite build tested locally
- [x] Environment variables set
- [x] Google OAuth client ID configured
- [x] API endpoint configured

### Google OAuth ✅
- [x] Backend redirect URI: `/api/notes/google-callback/`
- [x] Frontend client ID configured
- [x] Google Cloud Console settings verified
- [x] Local testing ready

---

## 📋 Phase 2: Production Deployment (READY)

### Prerequisites
- [ ] GitHub repository with all code pushed to `main` branch
- [ ] Render account created
- [ ] Vercel account created
- [ ] Google Cloud OAuth credentials ready
- [ ] Supabase database credentials ready

### Step 1: Deploy Backend to Render

#### 1.1 Connect Repository to Render
```bash
1. Go to https://dashboard.render.com
2. Click "New +"
3. Select "Web Service"
4. Connect GitHub account
5. Select "noteassist_ai" repository
```

#### 1.2 Configure Web Service
```
Name: noteassist-backend
Environment: Python 3.9
Region: Choose closest to you
Branch: main
Root Directory: NoteAssist_AI_Backend
Build Command: pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
Start Command: gunicorn NoteAssist_AI.wsgi:application --bind 0.0.0.0:$PORT --workers 2
```

#### 1.3 Add Environment Variables to Render
```env
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=<generate-with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'>
ALLOWED_HOSTS=noteassist-backend.onrender.com
CORS_ALLOWED_ORIGINS=https://noteassesstai.vercel.app,http://localhost:5173
DATABASE_URL=postgresql://postgres:<PASSWORD>@db.uxbdbkopymgjqwccghvq.supabase.co:5432/postgres
GOOGLE_OAUTH_CLIENT_ID=732779644819-77j15g59nbfh8qe3ffjkhpg47o48hd05.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=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
EMAIL_HOST_USER=shahriyarkhanpk1@gmail.com
EMAIL_HOST_PASSWORD=<your-app-specific-password>
SENDGRID_API_KEY=<optional>
```

#### 1.4 Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete (5-10 minutes)
- [ ] Verify URL: https://noteassist-backend.onrender.com

#### 1.5 Test Backend
```bash
curl https://noteassist-backend.onrender.com/api/health/
# Should return JSON response (or 404 if endpoint doesn't exist)
```

### Step 2: Deploy Frontend to Vercel

#### 2.1 Connect Repository
```
1. Go to https://vercel.com/dashboard
2. Click "Import Project"
3. Select GitHub account
4. Select "noteassist_ai" repository
```

#### 2.2 Configure Project
```
Project Name: noteassist-frontend
Framework: Vite
Root Directory: NoteAssist_AI_frontend
Build Command: npm run build
Output Directory: dist
```

#### 2.3 Add Environment Variables
```env
VITE_API_BASE_URL=https://noteassist-backend.onrender.com
VITE_GOOGLE_OAUTH_CLIENT_ID=732779644819-77j15g59nbfh8qe3ffjkhpg47o48hd05.apps.googleusercontent.com
VITE_GOOGLE_DRIVE_ENABLED=true
VITE_ENVIRONMENT=production
```

#### 2.4 Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete (2-5 minutes)
- [ ] Verify URL: https://noteassesstai.vercel.app

#### 2.5 Test Frontend
```bash
# Open in browser
https://noteassesstai.vercel.app
# Should load app without errors
```

### Step 3: Update Google Cloud Console

#### 3.1 Add Production Origins
```
Go to: Google Cloud Console → APIs & Services → Credentials
Edit OAuth 2.0 Client ID: NoteAssisst-ai-client

Authorized JavaScript Origins:
- https://noteassesstai.vercel.app (PRODUCTION)
- http://localhost:5173 (keep for local dev)
- http://localhost:3000 (keep for local dev)

Authorized Redirect URIs:
- https://noteassist-backend.onrender.com/api/notes/google-callback/ (PRODUCTION)
- http://localhost:8000/api/notes/google-callback/ (keep for local dev)
```

#### 3.2 Verify
- [ ] Wait 5-10 minutes for changes to propagate
- [ ] Test Google login on production site

---

## 🧪 Production Verification

### Backend Tests
```bash
# Check API is responding
curl https://noteassist-backend.onrender.com/api/token/
# Should return: {"detail":"Method \"GET\" not allowed."}

# Check admin panel
Open: https://noteassist-backend.onrender.com/admin/
# Should show login page
```

### Frontend Tests
```bash
1. Open https://noteassesstai.vercel.app
2. Click "Login"
3. Try "Sign in with Google"
4. Complete Google authentication
5. Should be logged in and see dashboard
```

### Database Tests
```bash
# Test from Supabase dashboard
1. Go to Supabase → SQL Editor
2. Run: SELECT count(*) FROM accounts_user;
3. Should show: 1 (admin user)
```

### Email Tests
```bash
1. Go to Django admin
2. Try to send test email
3. Check email inbox
```

---

## 🛠️ Troubleshooting Production Issues

### Issue: "Module not found" or Build Error on Render

**Solution:**
```bash
1. Render Dashboard → Web Service → Logs
2. Check error message
3. Ensure requirements.txt is in NoteAssist_AI_Backend directory
4. Check Python version matches: 3.9
```

### Issue: "CSRF token missing" or CORS Error

**Solution:**
```bash
1. Check CORS_ALLOWED_ORIGINS in Render environment variables
2. Verify frontend URL matches exactly
3. Clear browser cache (Ctrl+Shift+Delete)
4. Restart Render service
```

### Issue: Google Login Not Working

**Solution:**
```bash
1. Check Google Cloud Console has production URLs
2. Wait 10 minutes for DNS propagation
3. Verify DATABASE_URL is correct in Render
4. Check logs for OAuth errors
```

### Issue: Static Files Not Loading (CSS/JS missing)

**Solution:**
```bash
1. Render Dashboard → Web Service → Settings
2. Rebuild manually: "Manual Deploy"
3. Check STATIC_ROOT and STATICFILES_STORAGE settings
```

### Issue: Database Connection Timeout

**Solution:**
```bash
1. Check DATABASE_URL in Render environment
2. Verify Supabase database is running
3. Check connection limit settings in settings.py
4. Increase CONN_MAX_AGE if needed
```

---

## 📊 Post-Deployment Monitoring

### Daily Checks
- [ ] Monitor Render logs for errors
- [ ] Check Vercel build history
- [ ] Verify Google Analytics data
- [ ] Check email delivery logs

### Weekly Checks
- [ ] Test full user flow (login → create note → export)
- [ ] Check database performance
- [ ] Review error logs
- [ ] Test backup/restore process

### Monthly Checks
- [ ] Review costs (Render + Vercel + Supabase)
- [ ] Update dependencies
- [ ] Security audit
- [ ] Performance optimization

---

## 📈 Scaling Considerations

### When to Upgrade

**Render Upgrade (~$22/month):**
- When free tier auto-pauses too frequently
- When load increases significantly
- When more workers needed

**Vercel Upgrade:**
- Usually not needed for small-medium apps
- Pay-as-you-go model (generous free tier)

**Supabase Upgrade:**
- When exceeding storage limits
- When needing dedicated compute

---

## 🔐 Security Checklist

- [ ] DEBUG=False in production
- [ ] SECRET_KEY generated and strong
- [ ] SSL/HTTPS enforced (automatic with Render + Vercel)
- [ ] SECURE_SSL_REDIRECT enabled
- [ ] HSTS headers configured
- [ ] CSRF protection active
- [ ] Environment variables not in git
- [ ] Database password secured
- [ ] Google OAuth secrets not exposed
- [ ] Email passwords app-specific

---

## 📋 File Locations Reference

**Configuration Files:**
- Backend config: `NoteAssist_AI_Backend/NoteAssist_AI/settings.py`
- Render config: `NoteAssist_AI_Backend/render.yaml`
- Procfile: `NoteAssist_AI_Backend/Procfile`
- Requirements: `NoteAssist_AI_Backend/requirements.txt`
- Environment: `.env` (not in git)

**Frontend:**
- Vite config: `NoteAssist_AI_frontend/vite.config.js`
- Environment dev: `NoteAssist_AI_frontend/.env.development`
- Environment prod: `.env.production` (created by Vercel)

**Documentation:**
- Deployment Guide: `DEPLOYMENT_PRODUCTION_GUIDE.md`
- Google OAuth Setup: `GOOGLE_OAUTH_SETUP.md`
- Setup Complete: `SETUP_COMPLETE.md`
- This File: `DEPLOYMENT_CHECKLIST.md`

---

## ✨ Next Steps After Deployment

1. **Send Launch Email**
   - Notify beta users about production URL
   - Share Google OAuth requirements

2. **Setup Analytics**
   - Vercel: Already built-in
   - Render: Setup monitoring dashboard
   - Database: Monitor query performance

3. **Create Backup Plan**
   - Daily backups (Supabase handles automatically)
   - Document recovery process

4. **Scale Plan**
   - Monitor usage metrics
   - Plan for growth
   - Set upgrade thresholds

---

**Checklist Created:** February 7, 2026  
**Status:** Ready for Production Deployment  
**Estimated Deployment Time:** 30-45 minutes
