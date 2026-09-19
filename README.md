<div align="center">

# NoteAssist AI

### AI-Assisted Notes, Learning Productivity & Administration Platform

**Django 5.2 · Django REST Framework · React 18 · PostgreSQL · Redis · Celery · Groq · Google OAuth/Drive**

A deployed full-stack learning-productivity application for structured notes, AI-assisted study workflows, user plans and quotas, Google integrations, exports, dashboards, and administration.

<p>
  <img alt="Python" src="https://img.shields.io/badge/Python-Backend-3776AB?logo=python&logoColor=white">
  <img alt="Django" src="https://img.shields.io/badge/Django-5.2-092E20?logo=django&logoColor=white">
  <img alt="DRF" src="https://img.shields.io/badge/Django%20REST%20Framework-3.16-A30000">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111111">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white">
  <img alt="Redis" src="https://img.shields.io/badge/Redis-Cache%20%2F%20Broker-DC382D?logo=redis&logoColor=white">
  <img alt="Celery" src="https://img.shields.io/badge/Celery-Async-37814A">
</p>

</div>

---

## Overview

**NoteAssist AI** is a full-stack study and note-management product built around a Django REST API and a React/Vite frontend.

The repository contains implemented workflows for:

- structured notes
- AI-assisted content generation
- summarization and improvement
- user authentication
- Google OAuth
- Google Drive integration
- usage quotas
- AI output history
- PDF/export workflows
- admin analytics
- user administration
- caching and asynchronous processing
- deployment on Vercel / Render / Supabase

Live frontend:

**https://noteassistai.vercel.app/**

---

## Architecture

~~~mermaid
flowchart LR
    U[User] --> WEB[React 18 + Vite]
    WEB -->|REST / JWT| API[Django 5.2 + DRF]

    API --> AUTH[Accounts / JWT / Google OAuth]
    API --> NOTES[Notes & Chapters]
    API --> AI[AI Tools]
    API --> DASH[User / Admin Dashboards]
    API --> ADMIN[User Management]
    API --> DRIVE[Google Drive Integration]

    AUTH --> DB[(PostgreSQL)]
    NOTES --> DB
    AI --> DB
    DASH --> DB
    ADMIN --> DB

    API --> REDIS[(Redis)]
    REDIS --> CELERY[Celery Workers]
    AI --> GROQ[Groq Provider]
    DRIVE --> GOOGLE[Google APIs]
~~~

The architecture separates the React client, REST API, persistence, caching/queue infrastructure, and third-party providers.

---

## Notes & Learning Workflows

The note domain supports hierarchical learning content rather than only flat text records.

Implemented structures include:

- notes
- chapters
- chapter topics
- AI-generated outputs
- saved learning content
- exports
- published/private note behavior

An integration test in the repository verifies the workflow:

~~~text
AI output
   ↓
Save to note
   ↓
Create chapter/topic content
   ↓
Retrieve stored result
~~~

This gives the project direct evidence of application-level workflows across AI output and persisted learning content.

---

## AI Tooling

The AI domain includes application models, serializers, views, background tasks and quota tracking.

Implemented product areas include:

- topic/content generation
- summarization
- content improvement
- code-oriented AI output
- generated-output history
- saving AI output into notes
- output downloads
- per-user usage tracking
- quota enforcement

AI configuration is environment-driven.

The repository currently includes the **Groq SDK** and server-side provider configuration. This README does not claim model quality or learning-outcome improvements that have not been independently measured.

---

## Authentication & Google Integration

Authentication/security capabilities include:

- JWT authentication
- refresh-token workflows
- Google OAuth configuration
- email verification-related flows
- password-reset-related models/workflows
- role/admin permission boundaries

Google integration includes:

- OAuth login / identity flow
- Google Drive authorization
- token refresh/handling
- uploading generated output to Google Drive

Google credentials are configured through environment variables rather than committed runtime secrets.

---

## User Plans, Quotas & Feature Controls

The product includes explicit user-plan and AI-usage controls.

Administration can work with data such as:

- plan type
- blocked/active state
- feature access
- note counts
- AI usage counts
- daily / weekly / monthly limits
- recent activity

This gives the product an operational layer beyond a simple notes CRUD application.

---

## Administration System

The backend contains a dedicated admin user-management API and the frontend contains matching administration screens.

Implemented administration areas include:

- admin dashboard
- user listing
- search/filtering
- user detail
- plan management
- block/unblock actions
- feature-access controls
- quota/limit updates
- user insights
- AI usage breakdown
- admin action logs

The frontend includes dedicated admin routes/layouts rather than relying only on Django's built-in admin interface.

---

## Dashboard & Analytics

The project contains user-facing and administration-facing dashboard modules.

Backend dashboard logic includes:

- dashboard models/services
- asynchronous dashboard tasks
- aggregated usage data
- user activity information

The frontend includes charting and dashboard experiences using React/Recharts.

---

## Performance-Oriented Engineering

The repository contains explicit query and load-test artifacts, including:

