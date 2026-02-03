# YouTube Cookies Setup for Video Analysis

This guide explains how to set up and maintain YouTube cookies for automated video analysis.

## Why Cookies Are Needed

YouTube uses bot detection to prevent automated downloads. Using browser cookies makes requests appear as a logged-in user, bypassing these restrictions.

## Initial Setup

### Step 1: Export Cookies from Your Browser

#### Option A: Chrome (Recommended)

1. Install the "Get cookies.txt LOCALLY" extension:
   - Visit: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
   - Click "Add to Chrome"

2. Navigate to YouTube.com and make sure you're logged in

3. Click the extension icon in your browser toolbar

4. Click "Export" to download `cookies.txt`

#### Option B: Firefox

1. Install the "cookies.txt" extension:
   - Visit: https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/
   - Click "Add to Firefox"

2. Navigate to YouTube.com and make sure you're logged in

3. Click the extension icon

4. Click "Export cookies.txt" and save the file

#### Option C: Manual Export (Any Browser)

1. Install EditThisCookie extension for your browser
2. Go to youtube.com (logged in)
3. Click the extension → Export → Netscape format
4. Save as `cookies.txt`

### Step 2: Upload Cookies to VM

```bash
# From your local machine
gcloud compute scp cookies.txt video-worker:~/.config/yt-dlp/cookies.txt --zone=us-central1-a
```

### Step 3: Verify and Activate

```bash
# SSH into the VM and run the update script
gcloud compute ssh video-worker --zone=us-central1-a --command='~/update-cookies.sh'
```

## Maintenance

### Check Cookie Status

```bash
gcloud compute ssh video-worker --zone=us-central1-a --command='~/check-cookies.sh'
```

### Update Expired Cookies

When cookies expire (typically after 2-6 months):

1. Export new cookies from your browser (Step 1 above)
2. Upload new cookies (Step 2 above)
3. Run update script (Step 3 above)

### Automated Monitoring

A daily cron job checks cookie validity automatically. View the log:

```bash
gcloud compute ssh video-worker --zone=us-central1-a --command='tail -20 ~/.config/yt-dlp/cookie-check.log'
```

## Troubleshooting

### "Sign in to confirm you're not a bot" Error

This means cookies are expired or invalid. Follow the update process above.

### Cookies Not Working

1. Make sure you're logged into YouTube when exporting cookies
2. Verify the cookies.txt file is in Netscape format
3. Check file permissions: `ls -la ~/.config/yt-dlp/cookies.txt`
4. Try exporting cookies from a different browser

### Test Manually

```bash
gcloud compute ssh video-worker --zone=us-central1-a
cd /home/yaseminhukumdar/worker
python3.11 -m yt_dlp --cookies ~/.config/yt-dlp/cookies.txt \
  --simulate --get-duration \
  'https://www.youtube.com/watch?v=jNQXAC9IVRw'
```

If this works, the cookies are valid.

## Security Notes

- Cookies contain your YouTube session tokens
- Keep cookies.txt file secure and never commit to git
- Cookies are stored only on the VM with restricted permissions (600)
- Backups are created automatically in `~/.config/yt-dlp/backups/`

## Architecture

```
Browser → Export Cookies → Upload to VM → yt-dlp Uses Cookies → Video Analysis
              ↓                                      ↑
         cookies.txt                     Automatic Retry on Failure
              ↓                                      ↑
    Daily Validity Check → Alert if Expired → Manual Update Required
```

## Files Created

- `~/.config/yt-dlp/config` - yt-dlp configuration
- `~/.config/yt-dlp/cookies.txt` - YouTube cookies (you provide)
- `~/update-cookies.sh` - Script to update and validate cookies
- `~/check-cookies.sh` - Script to monitor cookie validity
- `~/.config/yt-dlp/cookie-check.log` - Monitoring log

## Quick Reference

```bash
# Upload new cookies
gcloud compute scp cookies.txt video-worker:~/.config/yt-dlp/cookies.txt --zone=us-central1-a

# Update and test
gcloud compute ssh video-worker --zone=us-central1-a --command='~/update-cookies.sh'

# Check status
gcloud compute ssh video-worker --zone=us-central1-a --command='~/check-cookies.sh'

# View logs
gcloud compute ssh video-worker --zone=us-central1-a --command='tail -50 ~/.config/yt-dlp/cookie-check.log'
```
