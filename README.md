# 🎥 Video Safety App

A parental control app for analyzing YouTube videos for child safety before letting kids watch them.

## 🌟 Features

- **AI-Powered Analysis**: Uses Gemini 2.5 Flash to analyze videos for violence, NSFW content, scary themes, and profanity
- **Kid Profiles**: Create profiles for each child with age-appropriate content settings
- **Smart Filtering**: Set content preferences per kid (allowed/blocked themes, score thresholds)
- **Age Recommendations**: Automatic age ratings (3+, 7+, 10+, 13+, 16+, 18+)
- **Fast Processing**: Parallel analysis for long videos (~3-4 minutes for 100-minute videos)
- **No Downloads**: Direct YouTube URL analysis - no video downloads needed

## 🚀 Live Demo

**Frontend:** https://video-safety-app-9a6b5.web.app  
**Backend:** https://video-safety-backend-976885701274.us-central1.run.app

## 📚 Documentation

All documentation is organized in the `/docs` folder:

- **[PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)** - Complete project overview, architecture, and roadmap
- **[GEMINI_CONFIG.md](docs/GEMINI_CONFIG.md)** - Gemini API configuration and technical details
- **[COMPONENT_LIBRARY.md](docs/COMPONENT_LIBRARY.md)** - UI component documentation
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Multi-platform deployment guide
- **[DEPLOYMENT_GCP.md](docs/DEPLOYMENT_GCP.md)** - Google Cloud Platform deployment
- **[PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)** - Pre-launch verification checklist

## 🛠️ Tech Stack

- **Frontend**: React + Vite, Tailwind CSS, Firebase Hosting
- **Backend**: FastAPI, Python 3.11, Google Cloud Run
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: Gemini 2.5 Flash (timestamp-based chunking for long videos)
- **Deployment**: Google Cloud Run + Firebase Hosting

## 🏃 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase account
- Google Gemini API key

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Add your API keys
python start.py
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env  # Add your Supabase credentials
npm run dev
```

Visit http://localhost:5173

## 🎯 Current Status

**Phase:** Production Ready ✅  
**Last Updated:** February 5, 2026

### Recent Updates
- ✅ Replaced yt-dlp with direct Gemini YouTube URL analysis
- ✅ Parallel timestamp-based chunking (5x faster)
- ✅ 20-minute segments for optimal cost/performance
- ✅ No downloads, no cookies, no failures
- ✅ Complete UI component library
- ✅ Production deployment on GCP

## 📋 Roadmap

### Next Sprint: Documentation & Polish 📝
- [ ] API documentation
- [ ] Beta testing with real users
- [ ] Monitoring & analytics setup
- [ ] Performance optimization

### Future Phases
- Advanced search & discovery
- Video comparison
- Batch analysis
- Mobile app (React Native)

See [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) for detailed roadmap.

## 📝 License

Private project - All rights reserved

## 👩‍💻 Author

**Yasemin Hukumdar** (with Claude's assistance)  
GitHub: [@yhukumdar](https://github.com/yhukumdar)

---

For detailed technical documentation, see the `/docs` folder.