- \`select_related\` / \`prefetch_related\` oriented query optimization
- query-count regression tests
- Redis caching
- Celery task processing
- request-deduplication utilities on the frontend
- connection/runtime configuration
- a Locust workload definition

Examples of verified regression tests include upper bounds on query counts for:

- note listing
- note details
- AI-output listing

A Locust scenario exists for load testing common authenticated workflows.

> The presence of a load-test scenario is not the same as a verified production capacity benchmark. This README therefore does **not** repeat historical claims such as “10,000+ concurrent users” or fixed latency percentages without a current benchmark report.

---

## Testing

The backend contains:

- Django/DRF tests
- app-specific test modules
- integration tests
- query/performance regression tests
- load-test definitions

Examples include:

- complete AI-output → note workflow
- AI output download behavior
- note query-count checks
- AI-output query-count checks

Run backend tests with:

~~~bash
cd NoteAssist_AI_Backend
pytest
~~~

The frontend currently provides build/lint tooling through Vite/ESLint.

This README does not claim an overall coverage percentage because a current repository-wide coverage report was not verified during this documentation pass.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | Python, Django 5.2, Django REST Framework |
| Frontend | React 18, Vite 5, Tailwind CSS |
| Client state | Redux Toolkit |
| Database | PostgreSQL / Supabase |
| Cache | Redis |
| Async jobs | Celery |
| Auth | JWT, Google OAuth |
| AI | Groq integration |
| Google | OAuth + Drive API |
| Documents | ReportLab, html2pdf-related frontend tooling |
| Hosting | Render + Vercel |
| Testing | pytest / pytest-django, Django TestCase, Locust workload |

---

## Repository Structure

~~~text
noteassist_ai/
├── NoteAssist_AI_Backend/
│   ├── accounts/
│   ├── profiles/
│   ├── notes/
│   ├── ai_tools/
│   ├── dashboard/
│   ├── admin_analytics/
│   ├── tests/
│   │   ├── integration/
│   │   ├── performance/
│   │   └── load/
│   └── NoteAssist_AI/
│
├── NoteAssist_AI_frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
│
├── NoteAssiss-AI_Architecture.png
├── PRODUCTION_ARCHITECTURE.md
├── GOOGLE_INTEGRATION_GUIDE.md
├── DEPLOYMENT_PRODUCTION_GUIDE.md
└── pytest.ini
~~~

---

## Local Development

### Backend

~~~bash
cd NoteAssist_AI_Backend
python -m venv .venv
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
~~~

### Frontend

~~~bash
cd NoteAssist_AI_frontend
npm install
npm run dev
~~~

Redis and Celery are needed for the background/cache paths that use them.

---

## Deployment

Repository configuration/documentation targets:

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** Supabase PostgreSQL
- **Cache / async:** Redis + Celery

Live frontend:

**https://noteassistai.vercel.app/**

The repository also documents a Render API endpoint. Availability of individual services should be checked independently rather than inferred from old deployment notes.

---

## Security Notes

The repository uses environment-driven configuration for sensitive values such as:

- Django secret
- database URL
- Google OAuth credentials
- Groq API key
- email/provider credentials

The root \`.gitignore\` excludes common secrets, environment files, virtual environments, databases, logs and generated runtime artifacts.

Historical setup/deployment documents may contain configuration examples and client IDs. Those should be treated as operational documentation, not secret-management storage.

---

## Engineering Evidence for Reviewers

Useful entry points:

- \`NoteAssist_AI_Backend/ai_tools/\` — AI workflows and quota/output models
- \`NoteAssist_AI_Backend/notes/\` — note domain and Google Drive integration
- \`NoteAssist_AI_Backend/accounts/admin_views.py\` — administration workflows
- \`NoteAssist_AI_Backend/dashboard/\` — dashboard services/tasks
- \`NoteAssist_AI_Backend/tests/integration/test_note_workflow.py\` — cross-domain workflow
- \`NoteAssist_AI_Backend/tests/performance/test_query_optimization.py\` — query regression checks
- \`NoteAssist_AI_Backend/tests/load/locustfile.py\` — load-test scenario
- \`NoteAssist_AI_frontend/src/pages/AdminUserManagementPage.jsx\` — admin product UI
- \`NoteAssist_AI_frontend/src/pages/AdminAIAnalyticsPage.jsx\` — AI analytics UI
- \`GOOGLE_INTEGRATION_GUIDE.md\` — Google OAuth / Drive integration
- \`PRODUCTION_ARCHITECTURE.md\` — deployment architecture

---

## Repository Positioning

This repository is the **canonical full source** for NoteAssist AI.

A separate public repository named \`noteassisst-ai_p\` contains a lightweight/public snapshot with a zipped frontend artifact. It should not be treated as the canonical engineering source for this project.

For recruiter review, this repository provides much stronger evidence because the backend, frontend, tests, integrations and administration system are directly inspectable.

---

## Author

**Shahriyar Khan**  
Software Engineer · Full-Stack Python Developer

**Core focus:** Python · Django · Django REST Framework · React · PostgreSQL · Redis · Celery · AI Integration

- GitHub: [@Shahriyar-Kh](https://github.com/Shahriyar-Kh)
- Portfolio: [shahriyarkhan.com](https://shahriyarkhan.com)
- LinkedIn: [Shahriyar Khan](https://www.linkedin.com/in/shahriyar-kh/)
- Live app: [noteassistai.vercel.app](https://noteassistai.vercel.app/)

---

<div align="center">

**Django REST APIs · structured notes · AI workflows · Google integrations · administration · async processing**

</div>
