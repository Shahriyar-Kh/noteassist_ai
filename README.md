# NoteAssist AI 🎓

**An AI-Powered Study Notes Platform** for creating, organizing, and managing intelligent learning notes with real-time AI assistance.

---

## 🌟 Features

- **Smart Note Management**: Create, organize, and structure notes with chapters and topics
- **AI-Powered Content Generation**: Generate explanations, improve text, and summarize topics using Groq AI
- **Google Drive Integration**: Seamlessly upload and manage notes in Google Drive
- **Code Generation**: Generate and execute code snippets with AI assistance
- **PDF Export**: Convert notes to professional PDFs
- **Interactive Dashboard**: Track your learning progress with detailed analytics
- **Real-time Collaboration**: Share notes and collaborate with others
- **Advanced Search**: Find notes and topics quickly with filters
- **Activity Timeline**: Monitor your learning journey

---

## 🏗️ Project Structure

```
NoteAssist_AI/
├── NoteAssist_AI_Backend/          # Django REST API backend
│   ├── accounts/                   # User authentication & profiles
│   ├── notes/                      # Core notes module
│   ├── ai_tools/                   # AI integration services
│   ├── dashboard/                  # User dashboard & analytics
│   ├── admin_analytics/            # Admin analytics module
│   ├── profiles/                   # User profile management
│   ├── utils/                      # Shared utilities
│   └── NoteAssist_AI/              # Django configuration
│
├── NoteAssist_AI_frontend/         # React + Vite frontend
│   ├── src/
│   │   ├── pages/                  # Page components
│   │   ├── components/             # Reusable components
│   │   ├── services/               # API services
│   │   ├── store/                  # Redux state management
│   │   └── utils/                  # Frontend utilities
│   └── public/                     # Static assets
│
└── docs/                           # Documentation
    ├── IMPLEMENTATION_GUIDE.md
    ├── IMPLEMENTATION_GUIDE_PART2.md
    ├── IMPLEMENTATION_GUIDE_PART3.md
    ├── DATABASE_MIGRATIONS.md
    └── REFACTORING_PLAN.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL (optional, uses SQLite by default)
- Redis (optional, for caching)

### Backend Setup

```bash
# Navigate to backend directory
cd NoteAssist_AI_Backend

# Create virtual environment
python -m venv env

# Activate virtual environment
# Windows:
env\Scripts\activate
# macOS/Linux:
source env/bin/activate

# Install dependencies
pip install -r ../requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

Backend runs at: `http://localhost:8000/`

### Frontend Setup

```bash
# Navigate to frontend directory
cd NoteAssist_AI_frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173/`

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=sqlite:///db.sqlite3

# AI & APIs
GROQ_API_KEY=your-groq-api-key
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
SENDGRID_API_KEY=your-sendgrid-key

# Frontend
VITE_API_URL=http://localhost:8000/api
```

---

## 📚 API Endpoints

### Authentication
- `POST /api/token/` - Obtain JWT token
- `POST /api/token/refresh/` - Refresh JWT token

### User Management
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login user
- `POST /api/auth/logout/` - Logout user
- `GET /api/profile/` - Get user profile
- `PUT /api/profile/` - Update profile

### Notes
- `GET /api/notes/` - List all notes
- `POST /api/notes/` - Create new note
- `GET /api/notes/{id}/` - Get note details
- `PUT /api/notes/{id}/` - Update note
- `DELETE /api/notes/{id}/` - Delete note
- `POST /api/chapters/` - Create chapter
- `POST /api/topics/` - Create topic

### AI Tools
- `POST /api/ai-tools/generate/` - Generate explanation
- `POST /api/ai-tools/improve/` - Improve text
- `POST /api/ai-tools/summarize/` - Summarize content
- `POST /api/ai-tools/code/` - Generate code
- `GET /api/ai-tools/quota/` - Check AI quota
- `GET /api/ai-tools/usage-history/` - Get usage history

### Dashboard
- `GET /api/dashboard/overview/` - Dashboard overview
- `GET /api/dashboard/quick-stats/` - Quick statistics
- `GET /api/dashboard/weekly-chart/` - Weekly activity
- `GET /api/dashboard/ai-breakdown/` - AI usage breakdown
- `GET /api/dashboard/recent-activity/` - Recent activity timeline

### Admin Analytics
- `GET /api/admin/analytics/overview/` - System overview
- `GET /api/admin/analytics/users/` - User analytics
- `GET /api/admin/analytics/ai-analytics/` - AI usage analytics

---

## 🛠️ Technology Stack

### Backend
- **Framework**: Django 5.1.3
- **API**: Django REST Framework
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Database**: SQLite (development) / PostgreSQL (production)
- **Caching**: Redis
- **Task Queue**: Celery
- **AI**: Groq API
- **File Storage**: Google Drive Integration

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Redux
- **HTTP Client**: Axios
- **Routing**: React Router v6

---

## 🔄 Git Workflow

```bash
# Clone repository
git clone https://github.com/Shahriyar-Kh/NoteAssist_AI.git
cd NoteAssist_AI

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: description of your changes"

# Push to remote
git push origin feature/your-feature-name

# Create Pull Request
```

---

## 📖 Documentation

- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Phase 1 implementation details
- **[IMPLEMENTATION_GUIDE_PART2.md](./IMPLEMENTATION_GUIDE_PART2.md)** - Dashboard & Admin Analytics
- **[IMPLEMENTATION_GUIDE_PART3.md](./IMPLEMENTATION_GUIDE_PART3.md)** - Advanced features & integration
- **[DATABASE_MIGRATIONS.md](./DATABASE_MIGRATIONS.md)** - Database schema and migrations
- **[REFACTORING_PLAN.md](./REFACTORING_PLAN.md)** - Technical architecture and refactoring notes

---

## 🧪 Testing

### Run Backend Tests
```bash
cd NoteAssist_AI_Backend
pytest
```

### Run Frontend Tests
```bash
cd NoteAssist_AI_frontend
npm run test
```

---

## 📊 Database Schema

The project uses Django's ORM with the following main models:

- **User** - Custom user model with email authentication
- **Note** - Main note entity with status tracking
- **Chapter** - Logical divisions within notes
- **ChapterTopic** - Individual topics within chapters
- **AIToolUsage** - Tracks AI feature usage
- **AIToolOutput** - Stores AI-generated content
- **DashboardCache** - Cached user dashboard statistics
- **ActivityLog** - User activity timeline

---

## 🚀 Deployment

### Backend (Render)
1. Push code to GitHub
2. Connect Render to GitHub repository
3. Set environment variables
4. Deploy with `python manage.py migrate && gunicorn NoteAssist_AI.wsgi`

### Frontend (Vercel)
1. Connect Vercel to GitHub repository
2. Set environment variables
3. Auto-deploy on push

---

## 🐛 Issues & Support

Found a bug or have a feature request? 
- Open an issue on [GitHub Issues](https://github.com/Shahriyar-Kh/NoteAssist_AI/issues)
- Contact: support@noteassist-ai.com

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Developer

**Shahriyar Kh**
- GitHub: [@Shahriyar-Kh](https://github.com/Shahriyar-Kh)
- Email: shahriyar.kh@example.com

---

## 🙏 Acknowledgments

- Groq API for AI integration
- Google Drive API for file management
- Django and React communities

---

**Happy Learning! 🎉**
