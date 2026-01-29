# VIDEO FILTERING APP - PROJECT CONTEXT

## Overview
A video filtering app for parents to analyze YouTube videos for kid-safe content before children watch them.

**Created:** January 2026
**Status:** ✅ Production Ready - Live & Deployed
**Tech Stack:** FastAPI (backend), React+Vite (frontend), Supabase, Gemini 2.5 Flash, Google Cloud Run, Firebase Hosting

---

## Architecture

### Backend (FastAPI)
- **Location:** `backend/`
- **Main files:**
  - `main.py` - FastAPI app with /analyze endpoint
  - `src/workers/video_analyzer.py` - Gemini video analysis worker
  - `config.py` - Supabase + Gemini configuration
  - `start.py` - Worker startup script

### Frontend (React + Vite)
- **Location:** `frontend/src/`
- **Main components:**
  - `App.jsx` - Router + Auth provider
  - `Dashboard.jsx` - Main dashboard with video reports
  - `KidProfiles.jsx` - Kid profile management
  - `ContentPreferences.jsx` - Per-kid content settings
  - `UploadVideo.jsx` - YouTube URL submission

### Database (Supabase)
- **Tables:**
  - `reports` - Video analysis results (safety scores, themes, age recommendations)
  - `kid_profiles` - Parent's children (name, age)
  - `content_preferences` - Per-kid settings (allowed/blocked themes, thresholds)
  - `content_tags` - Video themes for filtering

---

## Key Features (Completed ✅)

### Phase 1: Core Analysis
- ✅ YouTube URL submission
- ✅ Video analysis using Gemini 2.5 Flash
- ✅ Safety scores: Violence (0-100), NSFW (0-100), Scary (0-100), Profanity (true/false)
- ✅ Overall safety score (0-100)
- ✅ Retry logic for Gemini 503 errors (exponential backoff)
- ✅ Video title fetching via yt-dlp

### Phase 2: Content Intelligence
- ✅ Theme detection (educational, animated, scary, religious, political, etc.)
- ✅ Age recommendations (3+, 7+, 10+, 13+, 16+, 18+)
- ✅ Summary, concerns, positive aspects extraction
- ✅ Show/Hide details toggle

### Phase 3: Parental Controls
- ✅ Kid profile management (CRUD operations)
- ✅ Content preferences per kid:
  - Allowed themes (whitelist)
  - Blocked themes (blacklist)
  - Max violence score (0-100 slider)
  - Max scary score (0-100 slider)
  - Max NSFW score (0-100 slider)
  - Allow profanity (toggle)
- ✅ Preference warnings on video cards
  - Green ✅ "Suitable for [Kid]"
  - Red ⚠️ "Not suitable for [Kid]" with violation details
- ✅ Theme filtering (multi-select)
- ✅ Kid profile filter (show warnings for specific kid)

### Testing Infrastructure
- ✅ Playwright automated testing (18 tests)
- ✅ Test data setup script
- ✅ E2E tests for all major features

---

## Technical Decisions

### Video Analysis
- **No video download** - Gemini analyzes directly from YouTube URL
- **Worker pattern** - Async processing to handle long analyses
- **Retry logic** - Handle Gemini 503 errors with exponential backoff (max 4 retries)

### Age Recommendation Algorithm
```python
# Higher scores = older age recommendation
if nsfw > 60: age = 18
elif nsfw > 40: age = 16
elif nsfw > 20: age = 13
elif violence > 70 or scary > 70: age = 13
elif violence > 50 or scary > 50: age = 10
elif violence > 30 or scary > 30: age = 7
elif violence > 15 or scary > 15: age = 5
else: age = 3

if profanity: age = max(age, 10)
```

### Content Preferences Logic
- **Mutual exclusivity** - Can't be both allowed AND blocked
- **OR logic for filtering** - Video matches if it has ANY selected theme
- **AND logic for violations** - Kid warning if violates ANY preference

---

## Important Code Patterns

### Gemini Prompt Structure
Located in `video_analyzer.py`:
- Clear safety scoring rubrics (0-100 scales)
- Theme detection with predefined categories
- JSON response format with fallback regex extraction
- Specific instructions to avoid false positives

