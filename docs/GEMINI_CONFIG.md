# 🔒 GEMINI CONFIGURATION - TIMESTAMP-BASED CHUNKING

**Last Updated:** February 5, 2026
**Status:** ✅ PRODUCTION - No yt-dlp, Direct URL Analysis

## 🎯 Architecture: Direct YouTube URL Analysis

**Short videos (<30 min):** Single Gemini API call with YouTube URL
**Long videos (>30 min):** Parallel timestamp-based chunking (20-min segments)

## ⚠️ CRITICAL: Both features use the same configuration

### Video Analysis (src/workers/video_analyzer.py)
```python
# Client configuration
client = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options={'api_version': 'v1alpha'}  # MUST be v1alpha!
)

MODEL_NAME = 'gemini-2.5-flash'  # Supports YouTube URLs directly

# Chunking configuration
MAX_DURATION_FOR_FULL_ANALYSIS = 30 * 60  # 30 minutes
CHUNK_DURATION_SECONDS = 20 * 60  # 20-minute segments (parallel processing)
```

### Image Search (src/main.py)
```python
client = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options={'api_version': 'v1alpha'}
)

model='gemini-2.5-flash'  # Same model for consistency
```

## 🚀 How It Works

### Short Videos (<30 min) - 99% of cases
```
YouTube URL → Gemini analyzes directly → Results (30-60 sec)
```

### Long Videos (>30 min)
```
YouTube URL → Split into 20-min segments → Analyze 5 segments in parallel → Merge results (~3-4 min)
```

**No downloads, no yt-dlp, no cookies needed!**

## 💰 Cost Structure (20-min chunks)

- **Short video (10 min)**: $0.01 (1 API call)
- **Long video (100 min)**: $0.06 (6 API calls in parallel)
- **Monthly (100 videos avg 30 min)**: ~$3-5

**To use 10-min chunks for more detail:**
Change line 205: `CHUNK_DURATION_SECONDS = 10 * 60`
- Cost increases ~45% but provides more granular timestamps

## 🔧 Configuration Notes

- **v1alpha API**: Required for gemini-2.5-flash
- **gemini-2.5-flash**: Best balance of cost/performance/quality
- **Parallel processing**: Max 5 concurrent segments to avoid rate limits
- **Retry logic**: Auto-retry on 503/500 errors with exponential backoff

## 📝 Deployment

```bash
cd backend
gcloud run deploy video-safety-backend \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated
```

## ✅ Benefits Over Old yt-dlp Approach

- ✅ 5x faster (parallel processing)
- ✅ No cookie expiration issues
- ✅ No Cloud Run JS runtime errors
- ✅ Works for any video length
- ✅ More reliable and stable
