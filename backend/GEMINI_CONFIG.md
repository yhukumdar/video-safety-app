# 🔒 WORKING GEMINI CONFIGURATION - DO NOT CHANGE

**Last Updated:** February 2, 2026
**Status:** ✅ WORKING IN PRODUCTION

## ⚠️ CRITICAL: Both features MUST use the same configuration

### Video Analysis (src/workers/video_analyzer.py)
```python
# Line 26-29
client = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options={'api_version': 'v1alpha'}  # MUST be v1alpha!
)

# Line 32
MODEL_NAME = 'gemini-2.5-flash'  # MUST be this exact model
```

### Image Search (src/main.py)
```python
# Line 475-478
client = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options={'api_version': 'v1alpha'}  # MUST match video analyzer!
)

# Line 495
model='gemini-2.5-flash'  # MUST match video analyzer!
```

## 🚫 DO NOT USE:
- ❌ `api_version: 'v1beta'` - Doesn't support these models
- ❌ `gemini-1.5-flash` - Not available in v1alpha
- ❌ `gemini-1.5-flash-001` - Not available
- ❌ `gemini-1.5-pro` - More expensive, unnecessary
- ❌ `gemini-2.0-flash-exp` - Not found in v1alpha

## ✅ WHY THIS WORKS:
- **v1alpha API**: Has access to latest Gemini 2.5 models
- **gemini-2.5-flash**: Supports both video AND image analysis
- **Cost-effective**: Flash pricing ($0.00001875/sec for video, $0.00125/image)
- **Stable**: Works consistently in production

## 💰 Cost Structure:
- **Video (10 min)**: ~$0.02
- **Image search**: ~$0.00125 per image
- **Monthly (100 videos + 50 images)**: ~$2-5

## 🧪 Testing:
Always test changes locally first:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python scripts/start.py
```

## 📝 Deployment:
```bash
gcloud run deploy video-safety-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --platform managed \
  --clear-base-image
```
