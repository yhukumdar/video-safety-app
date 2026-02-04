"""
Video Analysis Worker

This module processes pending video analysis reports by analyzing YouTube videos
using Google's Gemini AI model for child safety evaluation.
"""
import os
import sys
import json
import time
import subprocess
from datetime import datetime
from functools import wraps

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import service_supabase_client, GEMINI_API_KEY, YOUTUBE_API_KEY

# NEW SDK imports
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
import requests
import re
from datetime import timedelta

# Create Gemini client with v1alpha for media_resolution support
client = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options={'api_version': 'v1alpha'}
)

# Model name
MODEL_NAME = 'gemini-2.5-flash'

# Configurable constants
MAX_DURATION_FOR_FULL_ANALYSIS = 60 * 60  # 60 minutes in seconds - use chunking if video is longer (try direct analysis for most videos to avoid cookie dependency)
CHUNK_DURATION_SECONDS = 10 * 60  # 10 minutes per chunk (optimal balance of detail vs API calls)

def extract_video_id(youtube_url):
    """Extract video ID from YouTube URL"""
    try:
        if 'youtu.be/' in youtube_url:
            return youtube_url.split('youtu.be/')[1].split('?')[0]
        elif 'youtube.com/watch?v=' in youtube_url:
            return youtube_url.split('v=')[1].split('&')[0]
    except:
        pass
    return None

def parse_youtube_duration(duration_iso):
    """Parse ISO 8601 duration to seconds (e.g., PT1H2M10S -> 3730)"""
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration_iso)
    if not match:
        return None
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds

def get_video_metadata_api(video_id):
    """Get video metadata using official YouTube Data API v3 (STABLE - never breaks!)"""
    try:
        print(f"   📺 Fetching metadata from YouTube Data API (official)...")
        url = "https://www.googleapis.com/youtube/v3/videos"
        params = {
            "part": "snippet,contentDetails",
            "id": video_id,
            "key": YOUTUBE_API_KEY
        }
        response = requests.get(url, params=params, timeout=10)

        if response.status_code == 200:
            data = response.json()
            if data.get('items'):
                item = data['items'][0]
                title = item['snippet']['title']
                duration_iso = item['contentDetails']['duration']
                duration_seconds = parse_youtube_duration(duration_iso)

                print(f"   ✅ Title: {title}")
                print(f"   ✅ Duration: {duration_seconds}s ({duration_seconds//60}m {duration_seconds%60}s)")

                return {
                    'title': title,
                    'duration_seconds': duration_seconds
                }
        else:
            print(f"   ⚠️  YouTube API error: {response.status_code}")
    except Exception as e:
        print(f"   ⚠️  Could not fetch from YouTube API: {e}")
    return None

