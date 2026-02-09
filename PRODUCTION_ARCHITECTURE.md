# NoteAssist AI - Production Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       INTERNET USERS                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
  ┌───────────────┐          ┌──────────────────┐
  │   Vercel      │          │   Google OAuth   │
  │  (Frontend)   │          │   (Auth Server)  │
  │  STATIC SITE  │          └──────────────────┘
  │               │                  │
  │ React + Vite  │                  │
  │ Tailwind CSS  │                  │
  └───────┬───────┘                  │
          │                          │
          │ API Calls                │ Login Flow
          │                          │
          └──────────────┬───────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  Render (Backend)            │
          │  Django REST API             │
          │  - Authentication            │
          │  - Notes Management          │
          │  - AI Tools                  │
          │  - Dashboard                 │
          │  - Google Drive Sync         │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │   Supabase (Database)        │
          │   PostgreSQL                 │
          │   - Users                    │
          │   - Notes & Topics           │
          │   - AI Requests              │
          │   - Analytics                │
          └──────────────────────────────┘
```

---

## 📍 Service Locations

### Frontend (Vercel)
```
URL: https://noteassesstai.vercel.app
Tech: React 18 + Vite + Tailwind CSS
Hosting: Vercel (Edge Network)
Deploy: Auto from GitHub main branch
Region: Global (Vercel Edge)
Status: ✅ LIVE
```

### Backend (Render)
```
URL: https://noteassist-backend.onrender.com
Tech: Django 4.2.8 + DRF
Hosting: Render (Cloud Servers)
Deploy: Auto from GitHub main branch
Region: US-EAST-1
Status: ⏳ READY TO DEPLOY
```

### Database (Supabase)
```
Type: PostgreSQL 15
Provider: Supabase
Region: us-west-2
Storage: 1GB free tier
Status: ✅ CONNECTED
```

### Authentication (Google)
```
Provider: Google Cloud
Service: OAuth 2.0
Scopes: Email, Profile, Drive
Status: ✅ CONFIGURED
```

---

## 🔄 Data Flow

### User Login Flow
```
1. User clicks "Sign in with Google"
   └─→ Frontend sends Google sign-in request

2. Google authenticates user
   └─→ Returns authorization code + token

3. Backend verifies token
   └─→ Creates/updates user in Supabase
   └─→ Returns JWT tokens

4. Frontend stores JWT in localStorage
   └─→ Uses token for all API requests

5. User logged in
   └─→ Can create notes, AI requests, etc.
```

### Note Creation Flow
```
1. User creates note on frontend
   └─→ POST /api/notes/ with title, content

2. Backend receives request
   └─→ Validates user authentication
   └─→ Creates note in Supabase

3. Note stored in database
   └─→ Returns note ID + metadata

4. Frontend displays new note
   └─→ Updates local state
   └─→ Shows in notes list
```

### AI Tools Flow
```
1. User requests "Generate Topic"
   └─→ POST /api/ai_tools/generate_topic/

2. Backend processes request
   └─→ Calls AI service (GROQ API)
   └─→ Saves request to Supabase
   └─→ Returns generated content

3. Frontend receives response
   └─→ Displays in editor
   └─→ User can edit/save
```

---

## 🛠️ Technology Stack

### Frontend
```
Framework: React 18
Build Tool: Vite
Styling: Tailwind CSS
State Management: Redux
HTTP Client: Axios
Icons: Lucide React
PDF Export: jsPDF
```

### Backend
```
Framework: Django 4.2.8
API: Django REST Framework 3.14.0
Database: PostgreSQL (via Supabase)
Auth: JWT (djangorestframework-simplejwt)
Google OAuth: google-auth-oauthlib
File Upload: Pillow
Email: SMTP (Gmail) + SendGrid
Task Queue: Celery + Redis
Web Server: Gunicorn
```

### Infrastructure
```
Frontend Hosting: Vercel
Backend Hosting: Render
Database: Supabase (PostgreSQL)
Authentication: Google Cloud OAuth
Email: Gmail + SendGrid
```

---

## 🔐 Environment Configuration

### Local (Development)
```
MODE: SQLite3
DEBUG: True
API_URL: http://localhost:8000
Database: db.sqlite3 (file-based)
Use case: Local development & testing
```

### Production (Render + Supabase)
```
MODE: PostgreSQL
DEBUG: False
API_URL: https://noteassist-backend.onrender.com
Database: Supabase PostgreSQL
Use case: Live production system
```

---

## 📊 Deployment Timeline

### Completed ✅
```
Jan 2026 - Initial development & setup
Feb 07 - Frontend deployed to Vercel ✅
Feb 07 - Supabase database created ✅
Feb 07 - Google OAuth configured ✅
Feb 07 - Backend ready for deployment ✅
```

### Today - Final Steps ⏳
```
Feb 07 - Deploy backend to Render
Feb 07 - Update environment variables
Feb 07 - Update Google OAuth URIs
Feb 07 - Test production flow
```

### After Launch 📈
```
Feb 08+ - Monitor production
Feb 08+ - Optimize performance
Feb 09+ - Scale if needed
```

---

## 💰 Cost Analysis

### Free Tier Services ✅
- **Vercel**: Free tier (generous limits)
- **Render**: Free tier ($0/month) - auto-pauses after 15 min inactivity
- **Supabase**: Free tier 1GB PostgreSQL
- **Google OAuth**: Free tier
- **Gmail**: Free tier for email

### Monthly Cost: $0 (Free Tier)

### When to Upgrade
- **Render**: When frequent auto-pauses become issue (~$22/month for paid)
- **Supabase**: When exceeding 1GB storage (varies)
- **Vercel**: Usually not needed (pay-as-you-go)

---

## 🎯 Features by Service

### Frontend (Vercel)
- ✅ User Interface
- ✅ Authentication UI
- ✅ Note Editor
- ✅ Dashboard
- ✅ AI Tools Interface
- ✅ Profile Management
- ✅ Admin Dashboard

### Backend (Render)
- ✅ User Authentication (JWT)
- ✅ Notes CRUD
- ✅ AI Tools Integration
- ✅ Dashboard Statistics
- ✅ Google Drive Sync
- ✅ PDF Export
- ✅ Admin API
- ✅ Email Notifications

### Database (Supabase)
- ✅ User Data
- ✅ Notes & Content
- ✅ AI Requests & History
- ✅ Analytics Data
- ✅ Authentication Logs
- ✅ File Metadata

---

## 🚀 Deployment Readiness

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend | ✅ Live | https://noteassesstai.vercel.app |
| Backend Code | ✅ Ready | All tests passing |
| Database | ✅ Ready | Supabase configured |
| Environment Vars | ⏳ TODO | Add to Render dashboard |
| Google OAuth | ✅ Dev Only | Add production URIs |
| DNS/Domains | ✅ Ready | Default domains working |

---

## 📈 Performance Targets

```
Frontend Load Time: < 2 seconds (Vercel Edge)
API Response Time: < 500ms (Render + Supabase)
Database Query: < 100ms (PostgreSQL + Indexes)
Overall User Experience: Fast & Responsive
```

---

## 🔒 Security Measures

- ✅ HTTPS/SSL everywhere
- ✅ CSRF protection enabled
- ✅ CORS configured
- ✅ Input validation
- ✅ SQL injection prevention (ORM)
- ✅ JWT token expiration
- ✅ Environment variables secured
- ✅ Secret key management

---

**System Status**: Ready for Production ✅  
**Last Updated**: February 7, 2026  
**Next Action**: Deploy Backend to Render
