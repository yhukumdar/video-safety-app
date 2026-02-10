# Deployment Guide - Video Safety App

## 📋 Prerequisites

### Required Services
1. **Supabase Account** - Database & Authentication
2. **Google Gemini API Key** - Video analysis
3. **Domain Names** (Optional but recommended)
   - Frontend domain
   - Backend API domain

### Required Software
- Python 3.9+
- Node.js 18+
- Git

---

## 🔧 Environment Setup

### 1. Backend Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
PORT=8000
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

**Where to get these:**
- **SUPABASE_URL & KEY**: Supabase Dashboard → Settings → API
- **GEMINI_API_KEY**: Google AI Studio (https://makersuite.google.com/app/apikey)

### 2. Frontend Environment Variables

Copy `frontend/.env.example` to `frontend/.env` and fill in:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-backend-domain.com
```

---

## 🚀 Deployment Options

### Option 1: Railway (Recommended - Easiest)

#### Backend Deployment on Railway

1. **Create Railway Account**: https://railway.app
2. **Create New Project** → Deploy from GitHub
3. **Select Repository**: `yhukumdar/video-safety-app`
4. **Set Root Directory**: `/backend`
5. **Add Environment Variables**:
   - Add all variables from `backend/.env.example`
   - Railway will auto-detect Python and install dependencies
6. **Configure Start Command**:
   ```
   python -m uvicorn src.main:app --host 0.0.0.0 --port $PORT
   ```
7. **Deploy** - Railway will provide a URL like `https://your-app.railway.app`

#### Frontend Deployment on Vercel/Netlify

**Vercel (Recommended for React):**
1. **Create Vercel Account**: https://vercel.com
2. **Import Git Repository**: `yhukumdar/video-safety-app`
3. **Set Root Directory**: `frontend`
4. **Set Build Command**: `npm run build`
5. **Set Output Directory**: `dist`
6. **Add Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (use your Railway backend URL)
7. **Deploy**

---

### Option 2: Render

#### Backend on Render

1. **Create Render Account**: https://render.com
2. **New Web Service** → Connect GitHub
3. **Select Repository** & **Root Directory**: `backend`
4. **Environment**: Python 3
5. **Build Command**: `pip install -r requirements.txt`
6. **Start Command**: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
7. **Add Environment Variables** from `.env.example`
8. **Create Web Service** - Free tier available

#### Frontend on Render

1. **New Static Site**
2. **Root Directory**: `frontend`
3. **Build Command**: `npm install && npm run build`
4. **Publish Directory**: `dist`
5. **Add Environment Variables**
6. **Deploy**

---

### Option 3: Google Cloud Platform

#### Backend on Cloud Run

```bash
# Build and deploy
cd backend
gcloud run deploy video-safety-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=xxx,SUPABASE_KEY=xxx,GEMINI_API_KEY=xxx
```

#### Frontend on Firebase Hosting

```bash
cd frontend
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

---

### Option 4: DigitalOcean App Platform

1. **Create DigitalOcean Account**
2. **Create New App** → GitHub Repository
3. **Configure Components**:
   - **Backend**: Python app from `/backend`
   - **Frontend**: Static site from `/frontend`
4. **Set Environment Variables** for both
5. **Deploy**

---

## 🗄️ Database Setup (Supabase)

### Required Tables

Make sure these tables exist in Supabase:

1. **parent_profiles**
   ```sql
   CREATE TABLE parent_profiles (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users(id),
     full_name TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **kid_profiles**
   ```sql
   CREATE TABLE kid_profiles (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     parent_id UUID REFERENCES parent_profiles(id),
     name TEXT NOT NULL,
     age INTEGER NOT NULL,
     date_of_birth DATE,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **reports**
   ```sql
   CREATE TABLE reports (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     parent_id UUID REFERENCES parent_profiles(id),
     youtube_url TEXT NOT NULL,
     video_title TEXT,
     status TEXT DEFAULT 'pending',
     safety_score INTEGER,
     violence_score INTEGER,
     nsfw_score INTEGER,
     scary_score INTEGER,
     profanity_detected BOOLEAN,
     analysis_result JSONB,
     created_at TIMESTAMP DEFAULT NOW(),
     analyzed_at TIMESTAMP
   );
   ```

4. **content_preferences**
   ```sql
   CREATE TABLE content_preferences (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     kid_profile_id UUID REFERENCES kid_profiles(id),
     allowed_themes TEXT[],
     blocked_themes TEXT[],
     max_violence_score INTEGER DEFAULT 30,
     max_scary_score INTEGER DEFAULT 20,
     max_nsfw_score INTEGER DEFAULT 10,
     allow_profanity BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

### Enable Row Level Security (RLS)

Enable RLS on all tables and create policies to ensure users can only access their own data.

---

## ✅ Post-Deployment Checklist

- [ ] Backend is accessible and responding to health checks
- [ ] Frontend loads without errors
- [ ] User can sign up and log in
- [ ] Kid profiles can be created
- [ ] Video analysis works (test with a YouTube URL)
- [ ] Content preferences save correctly
- [ ] Theme filtering works
- [ ] Mobile responsiveness verified
- [ ] CORS is configured correctly
- [ ] Environment variables are set
- [ ] Database migrations completed
- [ ] RLS policies enabled

---

## 🔍 Testing Production

1. **Test Authentication**: Sign up with a new account
2. **Test Video Analysis**: Submit a YouTube URL
3. **Test Kid Profiles**: Create, edit, delete profiles
4. **Test Preferences**: Set content preferences
5. **Test Filtering**: Filter videos by theme
6. **Test Mobile**: Check on mobile devices

---

## 🐛 Troubleshooting

### Common Issues

**CORS Errors:**
- Ensure `ALLOWED_ORIGINS` in backend includes your frontend URL
- Check backend CORS configuration in `main.py`

**Database Connection Failed:**
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check Supabase project is active

**Video Analysis Fails:**
- Verify `GEMINI_API_KEY` is valid
- Check Gemini API quota/limits
- Ensure video URL is publicly accessible

**Frontend Can't Connect to Backend:**
- Verify `VITE_API_URL` points to deployed backend
- Check backend is running and accessible
- Verify CORS configuration

---

## 📊 Monitoring

### Recommended Tools
- **Backend Logs**: Platform-specific (Railway/Render/GCP logs)
- **Error Tracking**: Sentry (optional)
- **Uptime Monitoring**: UptimeRobot or Pingdom
- **Analytics**: Google Analytics (optional)

---

## 💰 Cost Estimation

### Free Tier Options
- **Supabase**: 500MB database, 2GB storage, 50K monthly active users (Free)
- **Railway**: $5/month credit (Free tier)
- **Vercel**: Unlimited personal projects (Free)
- **Gemini API**: Generous free tier (60 requests/minute)

**Estimated Monthly Cost**: $0-10 for MVP with low traffic

---

## 🔐 Security Recommendations

1. **Never commit `.env` files** (already in .gitignore)
2. **Use service role keys** only on backend
3. **Enable RLS** on all Supabase tables
4. **Use HTTPS** for all production URLs
5. **Rotate API keys** periodically
6. **Monitor API usage** to prevent abuse
7. **Set rate limits** on backend endpoints

---

## 📞 Support

For deployment issues:
- Check GitHub Issues: https://github.com/yhukumdar/video-safety-app/issues
- Review platform documentation
- Contact platform support

---

**Last Updated**: January 2026