### Database Queries
- Use Supabase service client for workers (bypass RLS)
- Use Supabase anon client for frontend (with RLS)
- Always filter by `parent_id` for multi-tenancy

### Frontend State Management
- React useState for local state
- Supabase realtime subscriptions for live updates
- No global state library (keep it simple)

---

## Known Issues / Quirks

### Video Title Fetching
- Uses yt-dlp with 30s timeout
- Falls back to "YouTube Video (VIDEO_ID)" if timeout
- Some videos may timeout due to slow metadata fetch

### Gemini API
- Occasionally returns 503 (overloaded)
- Retry logic handles this automatically
- Summary/concerns/positive_aspects may be empty if Gemini doesn't provide them

### Default Values
- Don't show "Summary" section if it contains "Video content analyzed" (default fallback)
- Age recommendation defaults to 3 if all scores are 0

---

## Roadmap

### Completed (Phase 1-3) ✅
- Core video analysis
- Theme detection
- Age recommendations
- Kid profiles
- Content preferences
- Preference warnings
- Filtering system
- Automated testing
- Design/CSS improvements
  - Enhanced hover effects and transitions
  - Improved Login page with Shield icon and gradients
  - Polished video cards with shadows and animations
  - Better button styles across all components
  - Smooth modal animations
  - Theme filter button improvements
  - Consistent rounded corners and visual depth
- Loading indicators and animations
- Mobile responsiveness (touch-friendly buttons, responsive layouts)
- Help tooltips
  - Score explanations (0-20, 21-50, 51+ ranges)
  - Threshold slider guidance
  - Theme selection hints
  - Age recommendation context

### Just Completed ✅ (Jan 28, 2026)
- ✅ Production deployment to GCP
  - Backend: Cloud Run (auto-scaling, 10min timeout)
  - Frontend: Firebase Hosting
  - Worker: Cloud Scheduler (runs every minute)
- ✅ Async video processing (handles videos of any length)
- ✅ Optimized Gemini prompt (reduced 80% to avoid token limits)
- ✅ Environment variables configured on Cloud Run
- ✅ IAM permissions for Cloud Scheduler

### Production URLs
- **Frontend:** https://video-safety-app-9a6b5.web.app
- **Backend:** https://video-safety-backend-976885701274.us-central1.run.app
- **Worker:** Auto-triggered every minute via Cloud Scheduler

