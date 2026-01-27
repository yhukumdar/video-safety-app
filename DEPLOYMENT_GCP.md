# Google Cloud Platform Deployment Guide

## 📋 Prerequisites

- Google Cloud account (you already have this!)
- GCP Project created
- `gcloud` CLI installed on your computer
- Billing enabled on your GCP project (required for Cloud Run)

---

## 🚀 Quick Deployment Steps

### 1. Install & Configure gcloud CLI

**Check if already installed:**
```bash
gcloud --version
```

**If not installed, install from:** https://cloud.google.com/sdk/docs/install

**Login and set project:**
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

---

## 🔧 Backend Deployment (Cloud Run)

### Step 1: Enable Required APIs

```bash
# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Enable Container Registry
gcloud services enable containerregistry.googleapis.com
```

### Step 2: Deploy Backend to Cloud Run

From your project root directory:

```bash
cd backend

# Deploy directly from source (Cloud Run will build automatically)
gcloud run deploy video-safety-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=https://your-project.supabase.co \
  --set-env-vars SUPABASE_KEY=your-service-role-key \
  --set-env-vars GEMINI_API_KEY=your-gemini-api-key \
  --max-instances 10 \
  --memory 512Mi \
  --timeout 300
```

**Cloud Run will:**
- Detect it's a Python app
- Install dependencies from `requirements.txt`
- Build and deploy automatically
- Give you a URL like: `https://video-safety-backend-xxxxx-uc.a.run.app`

**Save this URL** - you'll need it for the frontend!

---

## 🎨 Frontend Deployment (Firebase Hosting)

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

### Step 3: Initialize Firebase in Your Project

```bash
cd frontend
firebase init hosting
```

**Choose these options:**
- Use an existing project? → Select your GCP project
- What do you want to use as your public directory? → `dist`
- Configure as a single-page app? → `Yes`
- Set up automatic builds with GitHub? → `No` (we'll do manual for now)
- File dist/index.html already exists. Overwrite? → `No`

### Step 4: Update Frontend Environment Variables

Update `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://video-safety-backend-xxxxx-uc.a.run.app
```

**Important:** Use your Cloud Run backend URL from above!

### Step 5: Build and Deploy

```bash
# Build the frontend
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

**Firebase will give you a URL like:** `https://your-project.web.app`

---

## 💰 Cost Estimate (GCP)

### Cloud Run (Backend)
- **Free Tier**: 2 million requests/month, 360,000 GB-seconds
- **After Free Tier**: ~$0.00002400 per request
- **Estimated**: $0-5/month for small usage

### Firebase Hosting (Frontend)
- **Free Tier**: 10GB storage, 360MB/day transfer
- **Estimated**: $0/month (well within free tier)

### Total GCP Cost: **$0-5/month** for low traffic

---

## 🔐 Security Configuration

### Backend CORS Setup

Update `backend/src/main.py` to allow your Firebase domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-project.web.app",
        "https://your-project.firebaseapp.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Update Environment Variables

You can update Cloud Run environment variables anytime:

```bash
gcloud run services update video-safety-backend \
  --region us-central1 \
  --update-env-vars ALLOWED_ORIGINS=https://your-project.web.app
```

---

## 📊 Monitoring & Logs

### View Backend Logs

```bash
gcloud run services logs read video-safety-backend \
  --region us-central1 \
  --limit 50
```

### Cloud Run Dashboard
https://console.cloud.google.com/run

### Firebase Hosting Dashboard
https://console.firebase.google.com/

---

## 🔄 Updating Your Deployment

### Update Backend

```bash
cd backend
gcloud run deploy video-safety-backend \
  --source . \
  --region us-central1
```

### Update Frontend

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## 🐛 Troubleshooting

### Backend Issues

**Check logs:**
```bash
gcloud run services logs read video-safety-backend --region us-central1 --limit 100
```

**Common issues:**
- **503 errors**: Check if service is running in Cloud Run console
- **CORS errors**: Verify ALLOWED_ORIGINS matches your Firebase domain
- **Database errors**: Check SUPABASE_URL and SUPABASE_KEY

### Frontend Issues

**CORS errors:**
- Verify `VITE_API_URL` points to Cloud Run URL
- Check backend CORS configuration

**Build errors:**
```bash
# Clear cache and rebuild
rm -rf dist node_modules
npm install
npm run build
```

---

## 🎯 Custom Domain (Optional)

### For Backend (Cloud Run)

1. Go to Cloud Run console
2. Click on your service
3. Click "Manage Custom Domains"
4. Follow instructions to map `api.yourdomain.com`

### For Frontend (Firebase)

```bash
firebase hosting:channel:deploy production
```

Then add custom domain in Firebase console.

---

## 📋 Post-Deployment Checklist

- [ ] Backend deployed to Cloud Run
- [ ] Frontend deployed to Firebase Hosting
- [ ] Environment variables configured
- [ ] CORS configured correctly
- [ ] Test signup/login
- [ ] Test video analysis
- [ ] Verify kid profiles work
- [ ] Check mobile responsiveness
- [ ] Monitor logs for errors
- [ ] Set up billing alerts

---

## 🚨 Important Commands

**View all Cloud Run services:**
```bash
gcloud run services list
```

**Delete a service:**
```bash
gcloud run services delete video-safety-backend --region us-central1
```

**View environment variables:**
```bash
gcloud run services describe video-safety-backend --region us-central1 --format="value(spec.template.spec.containers[0].env)"
```

---

## 💡 Tips

1. **Use Cloud Run for backend** - It auto-scales and you only pay when requests come in
2. **Use Firebase Hosting for frontend** - It's free and has global CDN
3. **Set max-instances** to control costs (prevents runaway billing)
4. **Enable billing alerts** in GCP console to avoid surprises
5. **Use Cloud Monitoring** to track performance

---

**Last Updated**: January 2026

Ready to deploy? Run the commands above step by step!
