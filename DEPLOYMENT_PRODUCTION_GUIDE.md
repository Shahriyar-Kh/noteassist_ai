# Deployment Guide: Frontend (Vercel) & Backend (Render)
## NoteAssist AI - Production Deployment Plan

---

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Backend Deployment (Render)](#backend-deployment-render)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Domain Configuration](#domain-configuration)
8. [Post-Deployment Testing](#post-deployment-testing)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Deployment Architecture
```
Frontend (Vercel)
├── React App (Vite)
├── Tailwind CSS
├── Redux State Management
└── API calls to Backend

Backend (Render)
├── Django REST API
├── PostgreSQL Database
├── Celery Task Queue
└── Google OAuth Integration
```

### Service Providers
- **Frontend**: Vercel (Free Tier)
- **Backend**: Render (Free Tier)
- **Database**: PostgreSQL on Render
- **Email**: SendGrid or Django Email Backend
- **Storage**: AWS S3 or Local Storage

---

## Prerequisites

### Required Accounts
- [ ] GitHub account with project repository
- [ ] Vercel account (connect with GitHub)
- [ ] Render account (connect with GitHub)
- [ ] PostgreSQL database (Render provides free tier)
- [ ] Google OAuth credentials (for authentication)

### Tools Required
- [ ] Git installed
- [ ] Node.js v18+ (for local testing)
- [ ] Python 3.9+ (for local testing)
- [ ] PostgreSQL client (optional, for database testing)

### Repository Status
- [ ] Code pushed to GitHub
- [ ] `.env` files added to `.gitignore`
- [ ] All secrets removed from version control
- [ ] Branches: `main` (production), `develop` (staging)

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend for Production

#### 1.1 Update Configuration Files

**File**: `NoteAssist_AI_frontend/vite.config.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor': ['react', 'react-dom', 'react-router-dom', 'redux', 'react-redux'],
          'lucide': ['lucide-react'],
          'ui': ['react-hot-toast'],
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      }
    }
  }
})
```

#### 1.2 Create Environment Variables File

**File**: `NoteAssist_AI_frontend/.env.production`
```env
# API Configuration
VITE_API_BASE_URL=https://noteassist-backend.onrender.com

# Google OAuth
VITE_GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Feature Flags
VITE_GOOGLE_DRIVE_ENABLED=true
VITE_AI_TOOLS_ENABLED=true
VITE_DAILY_REPORTS_ENABLED=true

# Analytics (Optional)
VITE_ANALYTICS_ID=

# Environment
VITE_ENVIRONMENT=production
```

#### 1.3 Verify Build Configuration

```bash
cd NoteAssist_AI_frontend
npm run build
# Should create dist/ folder without errors
```

### Step 1.5: Frontend Optimization for Production

#### Code Splitting Best Practices

For better performance, you can optionally implement lazy loading for less frequently accessed pages:

**File**: `NoteAssist_AI_frontend/src/App.jsx` (Optional Enhancement)
```javascript
import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// Lazy load admin and secondary pages
const AdminDashboard = lazy(() => import('./pages/Admin_Dashboard'))
const AdminAIAnalyticsPage = lazy(() => import('./pages/AdminAIAnalyticsPage'))
const AIHistoryPage = lazy(() => import('./pages/AIHistoryPage'))

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
)

// Main pages can be imported normally for faster initial load
// Wrap only secondary pages with Suspense for code splitting
<Suspense fallback={<PageLoader />}>
  <Route path="/admin" element={<AdminDashboard />} />
  <Route path="/admin/analytics" element={<AdminAIAnalyticsPage />} />
  <Route path="/history" element={<AIHistoryPage />} />
</Suspense>
```

**Note**: The current build is already optimized with vendor bundling. Lazy loading can be added incrementally based on performance metrics.

#### Performance Metrics

**Before Optimization**:
- Main JS chunk: 1,822.18 kB (513.75 kB gzip)
- Total bundle size: Large

**After Optimization**:
- Multiple smaller chunks
- Better caching strategy
- Faster initial page load
- Improved Core Web Vitals

### Step 2: Setup Vercel Project

#### 2.1 Connect GitHub to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Select "Import Git Repository"
4. Choose your NoteAssist_AI repository
5. Select GitHub account

#### 2.2 Configure Project Settings

**Project Name**: `noteassist-frontend` (or your preferred name)

**Root Directory**: `NoteAssist_AI_frontend`

**Framework Preset**: Vite

**Build Command**: `npm run build`

**Output Directory**: `dist`

**Install Command**: `npm install`

#### 2.3 Add Environment Variables in Vercel

Go to **Project Settings** → **Environment Variables**

Add the following:

| Variable Name | Value | Environments |
|---|---|---|
| `VITE_API_BASE_URL` | `https://noteassist-backend.onrender.com` | Production |
| `VITE_GOOGLE_OAUTH_CLIENT_ID` | `your-client-id.apps.googleusercontent.com` | Production |
| `VITE_GOOGLE_DRIVE_ENABLED` | `true` | Production |
| `VITE_ANALYTICS_ID` | `your-analytics-id` | Production |

#### 2.4 Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Note your Vercel URL: `https://noteassist-frontend.vercel.app`

### Step 3: Post-Frontend Deployment

#### 3.1 Update Google OAuth Credentials

1. Go to Google Cloud Console
2. Update Authorized origins:
   ```
   https://noteassist-frontend.vercel.app
   ```

#### 3.2 Verify Deployment

```bash
# Test API connectivity
curl https://noteassist-frontend.vercel.app/
# Should return HTML
```

---

## Backend Deployment (Render)

### Step 1: Prepare Backend for Production

#### 1.1 Update Django Settings

**File**: `NoteAssist_AI_Backend/NoteAssist_AI/settings.py`

```python
# ============================================================================
# Production Settings
# ============================================================================

import os
from pathlib import Path
from datetime import timedelta

# Environment Detection
DEBUG = os.getenv('DEBUG', 'False') == 'True'
ENVIRONMENT = os.getenv('ENVIRONMENT', 'production')

# Allowed Hosts
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# CORS Settings for Vercel Frontend
CORS_ALLOWED_ORIGINS = [
    'https://noteassist-frontend.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
]

# Database Configuration (PostgreSQL on Render)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'noteassist_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'ATOMIC_REQUESTS': True,
        'CONN_MAX_AGE': 600,
    }
}

# Static Files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media Files (AWS S3 or local)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Security Settings
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_SECURITY_POLICY = {
    "default-src": ("'self'",),
}

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
        },
    },
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': os.getenv('SECRET_KEY'),
}

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@noteassist.ai')

# Celery Configuration (for background tasks)
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'

# Google OAuth Settings
GOOGLE_OAUTH2_CLIENT_ID = os.getenv('GOOGLE_OAUTH2_CLIENT_ID')
GOOGLE_OAUTH2_CLIENT_SECRET = os.getenv('GOOGLE_OAUTH2_CLIENT_SECRET')

# Redis Cache (for sessions and caching)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

#### 1.2 Create Render Configuration

**File**: `NoteAssist_AI_Backend/render.yaml`

```yaml
services:
  - type: web
    name: noteassist-api
    env: python
    plan: free
    pythonVersion: 3.9
    
    buildCommand: |
      pip install -r requirements.txt
      python manage.py collectstatic --noinput
      python manage.py migrate
      
    startCommand: gunicorn NoteAssist_AI.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 60
    
    envVars:
      - key: DEBUG
        value: "False"
      
      - key: ENVIRONMENT
        value: "production"
      
      - key: ALLOWED_HOSTS
        value: "noteassist-backend.onrender.com,localhost"
      
      - key: SECRET_KEY
        generateValue: true
      
      - key: DB_ENGINE
        value: "django.db.backends.postgresql"
      
      - key: DB_NAME
        fromDatabase:
          name: noteassist-db
          property: dbName
      
      - key: DB_USER
        fromDatabase:
          name: noteassist-db
          property: user
      
      - key: DB_PASSWORD
        fromDatabase:
          name: noteassist-db
          property: password
      
      - key: DB_HOST
        fromDatabase:
          name: noteassist-db
          property: host
      
      - key: DB_PORT
        fromDatabase:
          name: noteassist-db
          property: port
      
      - key: GOOGLE_OAUTH2_CLIENT_ID
        sync: false
      
      - key: GOOGLE_OAUTH2_CLIENT_SECRET
        sync: false
      
      - key: EMAIL_HOST_USER
        sync: false
      
      - key: EMAIL_HOST_PASSWORD
        sync: false
      
      - key: SENDGRID_API_KEY
        sync: false

databases:
  - name: noteassist-db
    plan: free
    postgreSQL: true
```

#### 1.3 Update Requirements

**File**: `NoteAssist_AI_Backend/requirements.txt`

```
Django==4.2.8
djangorestframework==3.14.0
django-cors-headers==4.3.1
djangorestframework-simplejwt==5.3.2
python-decouple==3.8
gunicorn==21.2.0
whitenoise==6.6.0
psycopg2-binary==2.9.9
django-redis==5.4.0
redis==5.0.1
celery==5.3.4
google-auth-oauthlib==1.2.0
google-auth==2.26.1
google-api-python-client==2.107.0
Pillow==10.1.0
requests==2.31.0
sendgrid==6.11.0
django-filter==23.5
```

#### 1.4 Create Procfile (Alternative to render.yaml)

**File**: `NoteAssist_AI_Backend/Procfile`

```
release: python manage.py migrate
web: gunicorn NoteAssist_AI.wsgi:application --bind 0.0.0.0:$PORT --workers 2
```

### Step 2: Setup Render Project

#### 2.1 Connect GitHub to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +"
3. Select "Web Service"
4. Connect your GitHub account
5. Select NoteAssist_AI repository

#### 2.2 Configure Web Service

**Name**: `noteassist-api`

**Environment**: `Python 3`

**Region**: Choose closest to your users

**Branch**: `main`

**Root Directory**: `NoteAssist_AI_Backend`

**Build Command**: 
```bash
pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
```

**Start Command**: 
```bash
gunicorn NoteAssist_AI.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 60
```

**Plan**: Free

#### 2.3 Setup PostgreSQL Database

1. In Render Dashboard, click "New +"
2. Select "PostgreSQL"
3. Name: `noteassist-db`
4. Region: Same as web service
5. Plan: Free
6. Click "Create Database"

#### 2.4 Add Environment Variables

Go to **Web Service** → **Settings** → **Environment**

Add all variables from [Environment Variables](#environment-variables) section below

---

## Environment Variables

### Frontend (Vercel)

#### Production Environment Variables

```env
# API Configuration
VITE_API_BASE_URL=https://noteassist-backend.onrender.com

# Google OAuth
VITE_GOOGLE_OAUTH_CLIENT_ID=your-client-id-here.apps.googleusercontent.com

# Feature Flags
VITE_GOOGLE_DRIVE_ENABLED=true
VITE_AI_TOOLS_ENABLED=true
VITE_DAILY_REPORTS_ENABLED=true

# Environment Type
VITE_ENVIRONMENT=production

# Analytics (Optional)
VITE_ANALYTICS_ID=your-analytics-id
```

#### How to Add in Vercel

1. Go to Project Settings
2. Click "Environment Variables"
3. Add each variable:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://noteassist-backend.onrender.com`
   - Environments: Select "Production"
4. Click "Save"
5. Redeploy project

---

### Backend (Render)

#### Production Environment Variables

```env
# ============================================================================
# Django Configuration
# ============================================================================
DEBUG=False
ENVIRONMENT=production
SECRET_KEY=your-secret-key-here-django-generates

# ============================================================================
# Database (Auto-filled by Render)
# ============================================================================
DB_ENGINE=django.db.backends.postgresql
DB_NAME=noteassist_db
DB_USER=noteassist_user
DB_PASSWORD=your-secure-password
DB_HOST=dpg-xxx.render.com
DB_PORT=5432

# ============================================================================
# Allowed Hosts & CORS
# ============================================================================
ALLOWED_HOSTS=noteassist-backend.onrender.com,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://noteassist-frontend.vercel.app,http://localhost:5173,http://localhost:3000

# ============================================================================
# Google OAuth
# ============================================================================
GOOGLE_OAUTH2_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH2_CLIENT_SECRET=your-client-secret-here

# ============================================================================
# Email Configuration
# ============================================================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@noteassist.ai

# ============================================================================
# Redis/Cache (Optional - for Render Paid Tier)
# ============================================================================
REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=redis://localhost:6379
CELERY_RESULT_BACKEND=redis://localhost:6379

# ============================================================================
# SendGrid (Alternative to Gmail)
# ============================================================================
SENDGRID_API_KEY=your-sendgrid-api-key

# ============================================================================
# AWS S3 (Optional - for media files)
# ============================================================================
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=noteassist-media
AWS_S3_REGION_NAME=us-east-1

# ============================================================================
# Application Settings
# ============================================================================
SITE_NAME=NoteAssist AI
SITE_URL=https://noteassist-backend.onrender.com
```

#### How to Add in Render

1. Go to Web Service Settings
2. Click "Environment"
3. Add variables one by one or paste as group:
   ```
   DEBUG=False
   ENVIRONMENT=production
   SECRET_KEY=generated-by-django
   ...
   ```
4. For database variables, Render auto-fills from PostgreSQL service
5. Click "Save"
6. Service auto-redeploys with new variables

---

## Database Setup

### Step 1: PostgreSQL on Render (Automatic)

Render automatically handles PostgreSQL setup. You just need to:

1. Create PostgreSQL instance (as shown above)
2. Note the connection details
3. Django migrations run automatically on deploy

### Step 2: Initialize Database

After first deploy, run initial migrations:

```bash
# Via Render Shell (in dashboard)
# Or via remote connection

python manage.py migrate
python manage.py createsuperuser

# Create admin user for Django admin
# Email: admin@noteassist.ai
# Password: (generate secure password)
```

### Step 3: Backup Strategy

**Render Backups**:
- Automatic daily backups (Paid tier)
- Manual export available

**Manual Backup**:
```bash
# Download backup
pg_dump -h host -U user -d dbname > backup.sql

# Restore backup
psql -h host -U user -d dbname < backup.sql
```

---

## Domain Configuration

### Option 1: Free Render Domain

**Render Provides**:
```
Backend: noteassist-backend.onrender.com
Frontend: noteassist-frontend.vercel.app (Vercel default)
```

### Option 2: Custom Domain (Optional)

#### For Render Backend

1. Go to Web Service Settings
2. Click "Add Custom Domain"
3. Enter: `api.yourdomain.com`
4. Add DNS records to your domain:
   ```
   Name: api
   Type: CNAME
   Value: noteassist-backend.onrender.com
   ```

#### For Vercel Frontend

1. Go to Project Settings → Domains
2. Click "Add"
3. Enter: `yourdomain.com` or `www.yourdomain.com`
4. Follow Vercel's DNS instructions

### Step 3: Update Credentials

After setting up custom domain:

1. **Update Django Settings**:
   ```python
   ALLOWED_HOSTS = ['api.yourdomain.com', 'localhost']
   ```

2. **Update Vercel Environment**:
   ```
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```

3. **Update Google OAuth**:
   - Add `https://yourdomain.com` to authorized origins
   - Add `https://api.yourdomain.com/api/auth/google_callback/` to redirect URIs

---

## Post-Deployment Testing

### Step 1: Frontend Testing

```bash
# Test frontend loads
curl https://noteassist-frontend.vercel.app/

# Check for errors in browser console
# Navigate to https://noteassist-frontend.vercel.app/login
```

### Step 2: API Testing

```bash
# Test API health
curl https://noteassist-backend.onrender.com/api/health/

# Test authentication endpoint
curl -X POST https://noteassist-backend.onrender.com/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test Google OAuth
curl -X GET https://noteassist-backend.onrender.com/api/auth/google_auth/

# Test notes endpoint
curl https://noteassist-backend.onrender.com/api/notes/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 3: Database Testing

```bash
# Check database connection
# Via Render dashboard > PostgreSQL > Connection Info
# Use psql or any PostgreSQL client to verify

# Run migrations check
python manage.py migrate --plan
```

### Step 4: Integration Testing

**User Journey Testing**:

1. [ ] Visit frontend homepage
2. [ ] Google Sign-In works
3. [ ] Redirect to dashboard
4. [ ] View user data
5. [ ] Create new note
6. [ ] Create chapters and topics
7. [ ] Use AI Tools (Generate Topic)
8. [ ] Export to PDF
9. [ ] Connect Google Drive
10. [ ] Upload to Google Drive

---

## Monitoring & Maintenance

### Vercel Monitoring

**Built-in Analytics**:
- Go to Dashboard → Analytics
- Monitor: Page views, performance, errors

**Performance Insights**:
- Core Web Vitals
- Build performance
- Deployment history

### Render Monitoring

**Logs**:
```
Dashboard → Services → noteassist-api → Logs
```

Monitor for:
- Database errors
- API errors
- Performance issues

**Metrics**:
- CPU usage
- Memory usage
- Request/response times
- Error rates

### Health Checks

```bash
# Automated health check endpoint
curl https://noteassist-backend.onrender.com/api/health/

# Should return 200 OK
```

### Maintenance Tasks

#### Weekly
- [ ] Review error logs
- [ ] Check database performance
- [ ] Monitor free tier quotas

#### Monthly
- [ ] Update dependencies
- [ ] Security patches
- [ ] Backup database

#### Quarterly
- [ ] Performance review
- [ ] Cache optimization
- [ ] Cost analysis (consider paid tier)

---

## Troubleshooting

### Problem 1: Build Fails on Render

**Symptoms**: Red "Build Failed" status

**Solutions**:

1. Check build logs:
   ```
   Dashboard → Services → noteassist-api → Logs
   ```

2. Verify requirements.txt:
   ```bash
   pip check  # Locally
   ```

3. Check Django settings:
   ```bash
   python manage.py check --deploy
   ```

4. Rebuild:
   ```
   Dashboard → Web Service → Manual Deploy
   ```

### Problem 2: Database Connection Error

**Symptoms**: `FATAL: remaining connection slots are reserved`

**Solutions**:

1. Render free tier has limited connections
2. Implement connection pooling:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'CONN_MAX_AGE': 600,
           'OPTIONS': {
               'connect_timeout': 10,
           }
       }
   }
   ```

3. Upgrade to paid tier for more connections

### Problem 3: Timeout Errors

**Symptoms**: 504 Gateway Timeout

**Solutions**:

1. Increase timeout in Render settings:
   ```
   Dashboard → Web Service Settings → Health Check
   ```

2. Optimize slow queries:
   ```python
   # Add database query optimization
   from django.db import connection
   from django.test.utils import CaptureQueriesContext
   ```

3. Add caching:
   ```python
   from django.views.decorators.cache import cache_page
   ```

### Problem 4: CORS Errors

**Symptoms**: "No 'Access-Control-Allow-Origin' header"

**Solutions**:

1. Update CORS_ALLOWED_ORIGINS:
   ```python
   CORS_ALLOWED_ORIGINS = [
       'https://noteassist-frontend.vercel.app',
       'http://localhost:5173',
   ]
   ```

2. Restart backend service

3. Clear browser cache and try again

### Problem 5: Static Files Not Loading

**Symptoms**: 404 errors for CSS, JS

**Solutions**:

1. Collect static files:
   ```bash
   python manage.py collectstatic --noinput
   ```

2. Use WhiteNoise middleware:
   ```python
   MIDDLEWARE = [
       'whitenoise.middleware.WhiteNoiseMiddleware',
       ...
   ]
   ```

3. Verify STATIC_ROOT and STATIC_URL:
   ```python
   STATIC_URL = '/static/'
   STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
   ```

### Problem 6: Email Not Sending

**Symptoms**: No emails received

**Solutions**:

1. Verify email credentials:
   ```python
   EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
   EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
   ```

2. For Gmail, use app password (not regular password)

3. Test email sending:
   ```python
   from django.core.mail import send_mail
   send_mail(
       'Test Email',
       'This is a test',
       'noreply@noteassist.ai',
       ['your-email@example.com'],
   )
   ```

4. Check email logs in backend

### Problem 7: Frontend Build Error - Vite Terser Not Found

**Symptoms**: Build fails with `[vite:terser] terser not found`

**Solutions**:

1. Install terser as dev dependency:
   ```bash
   cd NoteAssist_AI_frontend
   npm install --save-dev terser
   ```

2. Rebuild:
   ```bash
   npm run build
   ```

### Problem 8: Build References Non-Existent Files

**Symptoms**: Build fails with `Could not resolve entry module "./src/components/notes/NoteEditor.jsx"`

**Solutions**:

1. Check vite.config.js for correct file paths:
   ```bash
   # Don't reference files that don't exist
   # Only include actual component files in manualChunks
   ```

2. Verify actual files exist before adding to bundle config:
   ```bash
   ls src/components/notes/
   # Should list: NoteStructure.jsx, TopicEditor.jsx, etc.
   ```

3. Update vite.config.js to only reference existing files:
   ```javascript
   rollupOptions: {
     output: {
       manualChunks: {
         'vendor': ['react', 'react-dom', 'react-router-dom'],
         'lucide': ['lucide-react'],
         'ui': ['react-hot-toast'],
       }
     }
   }
   ```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code pushed to GitHub main branch
- [ ] All tests passing locally
- [ ] Environment variables documented
- [ ] `.env` files in `.gitignore`
- [ ] Secrets not committed
- [ ] Database migrations written
- [ ] Static files optimized
- [ ] Frontend build tested locally

### Vercel Deployment
- [ ] Project connected to GitHub
- [ ] Environment variables added
- [ ] Build passes on Vercel
- [ ] Frontend loads without errors
- [ ] API calls working
- [ ] Google OAuth flow tested

### Render Deployment
- [ ] Web service created
- [ ] PostgreSQL database created
- [ ] All environment variables set
- [ ] Database migrations running
- [ ] Build succeeds
- [ ] API endpoints responding
- [ ] Logs monitored
- [ ] Health checks passing

### Post-Deployment
- [ ] Frontend-to-backend connectivity verified
- [ ] User authentication flow working
- [ ] Database queries working
- [ ] File uploads functioning
- [ ] Email sending (if applicable)
- [ ] Google OAuth working
- [ ] PDF export working
- [ ] Google Drive integration working
- [ ] Performance acceptable
- [ ] Error monitoring enabled
- [ ] Backups configured

---

## Quick Links

### Vercel
- Dashboard: https://vercel.com/dashboard
- Documentation: https://vercel.com/docs
- Support: https://vercel.com/support

### Render
- Dashboard: https://dashboard.render.com
- Documentation: https://render.com/docs
- Support: https://render.com/support

### Free Tier Limitations

#### Vercel Free
- Unlimited deployments
- Serverless functions (300GB/month)
- Built-in analytics
- SSL certificate included

#### Render Free
- Auto-pauses after 15 minutes of inactivity
- 0.5 GB RAM
- Shared CPU
- PostgreSQL: 1 GB storage
- No automatic backups

---

## Cost Optimization

### Free Tier
- Total cost: **$0/month**
- Limitations: Auto-pause, limited resources

### Hobby Tier (~$20/month)
- Vercel: $0 (generous free tier)
- Render Web: $7/month (paid plan)
- Render PostgreSQL: $15/month

### Production Tier (Scale as needed)
- Vercel: Pay as you use
- Render: Standard plans ($25+/month)
- PostgreSQL: $15+/month

---

## Next Steps

1. **Setup Render Account**
   - Create account at https://render.com
   - Connect GitHub
   - Create PostgreSQL database

2. **Setup Vercel Account**
   - Create account at https://vercel.com
   - Connect GitHub
   - Add environment variables

3. **Deploy Backend**
   - Push code to GitHub
   - Render auto-deploys from main branch

4. **Deploy Frontend**
   - Update backend URL in environment
   - Vercel auto-deploys from main branch

5. **Test Thoroughly**
   - User flow testing
   - API integration testing
   - Database testing

6. **Monitor & Iterate**
   - Watch logs and metrics
   - Fix issues as they arise
   - Optimize performance

---

**Last Updated**: February 6, 2026  
**Status**: Production Ready