### Next Steps (Priority Order)
1. **Documentation & Launch Prep** 🎯 NEXT
   - ✅ GitHub repository setup (https://github.com/yhukumdar/video-safety-app)
   - ✅ Production deployment (GCP - Cloud Run + Firebase)
   - 📝 README.md - User-facing documentation
   - 📝 API documentation
   - 🧪 Beta testing with real users
   - 📊 Monitoring & analytics setup

2. **Advanced Search & Discovery**
   - Search by video title/URL
   - Video history browsing
   - Sort by date/safety score
   - Export reports as PDF

3. **Performance & Reliability**
   - Error monitoring (Sentry/LogRocket)
   - Usage analytics
   - Gemini API cost tracking
   - Database query optimization
   - Cache frequently analyzed videos

4. **Enhanced Features**
   - Video comparison (side-by-side)
   - Batch video analysis (multiple URLs)
   - Email notifications when analysis completes
   - Shareable reports (public links)

5. **Mobile App** (Phase 4 - Future)
   - React Native + Expo
   - Push notifications
   - Mobile-optimized UI
   - Offline support

6. **Parent-Kid Control Model** (Phase 5 - Future)
   - Real-time YouTube monitoring
   - Block/allow controls
   - Viewing restrictions
   - Screen time limits

---

## Environment Setup

### Required API Keys
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (backend)
- `SUPABASE_ANON_KEY` - Supabase anon key (frontend)
- `GEMINI_API_KEY` - Google Gemini API key
- `GOOGLE_CLOUD_PROJECT_ID` - GCP project (if using Cloud Storage)

### Installation
```bash
# Backend
cd backend
pip install -r requirements.txt --break-system-packages
python start.py

# Frontend
cd frontend
npm install
npm run dev

# Tests
npm install
npx playwright install
npm test
```

---

## Database Schema

### reports
- id (uuid)
- parent_id (uuid) → auth.users
- youtube_url (text)
- video_title (text)
- status (text: pending/processing/completed/failed)
- safety_score (int 0-100)
- violence_score (int 0-100)
- nsfw_score (int 0-100)
- scary_score (int 0-100)
- profanity_detected (boolean)
- analysis_result (jsonb) - Contains themes, age_recommendation, summary, concerns, positive_aspects
- created_at, analyzed_at, updated_at

### kid_profiles
- id (uuid)
- parent_id (uuid) → auth.users
- name (text)
- age (int)
- created_at, updated_at

### content_preferences
- id (uuid)
- kid_profile_id (uuid) → kid_profiles
- allowed_themes (text[])
- blocked_themes (text[])
- max_violence_score (int, default 30)
- max_scary_score (int, default 20)
- max_nsfw_score (int, default 10)
- allow_profanity (boolean, default false)
- created_at, updated_at

---

## Coding Preferences

**User's Style:**
- Direct implementation without extensive documentation
- No extra guide files unless requested
- Focus on working code first, polish later
- Prefer showing implementation over explanations

**Key Principles:**
- Keep it simple - avoid over-engineering
- Mobile-responsive from the start
- Clear error messages
- User-friendly UI/UX

---

## Current Sprint

**Status:** ✅ Production Deployed & Working

**Just Completed:**
- Production deployment to GCP (Cloud Run + Firebase)
- Async worker pattern with Cloud Scheduler
- Fixed Gemini token limit issues
- End-to-end video analysis pipeline working

**Next Sprint Focus:** 📝 Documentation & Polish
1. Write comprehensive README.md
2. Add API documentation
3. Set up error monitoring
4. Beta testing with real users
5. Gather feedback & iterate

---

## Common Commands

```bash
# Start backend worker
cd backend && python start.py

# Start frontend dev server
cd frontend && npm run dev

# Run all tests
npm test

# Run tests with browser visible
npm run test:headed

# View test report
npx playwright show-report

# Database migrations (if needed)
# Supabase SQL Editor - run SQL directly
```

---

## Important Files to Reference

**Backend:**
- `backend/src/workers/video_analyzer.py` - Main analysis logic
- `backend/config.py` - Configuration
- `backend/main.py` - API endpoints

**Frontend:**
- `frontend/src/components/Dashboard.jsx` - Main dashboard
- `frontend/src/components/ContentPreferences.jsx` - Preferences UI
- `frontend/src/components/KidProfiles.jsx` - Kid management

**Tests:**
- `tests/setup.spec.js` - Test data creation
- `tests/e2e/video-upload.spec.js` - Video upload tests
- `tests/e2e/filtering.spec.js` - Filtering tests

**Config:**
- `playwright.config.js` - Test configuration
- `frontend/vite.config.js` - Vite configuration

---

## Deployment

### Production-Ready Documentation
- **DEPLOYMENT.md** - Comprehensive guide for deploying to multiple platforms
- **PRODUCTION_CHECKLIST.md** - Step-by-step verification checklist
- **Environment Templates** - `.env.example` files for backend and frontend

### Supported Platforms
1. **Railway + Vercel** (Recommended)
   - Backend: Railway (Python/FastAPI)
   - Frontend: Vercel (React/Vite)
   - Cost: ~$0-5/month

2. **Render**
   - Backend: Web Service
   - Frontend: Static Site
   - Cost: Free tier available

3. **Google Cloud Platform**
   - Backend: Cloud Run
   - Frontend: Firebase Hosting
   - Cost: Pay-as-you-go

4. **DigitalOcean App Platform**
   - Full-stack deployment
   - Cost: ~$5-10/month

### Required API Keys
- **Supabase**: Database & Auth (Free tier: 500MB, 2GB storage)
- **Gemini API**: Video analysis (Free tier: 60 req/min)
- **Domain** (optional): Custom domain for production

### Database Setup
- All table schemas documented in project_context.md
- Row Level Security (RLS) policies required
- Automatic backups via Supabase

---

## Notes for Future Development

- Keep components small and focused
- Always test manually after automated tests pass
- Document API changes in this file
- Update roadmap as features complete
- Mobile-first for new features

---

**Last Updated:** January 28, 2026 - Production Deployment Complete! 🎉
**By:** Yasemin (with Claude's assistance)