def get_video_duration(youtube_url):
    """Get video duration - uses official YouTube Data API (primary) with yt-dlp fallback"""
    video_id = extract_video_id(youtube_url)

    if video_id and YOUTUBE_API_KEY:
        # Try official API first (stable, won't break)
        metadata = get_video_metadata_api(video_id)
        if metadata and metadata.get('duration_seconds'):
            return metadata['duration_seconds']

    # Fallback to yt-dlp only if API fails
    print(f"   ⚠️  YouTube API unavailable, falling back to yt-dlp...")
    try:
        result = subprocess.run(
            ['yt-dlp', '--cookies', 'cookies.txt', '--get-duration', '--no-warnings', '--quiet', youtube_url],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            duration_str = result.stdout.strip()
            parts = duration_str.split(':')
            if len(parts) == 2:  # MM:SS
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:  # HH:MM:SS
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except Exception as e:
        print(f"   ⚠️  yt-dlp fallback failed: {e}")

    return None

def get_video_title(youtube_url):
    """Get video title - uses official YouTube Data API (primary) with yt-dlp fallback"""
    video_id = extract_video_id(youtube_url)

    if video_id and YOUTUBE_API_KEY:
        # Try official API first (stable, won't break)
        metadata = get_video_metadata_api(video_id)
        if metadata and metadata.get('title'):
            return metadata['title']

    # Fallback to yt-dlp only if API fails
    print(f"   ⚠️  YouTube API unavailable, falling back to yt-dlp...")
    try:
        result = subprocess.run(
            ['yt-dlp', '--cookies', 'cookies.txt', '--get-title', youtube_url],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            title = result.stdout.strip()
            if title:
                return title
    except Exception as e:
        print(f"   ⚠️  yt-dlp fallback failed: {e}")

    # Last resort: Use video ID
    if video_id:
        return f"YouTube Video ({video_id})"
    return "YouTube Video"

# Retry decorator for handling Gemini API overload errors
def retry_with_backoff(max_retries=4, base_delay=3):
    """
    Retry decorator for Gemini API with exponential backoff.
    Automatically retries when API returns 503 overloaded errors.
    
    Args:
        max_retries: Maximum number of retry attempts (default: 4)
        base_delay: Base delay in seconds, doubles each retry (default: 3s)
    
    Retry schedule: 3s -> 6s -> 12s -> 24s
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    result = func(*args, **kwargs)
                    if attempt > 0:
                        print(f"   ✅ Success on retry attempt {attempt + 1}")
                    return result
                except Exception as e:
                    error_str = str(e)
                    
                    # Check if it's a retryable error (500/503, overloaded, rate limit, internal)
                    is_retryable = (
                        '503' in error_str or
                        '500' in error_str or
                        'INTERNAL' in error_str or
                        'overloaded' in error_str.lower() or
                        'rate limit' in error_str.lower() or
                        'quota' in error_str.lower() or
                        'internal error' in error_str.lower()
                    )
                    
                    if is_retryable and attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt)
                        print(f"   ⚠️  Gemini API overloaded (attempt {attempt + 1}/{max_retries})")
                        print(f"   ⏳ Retrying in {delay} seconds...")
                        time.sleep(delay)
                        continue
                    else:
                        # Not retryable or max retries reached
                        print(f"   ❌ Failed: {error_str}")
                        raise
            
        return wrapper
    return decorator


def analyze_video_chunked(report_id, youtube_url, duration_seconds):
    """Analyze long videos by splitting into chunks"""
    import tempfile
    import shutil

    temp_dir = None
    try:
        # Fetch video title
        print(f"   📺 Fetching video title...")
        video_title = get_video_title(youtube_url)
        print(f"   ✅ Title: {video_title}")

        # Update status
        service_supabase_client.table('reports').update({
            'status': 'processing',
            'video_title': video_title
        }).eq('id', report_id).execute()

        # Create temp directory
        temp_dir = tempfile.mkdtemp()
        video_path = os.path.join(temp_dir, 'video.mp4')

        # Download video
        print(f"   ⬇️  Downloading video...")
        download_result = subprocess.run(
            ['yt-dlp', '--cookies', 'cookies.txt', '-f', 'worst', '-o', video_path, youtube_url],
            capture_output=True,
            text=True,
            timeout=600  # 10 minutes max
        )

        if download_result.returncode != 0:
            raise Exception(f"Failed to download video: {download_result.stderr}")

        print(f"   ✅ Downloaded: {os.path.getsize(video_path) / 1024 / 1024:.1f} MB")

        # Split into chunks using configurable duration
        chunk_duration = CHUNK_DURATION_SECONDS
        num_chunks = (duration_seconds // chunk_duration) + 1
        print(f"   ✂️  Splitting into {num_chunks} chunks of {chunk_duration/60:.0f} minutes each...")

        chunk_results = []
        for i in range(num_chunks):
            start_time = i * chunk_duration
            chunk_path = os.path.join(temp_dir, f'chunk_{i}.mp4')

            # Split chunk with ffmpeg
            split_result = subprocess.run(
                ['ffmpeg', '-ss', str(start_time), '-i', video_path, '-t', str(chunk_duration),
                 '-c', 'copy', chunk_path, '-y'],
                capture_output=True,
                timeout=300
            )

            if split_result.returncode != 0:
                print(f"   ⚠️  Failed to create chunk {i+1}, skipping...")
                continue

            print(f"   📤 Uploading chunk {i+1}/{num_chunks}...")

            # Upload to Gemini Files API
            with open(chunk_path, 'rb') as f:
                file_upload = client.files.upload(file=f)

            print(f"   🤖 Analyzing chunk {i+1}/{num_chunks}...")

            # Analyze chunk with detailed prompt
            chunk_start_time = i * CHUNK_DURATION_SECONDS
            prompt = f"""Analyze this video chunk ({i+1}/{num_chunks}) for child safety. Watch the ENTIRE chunk carefully.

This chunk starts at {chunk_start_time} seconds ({chunk_start_time//60}:{chunk_start_time%60:02d}) in the full video.

SCORING GUIDES:
- violence_score: 0-20=none/cartoon, 21-50=mild slapstick, 51-80=action violence, 81-100=graphic
- nsfw_score: 0-20=appropriate, 21-50=suggestive, 51-80=inappropriate, 81-100=explicit
- scary_score: 0-20=not scary, 21-40=tense, 41-60=monsters, 61-100=horror
- safety_score: 90-100=ages 5+, 70-89=ages 8+, 50-69=ages 11+, 30-49=ages 14+, 0-29=ages 17+
- profanity_detected: true ONLY if you HEAR profanity in audio

THEMES (only include what you ACTUALLY see):
educational, entertainment, religious, lgbtq, political, scary, romantic, action, musical, animated, live-action

SUMMARY - Provide a brief overview of this chunk WITHOUT timestamps. Just describe what happens in this part.

CONCERNS - CRITICAL REQUIREMENT: EVERY concern MUST have a timestamp in "at MM:SS" format FROM THE START OF THE FULL VIDEO!
Format EXACTLY: "Description at MM:SS"
Example: If violence happens 35 seconds into THIS chunk, report: "Violence at {(chunk_start_time + 35)//60}:{(chunk_start_time + 35)%60:02d}"

WRONG: "Character uses violent language"
CORRECT: "Character uses violent language at {chunk_start_time//60}:{chunk_start_time%60:02d}"

List up to 10 concerns. EVERY SINGLE ONE must have " at MM:SS" in it!

POSITIVE ASPECTS - CRITICAL REQUIREMENT: EVERY positive aspect MUST have a timestamp in "at MM:SS" format FROM THE START OF THE FULL VIDEO!
Format EXACTLY: "Description at MM:SS"
Example: If teaching moment happens 20 seconds into THIS chunk, report: "Teaches lesson at {(chunk_start_time + 20)//60}:{(chunk_start_time + 20)%60:02d}"

WRONG: "Educational content about animals"
CORRECT: "Educational content about animals at {chunk_start_time//60}:{chunk_start_time%60:02d}"

List up to 10 positive aspects. EVERY SINGLE ONE must have " at MM:SS" in it!

KEY MOMENTS - Identify key moments with timestamps (both concerns AND positive moments):
- timestamp_seconds: The exact time in seconds from the START OF THE FULL VIDEO (add {chunk_start_time} to the time within this chunk)
- timestamp_display: The timestamp in MM:SS format from the start of the full video
- type: The category (violence, scary, nsfw, profanity, educational, positive)
- description: What happens at this moment (max 150 chars)
- severity: low, moderate, or high

For example, if you see violence at 35 seconds into THIS CHUNK, the full video timestamp is {chunk_start_time} + 35 = {chunk_start_time + 35} seconds.

REMINDER: DO NOT submit concerns or positive_aspects without timestamps! Every item MUST have " at MM:SS" format!"""

            # Response schema for chunks (same as direct analysis)
            chunk_schema = {
                "type": "object",
                "properties": {
                    "safety_score": {"type": "integer", "minimum": 0, "maximum": 100},
                    "violence_score": {"type": "integer", "minimum": 0, "maximum": 100},
                    "nsfw_score": {"type": "integer", "minimum": 0, "maximum": 100},
                    "scary_score": {"type": "integer", "minimum": 0, "maximum": 100},
                    "profanity_detected": {"type": "boolean"},
                    "themes": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
                    "concerns": {"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 10},
                    "positive_aspects": {"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 10},
                    "summary": {"type": "string", "maxLength": 300},
                    "explanation": {"type": "string", "maxLength": 300},
                    "recommendations": {"type": "string", "maxLength": 200},
                    "key_moments": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "timestamp_seconds": {"type": "integer", "minimum": 0},
                                "timestamp_display": {"type": "string"},
                                "type": {"type": "string", "enum": ["violence", "scary", "nsfw", "profanity", "educational", "positive"]},
                                "description": {"type": "string", "maxLength": 150},
                                "severity": {"type": "string", "enum": ["low", "moderate", "high"]}
                            },
                            "required": ["timestamp_seconds", "timestamp_display", "type", "description", "severity"]
                        },
                        "maxItems": 10
                    }
                },
                "required": ["safety_score", "violence_score", "nsfw_score", "scary_score",
                            "profanity_detected", "themes", "concerns", "positive_aspects",
                            "summary", "explanation", "recommendations", "key_moments"]
            }

            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=[file_upload, prompt],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    media_resolution=types.MediaResolution.MEDIA_RESOLUTION_LOW,
                    response_mime_type="application/json",
                    response_schema=chunk_schema
                )
            )

            # Parse response
            response_text = response.text.strip().replace('```json', '').replace('```', '').strip()
            try:
                chunk_result = json.loads(response_text)
                chunk_results.append(chunk_result)
                print(f"   ✅ Chunk {i+1} analyzed")
            except:
                print(f"   ⚠️  Failed to parse chunk {i+1} results")

            # Clean up chunk
            os.remove(chunk_path)

        # Merge results from all chunks
        print(f"   🔄 Merging results from {len(chunk_results)} chunks...")
        merged_result = merge_chunk_results(chunk_results)

        # Save to database
        age_recommendation = calculate_age_recommendation(
            merged_result['violence_score'],
            merged_result['scary_score'],
            merged_result['nsfw_score'],
            merged_result['profanity_detected']
        )
        merged_result['age_recommendation'] = age_recommendation

        service_supabase_client.table('reports').update({
            'status': 'completed',
            'safety_score': merged_result['safety_score'],
            'violence_score': merged_result['violence_score'],
            'nsfw_score': merged_result['nsfw_score'],
            'scary_score': merged_result['scary_score'],
            'profanity_detected': merged_result['profanity_detected'],
            'analysis_result': merged_result,
            'analyzed_at': datetime.now().isoformat()
        }).eq('id', report_id).execute()

        print(f"   ✅ Chunked analysis complete!")
        print(f"   📊 Safety: {merged_result['safety_score']}/100")

    except Exception as e:
        error_str = str(e)
        print(f"   ❌ Chunked analysis failed: {error_str}")
        import traceback
        traceback.print_exc()

        # If download failed (cookies expired), re-raise so caller can try direct analysis
        if 'download' in error_str.lower() or 'cookies' in error_str.lower():
            print(f"   🔄 Re-raising download error for direct analysis fallback...")
            raise

        # For other errors (chunk analysis failures), mark as failed
        service_supabase_client.table('reports').update({
            'status': 'failed',
            'error_message': error_str
        }).eq('id', report_id).execute()

    finally:
        # Clean up temp directory
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)


def merge_chunk_results(chunk_results):
    """Merge analysis results from multiple chunks"""
    if not chunk_results:
        return {
            'safety_score': 50,
            'violence_score': 0,
            'nsfw_score': 0,
            'scary_score': 0,
            'profanity_detected': False,
            'themes': [],
            'concerns': [],
            'positive_aspects': [],
            'summary': 'Analysis failed',
            'explanation': 'No chunks analyzed',
            'recommendations': 'Unable to provide recommendations',
            'key_moments': []
        }

    # Average scores, but take MAX for safety-critical metrics
    avg_safety = sum(c.get('safety_score', 50) for c in chunk_results) / len(chunk_results)
    max_violence = max(c.get('violence_score', 0) for c in chunk_results)
    max_nsfw = max(c.get('nsfw_score', 0) for c in chunk_results)
    max_scary = max(c.get('scary_score', 0) for c in chunk_results)
    any_profanity = any(c.get('profanity_detected', False) for c in chunk_results)

    # Merge unique themes and concerns
    all_themes = set()
    all_concerns = []
    all_positive = []
    all_key_moments = []

    for chunk in chunk_results:
        all_themes.update(chunk.get('themes', []))
        all_concerns.extend(chunk.get('concerns', []))
        all_positive.extend(chunk.get('positive_aspects', []))
        all_key_moments.extend(chunk.get('key_moments', []))

    # Extract timestamps from concerns/positive and sort them chronologically
    def extract_timestamp(text):
        """Extract timestamp in seconds from text like 'Something at 2:35'"""
        import re
        match = re.search(r'at (\d+):(\d+)', text)
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            return minutes * 60 + seconds
        return 0

    # Sort concerns and positive by timestamp, keep all (not just 5)
    sorted_concerns = sorted(all_concerns, key=extract_timestamp)[:10]  # Keep top 10
    sorted_positive = sorted(all_positive, key=extract_timestamp)[:10]  # Keep top 10

    # Sort key moments by timestamp and keep top 10
    sorted_key_moments = sorted(all_key_moments, key=lambda m: m.get('timestamp_seconds', 0))[:10]

    # Create summary from first chunk (without generic message)
    summary = chunk_results[0].get('summary', 'Video analyzed in multiple parts') if chunk_results else 'Video analyzed'
    if 'Video content analyzed' in summary or len(summary) < 10:
        summary = f'Long video analyzed in {len(chunk_results)} parts - see concerns and positive aspects with timestamps below'

    return {
        'safety_score': int(avg_safety),
        'violence_score': max_violence,
        'nsfw_score': max_nsfw,
        'scary_score': max_scary,
        'profanity_detected': any_profanity,
        'themes': list(all_themes),
        'concerns': sorted_concerns,
        'positive_aspects': sorted_positive,
        'summary': summary,
        'explanation': f'Max violence: {max_violence}, NSFW: {max_nsfw}, Scary: {max_scary}',
        'recommendations': 'Review all concerns carefully for long videos',
        'key_moments': sorted_key_moments
    }


def calculate_age_recommendation(violence_score, scary_score, nsfw_score, profanity):
    """Calculate minimum recommended age based on content scores"""
    min_age = 3

    if nsfw_score > 60: min_age = max(min_age, 18)
    elif nsfw_score > 40: min_age = max(min_age, 16)
    elif nsfw_score > 20: min_age = max(min_age, 13)
    elif nsfw_score > 10: min_age = max(min_age, 10)

    if violence_score > 70: min_age = max(min_age, 13)
    elif violence_score > 50: min_age = max(min_age, 10)
    elif violence_score > 30: min_age = max(min_age, 7)
    elif violence_score > 15: min_age = max(min_age, 5)

    if scary_score > 70: min_age = max(min_age, 13)
    elif scary_score > 50: min_age = max(min_age, 10)
    elif scary_score > 30: min_age = max(min_age, 7)
    elif scary_score > 15: min_age = max(min_age, 5)

    if profanity: min_age = max(min_age, 10)

    return min_age


def analyze_video(report_id, youtube_url):
    """Analyze a YouTube video - uses chunking for 30+ minute videos"""

    try:
        print(f"   🎥 Video URL: {youtube_url}")
        print(f"   🆔 Report ID: {report_id}")

        # Check video duration first
        print(f"   ⏱️  Checking video duration...")
        duration_seconds = get_video_duration(youtube_url)
        if duration_seconds:
            duration_minutes = duration_seconds / 60
            print(f"   📏 Duration: {duration_minutes:.1f} minutes ({duration_seconds}s)")

            # Use chunking for videos longer than MAX_DURATION_FOR_FULL_ANALYSIS
            if duration_seconds > MAX_DURATION_FOR_FULL_ANALYSIS:
                num_chunks = (duration_seconds // CHUNK_DURATION_SECONDS) + 1
                print(f"   🔄 Video exceeds {MAX_DURATION_FOR_FULL_ANALYSIS/60:.0f} minutes - trying chunked analysis first")
                print(f"   ✂️  Will split into {num_chunks} chunks of {CHUNK_DURATION_SECONDS/60:.0f} minutes each")
                try:
                    return analyze_video_chunked(report_id, youtube_url, duration_seconds)
                except Exception as chunked_error:
                    # If chunked fails (e.g., cookie expired), fall back to direct Gemini analysis
                    # Gemini can sometimes handle videos >60min directly via URL
                    print(f"   ⚠️  Chunked analysis failed: {str(chunked_error)}")
                    print(f"   🔄 Falling back to direct Gemini analysis (may work for videos up to ~2hrs)...")
                    # Reset status to processing for the direct analysis attempt
                    service_supabase_client.table('reports').update({
                        'status': 'processing',
                        'error_message': None
                    }).eq('id', report_id).execute()
                    # Continue to direct analysis below
        else:
            print(f"   ⚠️  Duration detection failed - will try direct analysis first")

        # Fetch video title
        print(f"   📺 Fetching video title...")
        video_title = get_video_title(youtube_url)
        print(f"   ✅ Title: {video_title}")

        # Update status to processing
        print(f"   📝 Updating status to 'processing'...")
        service_supabase_client.table('reports').update({
            'status': 'processing',
            'video_title': video_title
        }).eq('id', report_id).execute()

        # Full prompt for complete analysis
        prompt = """Analyze this video for child safety. Watch the ENTIRE video carefully.

SCORING GUIDES:
- violence_score: 0-20=none/cartoon, 21-50=mild slapstick, 51-80=action violence, 81-100=graphic
- nsfw_score: 0-20=appropriate, 21-50=suggestive, 51-80=inappropriate, 81-100=explicit
- scary_score: 0-20=not scary, 21-40=tense, 41-60=monsters, 61-100=horror
- safety_score: 90-100=ages 5+, 70-89=ages 8+, 50-69=ages 11+, 30-49=ages 14+, 0-29=ages 17+
- profanity_detected: true ONLY if you HEAR profanity in audio

THEMES (only include what you ACTUALLY see):
educational, entertainment, religious, lgbtq, political, scary, romantic, action, musical, animated, live-action

SUMMARY - Provide a brief overview of the video WITHOUT timestamps. Just describe what the video is about.

CONCERNS - CRITICAL REQUIREMENT: EVERY concern MUST have a timestamp in "at MM:SS" format!
Format EXACTLY like this: "Description at 2:35"
WRONG: "Slapstick moments where characters almost crash"
CORRECT: "Slapstick moments at 2:35"
WRONG: "Child is scared by facial expressions"
CORRECT: "Child scared by facial expressions at 5:12"

Examples:
- "Character uses violent language at 2:35"
- "Scary monster appears at 5:12"
- "Inappropriate joke at 8:20"

List up to 10 concerns. EVERY SINGLE ONE must have " at MM:SS" in it!

POSITIVE ASPECTS - CRITICAL REQUIREMENT: EVERY positive aspect MUST have a timestamp in "at MM:SS" format!
Format EXACTLY like this: "Description at 2:35"
WRONG: "Highlights the importance of helping others"
CORRECT: "Highlights helping others at 3:45"
WRONG: "Strong themes of courage"
CORRECT: "Shows courage at 7:20"

Examples:
- "Teaches sharing at 1:45"
- "Beautiful music at 3:20"
- "Educational fact at 9:10"

List up to 10 positive aspects. EVERY SINGLE ONE must have " at MM:SS" in it!

KEY MOMENTS - Identify 5-10 key moments with timestamps (both concerns AND positive moments):
- timestamp_seconds: The exact time in seconds from the start of the video
- timestamp_display: The timestamp in MM:SS format (e.g., "2:35" for 2 minutes 35 seconds)
- type: The category (violence, scary, nsfw, profanity, educational, positive)
- description: What happens at this moment (max 150 chars)
- severity: low, moderate, or high

For example, if you see violence at 155 seconds (2:35), record: timestamp_seconds=155, timestamp_display="2:35", type="violence", description="Character hits another with hammer", severity="moderate"

REMINDER: DO NOT submit concerns or positive_aspects without timestamps! Every item MUST have " at MM:SS" format!"""

        # Response schema with maximum safe limits (tested to prevent truncation)
        response_schema = {
            "type": "object",
            "properties": {
                "safety_score": {"type": "integer", "minimum": 0, "maximum": 100},
                "violence_score": {"type": "integer", "minimum": 0, "maximum": 100},
                "nsfw_score": {"type": "integer", "minimum": 0, "maximum": 100},
                "scary_score": {"type": "integer", "minimum": 0, "maximum": 100},
                "profanity_detected": {"type": "boolean"},
                "themes": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
                "concerns": {"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 10},
                "positive_aspects": {"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 10},
                "summary": {"type": "string", "maxLength": 300},
                "explanation": {"type": "string", "maxLength": 300},
                "recommendations": {"type": "string", "maxLength": 200},
                "key_moments": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "timestamp_seconds": {"type": "integer", "minimum": 0},
                            "timestamp_display": {"type": "string"},
                            "type": {"type": "string", "enum": ["violence", "scary", "nsfw", "profanity", "educational", "positive"]},
                            "description": {"type": "string", "maxLength": 150},
                            "severity": {"type": "string", "enum": ["low", "moderate", "high"]}
                        },
                        "required": ["timestamp_seconds", "timestamp_display", "type", "description", "severity"]
                    },
                    "maxItems": 10
                }
            },
            "required": ["safety_score", "violence_score", "nsfw_score", "scary_score",
                        "profanity_detected", "themes", "concerns", "positive_aspects",
                        "summary", "explanation", "recommendations", "key_moments"]
        }

        # Analyze directly from YouTube URL
        print(f"   🤖 Analyzing with Gemini AI...")

        @retry_with_backoff(max_retries=4, base_delay=3)
        def call_gemini_api():
            return client.models.generate_content(
                model=MODEL_NAME,
                contents=types.Content(
                    parts=[
                        types.Part(
                            file_data=types.FileData(
                                file_uri=youtube_url,
                                mime_type='video/mp4'
                            )
                        ),
                        types.Part(text=prompt)
                    ]
                ),
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    top_p=0.7,
                    top_k=20,
                    max_output_tokens=8192,  # Long videos need more tokens for concerns/positive arrays
                    media_resolution=types.MediaResolution.MEDIA_RESOLUTION_LOW,
                    response_mime_type="application/json",
                    response_schema=response_schema
                )
            )

        # Call Gemini
        print(f"   📡 Calling Gemini API...")
        response = call_gemini_api()
        print(f"   ✅ Gemini API call succeeded!")

        # Check if response has content
        if not response.text:
            print(f"   ❌ Empty response - video may be restricted")
            raise Exception("Gemini returned empty response - video may be age-restricted or unavailable")

        # Parse JSON with error handling
        print(f"   📄 Response length: {len(response.text)} chars")
        print(f"   📄 Response preview: {response.text[:500]}...")

        try:
            result = json.loads(response.text)
            print(f"   ✅ JSON parsed successfully")
        except json.JSONDecodeError as e:
            print(f"   ❌ JSON Parse Error: {str(e)}")
            print(f"   📄 Response preview (first 1000 chars): {response.text[:1000]}")

            # Helper: extract a string array from malformed JSON text (last resort)
            def extract_string_array(text, key):
                """Extract ["str1", "str2", ...] for a given key from malformed JSON"""
                pattern = rf'"{key}"\s*:\s*\['
                match = re.search(pattern, text)
                if not match:
                    return []
                start = match.end()
                depth = 1
                pos = start
                while pos < len(text) and depth > 0:
                    if text[pos] == '[': depth += 1
                    elif text[pos] == ']': depth -= 1
                    pos += 1
                array_text = text[start:pos-1] if depth == 0 else text[start:]
                return re.findall(r'"((?:[^"\\]|\\.)*)"', array_text)

            import re

            # Level 1: Use json-repair library (handles unterminated strings, missing commas, etc.)
            try:
                from json_repair import repair_json
                repaired = repair_json(response.text, return_objects=True)
                if isinstance(repaired, dict) and 'safety_score' in repaired:
                    result = repaired
                    print(f"   ✅ JSON repaired successfully via json-repair")
                else:
                    raise ValueError("Repaired JSON missing required fields")
            except Exception as repair_err:
                print(f"   ⚠️  json-repair fallback: {str(repair_err)}")

                # Level 2: Regex extraction of all fields from raw text
                try:
                    violence = re.search(r'"violence_score":\s*(\d+)', response.text)
                    nsfw = re.search(r'"nsfw_score":\s*(\d+)', response.text)
                    scary = re.search(r'"scary_score":\s*(\d+)', response.text)
                    safety = re.search(r'"safety_score":\s*(\d+)', response.text)
                    profanity = re.search(r'"profanity_detected":\s*(true|false)', response.text)
                    summary_match = re.search(r'"summary":\s*"((?:[^"\\]|\\.)*)"', response.text)

                    concerns = extract_string_array(response.text, 'concerns')
                    positive_aspects = extract_string_array(response.text, 'positive_aspects')
                    themes = extract_string_array(response.text, 'themes')

                    print(f"   📊 Regex extracted: {len(concerns)} concerns, {len(positive_aspects)} positives, {len(themes)} themes")

                    if not concerns:
                        concerns = ["See safety scores above for content assessment"]

                    if violence and nsfw and scary and safety:
                        print(f"   ✅ Extracted full data via regex fallback")
                        result = {
                            "safety_score": int(safety.group(1)),
                            "violence_score": int(violence.group(1)),
                            "nsfw_score": int(nsfw.group(1)),
                            "scary_score": int(scary.group(1)),
                            "profanity_detected": profanity.group(1) == 'true' if profanity else False,
                            "themes": themes,
                            "concerns": concerns,
                            "positive_aspects": positive_aspects,
                            "summary": summary_match.group(1) if summary_match else "Video analyzed - see details below",
                            "key_moments": []
                        }
                    else:
                        raise Exception("Could not extract basic scores")
                except Exception as extract_err:
                    print(f"   ⚠️  Regex extraction error: {str(extract_err)}")
                    result = {
                        "safety_score": 50,
                        "violence_score": 0,
                        "nsfw_score": 0,
                        "scary_score": 0,
                        "profanity_detected": False,
                        "themes": [],
                        "concerns": ["Unable to fully analyze - API response error"],
                        "positive_aspects": [],
                        "summary": "Analysis incomplete due to technical error",
                        "key_moments": []
                    }

        # Extract and validate scores
        safety_score = max(0, min(100, int(result.get('safety_score', 50))))
        violence_score = max(0, min(100, int(result.get('violence_score', 0))))
        nsfw_score = max(0, min(100, int(result.get('nsfw_score', 0))))
        scary_score = max(0, min(100, int(result.get('scary_score', 0))))
        profanity_detected = bool(result.get('profanity_detected', False))

        # Ensure arrays exist
        result.setdefault('themes', [])
        result.setdefault('concerns', [])
        result.setdefault('positive_aspects', [])
        result.setdefault('timestamps', [])

        # Calculate age recommendation
        age_recommendation = calculate_age_recommendation(
            violence_score,
            scary_score,
            nsfw_score,
            profanity_detected
        )
        result['age_recommendation'] = age_recommendation

        print(f"   ✅ Analysis complete!")
        print(f"   📊 Safety: {safety_score}/100, Age: {age_recommendation}+")

        # Save to database
        service_supabase_client.table('reports').update({
            'status': 'completed',
            'safety_score': safety_score,
            'violence_score': violence_score,
            'nsfw_score': nsfw_score,
            'scary_score': scary_score,
            'profanity_detected': profanity_detected,
            'analysis_result': result,
            'analyzed_at': datetime.now().isoformat()
        }).eq('id', report_id).execute()

        print(f"   ✅ Saved to database!")

    except Exception as e:
        print(f"   ❌ Failed: {str(e)}")
        import traceback
        print(traceback.format_exc())
        
        try:
            service_supabase_client.table('reports').update({
                'status': 'failed',
                'error_message': str(e)
            }).eq('id', report_id).execute()
        except:
            pass

def process_pending_reports():
    """Query and process all pending reports"""
    try:
        print(f"   🔍 Querying database for pending reports...")
        print(f"   🔗 Supabase URL: {service_supabase_client.supabase_url}")

        # Reset stale 'processing' reports (stuck >15 min) back to 'pending'
        stale_cutoff = (datetime.now() - timedelta(minutes=15)).isoformat()
        stale_result = service_supabase_client.table('reports').update({
            'status': 'pending',
            'error_message': 'Reset: was stuck in processing for >15 min'
        }).eq('status', 'processing').lt('updated_at', stale_cutoff).execute()
        if stale_result.data:
            print(f"   🔄 Reset {len(stale_result.data)} stale processing report(s) to pending")

        # Query pending reports
        result = service_supabase_client.table('reports').select('*').eq('status', 'pending').execute()

        reports = result.data if result.data else []

        print(f"   📊 Query result: {len(reports)} report(s) found")

        # Debug: Query ALL reports to see what's there
        all_reports = service_supabase_client.table('reports').select('id,status,created_at').order('created_at', desc=True).limit(5).execute()
        print(f"   🔍 Last 5 reports (any status): {all_reports.data}")

        if not reports:
            print(f"   💤 No pending reports to process")
            return 0

        print(f"\n{'='*60}")
        print(f"📋 FOUND {len(reports)} PENDING REPORT(S)")
        print(f"{'='*60}\n")

        # Process each report
        for idx, report in enumerate(reports, 1):
            print(f"\n{'='*60}")
            print(f"[{idx}/{len(reports)}] PROCESSING REPORT")
            print(f"{'='*60}")
            print(f"   📝 Filename: {report['filename']}")
            print(f"   🆔 Report ID: {report['id']}")
            print(f"   🔗 URL: {report['video_url']}")
            print(f"   ⏰ Created: {report.get('created_at', 'unknown')}")
            print()

            analyze_video(report['id'], report['video_url'])

            # Small delay between videos
            if idx < len(reports):
                print(f"\n⏸️  Waiting 2 seconds before next video...")
                time.sleep(2)

        print(f"\n{'='*60}")
        print(f"✅ COMPLETED PROCESSING {len(reports)} REPORT(S)")
        print(f"{'='*60}\n")

        return len(reports)
        
    except Exception as e:
        print(f"❌ Error in process_pending_reports: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return 0

def main():
    """Main function - runs continuously"""
    print("=" * 60)
    print("🤖 VIDEO ANALYSIS WORKER STARTED")
    print("=" * 60)
    print(f"⏰ Checking for pending videos every 30 seconds")
    print(f"🛑 Press Ctrl+C to stop")
    print("=" * 60)
    print()
    
    check_count = 0
    
    while True:
        try:
            check_count += 1
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            print(f"\n[Check #{check_count}] {current_time}")
            print("-" * 60)
            
            # Process pending reports
            result = process_pending_reports()
            
            if result > 0:
                print(f"✅ Processed {result} video(s)")
            else:
                print(f"💤 No pending videos found")
            
            print(f"⏳ Waiting 30 seconds before next check...")
            print("-" * 60)
            
            time.sleep(30)  # Wait 30 seconds
            
        except KeyboardInterrupt:
            print("\n" + "=" * 60)
            print("🛑 Worker stopped by user (Ctrl+C)")
            print("=" * 60)
            break
            
        except Exception as e:
            print(f"\n❌ ERROR in main loop:")
            print(f"   {str(e)}")
            import traceback
            print(traceback.format_exc())
            print(f"⏳ Waiting 30 seconds before retry...")
            time.sleep(30)

if __name__ == "__main__":
    main()

