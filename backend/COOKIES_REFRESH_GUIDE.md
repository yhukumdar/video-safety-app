# Quick Guide: Refresh YouTube Cookies

## When to Refresh

**Symptoms that cookies need refreshing:**
- Long videos (30+ min) fail with: "Sign in to confirm you're not a bot"
- Error: "The provided YouTube account cookies are no longer valid"

**Frequency:** Every 1-3 months (YouTube rotates cookies for security)

---

## How to Refresh (5 minutes)

### Step 1: Export Fresh Cookies from Browser

**Chrome (recommended):**
1. Install extension: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
2. Go to **youtube.com** and **log in** (must be logged in!)
3. Click extension icon → "Export" → Save as `cookies.txt`

**Firefox:**
1. Install: https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/
2. Go to **youtube.com** and **log in**
3. Click extension → "Export cookies.txt"

### Step 2: Replace Old Cookies

```bash
cd /Users/yaseminhukumdar/Projects/video-safety-app

# Replace the old cookies.txt with your newly downloaded one
mv ~/Downloads/cookies.txt backend/cookies.txt
```

### Step 3: Redeploy to Cloud Run

```bash
cd backend
gcloud run deploy video-safety-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --platform managed \
  --timeout=600 \
  --clear-base-image
```

Wait ~2-3 minutes for deployment, then test with a long video (30+ min).

---

## Important Notes

✅ **Short videos (<30 min):** Don't need cookies at all! They use YouTube Data API.

⚠️ **Long videos (30+ min):** Require fresh cookies for download.

🔒 **Security:** Never commit cookies.txt to GitHub (already in .gitignore).

⏰ **Expiration:** Cookies expire every 1-3 months (YouTube's security measure).

---

## Troubleshooting

**Q: I exported cookies but still getting errors**
- Make sure you're **logged in to YouTube** when exporting
- Try a different browser
- Clear your browser cache and re-login to YouTube

**Q: Do I need to do this for every video?**
- No! Only when cookies expire (every 1-3 months)
- Short videos don't need cookies at all

**Q: Can I automate this?**
- Not easily - YouTube rotates cookies for security
- Best practice: Set a calendar reminder for every 2 months

---

## Architecture Reminder

```
Short videos (<30 min):          Long videos (30+ min):
YouTube Data API ✅              YouTube Data API for metadata ✅
   ↓                                ↓
Gemini analyzes directly         yt-dlp downloads (needs cookies) ⚠️
   ↓                                ↓
Done! (no cookies needed)        Gemini analyzes chunks
                                    ↓
                                 Done!
```

**99% of videos are under 30 minutes, so cookies are rarely needed!**
