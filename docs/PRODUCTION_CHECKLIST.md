# Production Deployment Checklist

## 🎯 Pre-Deployment

### API Keys & Services
- [ ] Create Supabase project
- [ ] Get Supabase URL and keys (service role + anon)
- [ ] Get Gemini API key from Google AI Studio
- [ ] Set up database tables in Supabase
- [ ] Enable Row Level Security (RLS) policies
- [ ] Test database connections locally

### Environment Configuration
- [ ] Create `backend/.env` from `.env.example`
- [ ] Create `frontend/.env` from `.env.example`
- [ ] Verify all required environment variables are set
- [ ] Test locally with production environment variables

### Code Quality
- [ ] Run backend tests: `cd backend && python -m pytest`
- [ ] Run frontend tests: `npm test`
- [ ] Fix any failing tests
- [ ] Check for console errors in browser
- [ ] Test video analysis with real YouTube URLs
- [ ] Verify mobile responsiveness

---

## 🚀 Deployment

### Choose Your Platform

**Option 1: Railway + Vercel (Recommended)**
- [ ] Deploy backend to Railway
- [ ] Configure environment variables on Railway
- [ ] Get Railway backend URL
- [ ] Deploy frontend to Vercel
- [ ] Set `VITE_API_URL` to Railway backend URL
- [ ] Verify deployment URLs work

**Option 2: Render (Backend + Frontend)**
- [ ] Deploy backend as Web Service
- [ ] Deploy frontend as Static Site
- [ ] Configure environment variables
- [ ] Verify both services are running

**Option 3: Google Cloud Platform**
- [ ] Deploy backend to Cloud Run
- [ ] Deploy frontend to Firebase Hosting
- [ ] Configure environment variables
- [ ] Set up custom domains (optional)

---

## 🗄️ Database Setup

### Supabase Configuration
- [ ] Create `parent_profiles` table
- [ ] Create `kid_profiles` table
- [ ] Create `reports` table
- [ ] Create `content_preferences` table
- [ ] Create `content_tags` table (if needed)
- [ ] Set up foreign key relationships
- [ ] Enable RLS on all tables
- [ ] Create RLS policies for each table:
  - [ ] parent_profiles: Users can only access their own profile
  - [ ] kid_profiles: Parents can only access their kids
  - [ ] reports: Parents can only access their reports
  - [ ] content_preferences: Parents can only access their kids' preferences
- [ ] Test RLS policies with test accounts
- [ ] Set up indexes for performance
- [ ] Configure database backups

### SQL Scripts Location
Refer to `PROJECT_CONTEXT.md` for table schemas

---

## ✅ Post-Deployment Testing

### Authentication & User Management
- [ ] Sign up with new account
- [ ] Verify email confirmation (if enabled)
- [ ] Log in successfully
- [ ] Log out successfully
- [ ] Test password reset (if implemented)
- [ ] Create parent profile

### Core Features
- [ ] Create kid profile
- [ ] Edit kid profile
- [ ] Delete kid profile
- [ ] Set content preferences for a kid
- [ ] Submit YouTube video URL
- [ ] Wait for video analysis to complete
- [ ] View safety scores
- [ ] View age recommendations
- [ ] View themes
- [ ] Check preference warnings
- [ ] Filter videos by theme
- [ ] Filter by kid profile

### UI/UX
- [ ] Test on desktop (Chrome, Firefox, Safari)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Test on tablet
- [ ] Verify tooltips appear on hover
- [ ] Check responsive layouts
- [ ] Verify loading spinners appear
- [ ] Test smooth animations
- [ ] Check all buttons work
- [ ] Verify forms validate correctly
- [ ] Test navigation between views

### Performance
- [ ] Page load time < 3 seconds
- [ ] Video analysis completes within reasonable time
- [ ] No console errors
- [ ] No broken images
- [ ] API responses are fast

---

## 🔐 Security

### Environment Variables
- [ ] Verify `.env` files are in `.gitignore`
- [ ] Never expose service role keys on frontend
- [ ] Use anon keys on frontend only
- [ ] Verify no API keys in Git history

### CORS Configuration
- [ ] Set `ALLOWED_ORIGINS` to production frontend URL
- [ ] Remove localhost from CORS origins in production
- [ ] Test CORS with actual frontend domain

### Row Level Security (RLS)
- [ ] RLS enabled on all tables
- [ ] Test with different user accounts
- [ ] Verify users cannot access others' data
- [ ] Check API endpoints respect RLS

### API Security
- [ ] Rate limiting configured (optional)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Supabase handles this)
- [ ] XSS prevention (React handles this)

---

## 📊 Monitoring & Maintenance

### Set Up Monitoring
- [ ] Set up error tracking (Sentry - optional)
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Monitor API usage (Gemini quotas)
- [ ] Monitor database usage (Supabase dashboard)
- [ ] Set up alerts for downtime

### Documentation
- [ ] Update README with deployed URLs
- [ ] Document deployment process
- [ ] Create user guide (optional)
- [ ] Document API endpoints (optional)

### Backups
- [ ] Enable Supabase automatic backups
- [ ] Document backup restoration process
- [ ] Test backup restoration (optional)

---

## 💰 Cost Management

### Monitor Usage
- [ ] Check Supabase usage dashboard weekly
- [ ] Monitor Gemini API quota
- [ ] Monitor hosting platform usage
- [ ] Set up billing alerts

### Free Tier Limits
- **Supabase**: 500MB database, 2GB storage
- **Railway**: $5/month free credit
- **Vercel**: Unlimited personal projects
- **Gemini**: 60 requests/minute free

---

## 🐛 Troubleshooting

### Common Issues
- [ ] CORS errors → Check ALLOWED_ORIGINS
- [ ] Database connection failed → Check SUPABASE keys
- [ ] Video analysis fails → Check GEMINI_API_KEY
- [ ] Frontend can't reach backend → Check VITE_API_URL
- [ ] RLS blocking queries → Review RLS policies

---

## 📝 Final Steps

- [ ] Update GitHub README with deployment URLs
- [ ] Create GitHub release/tag (v1.0.0)
- [ ] Share app with beta testers
- [ ] Collect feedback
- [ ] Monitor error logs
- [ ] Plan next features

---

## 🎉 Launch!

Once all checkboxes are complete:
- [ ] Announce launch
- [ ] Share with users
- [ ] Monitor closely for first 24-48 hours
- [ ] Fix any critical bugs immediately
- [ ] Celebrate! 🎊

---

**Last Updated**: January 2026
