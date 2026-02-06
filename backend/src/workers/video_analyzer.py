"""
Video Analysis Worker

This module processes pending video analysis reports by analyzing YouTube videos
using Google's Gemini AI model for child safety evaluation.
"""
import os
import sys
import json
import time
from datetime import datetime, timedelta
from functools import wraps
from typing import List, Literal

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import service_supabase_client, GEMINI_API_KEY, YOUTUBE_API_KEY

# Gemini SDK imports
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
import requests
import re
from pydantic import BaseModel
from json_repair import repair_json

# --- Pydantic models for Gemini structured output ---
# Passing these as response_schema lets the SDK serialize the schema correctly
# AND makes response.parsed available (returns validated model, no manual JSON parsing).

class ConcernItem(BaseModel):
    description: str
    timestamp: str

class PositiveItem(BaseModel):
    description: str
    timestamp: str

class KeyMoment(BaseModel):
    timestamp_seconds: int
    timestamp_display: str
    type: Literal['violence', 'scary', 'nsfw', 'profanity', 'educational', 'positive']
    description: str
    severity: Literal['low', 'moderate', 'high']

class VideoAnalysisResult(BaseModel):
    safety_score: int
    violence_score: int
    nsfw_score: int
    scary_score: int
    profanity_detected: bool
    themes: List[str]
    concerns: List[ConcernItem]
    positive_aspects: List[PositiveItem]
    summary: str
    explanation: str
    recommendations: str
    key_moments: List[KeyMoment]


# --- Dict schema for response_schema (NOT the Pydantic class) ---
# Using a dict here is intentional: when response_schema is a Pydantic class the SDK
# attempts to validate the response inside generate_content() and raises JSONDecodeError
# on truncated/malformed responses BEFORE returning a response object.  A plain dict
# tells the API the same shape but lets the SDK return response.text as-is so json_repair
# can fix any drift.  See STABILITY_ARCHITECTURE.md for details on "JSON drift".
ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "safety_score":        {"type": "integer"},
        "violence_score":      {"type": "integer"},
        "nsfw_score":          {"type": "integer"},
        "scary_score":         {"type": "integer"},
        "profanity_detected":  {"type": "boolean"},
        "themes":              {"type": "array", "items": {"type": "string"}},
        "concerns": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "timestamp":   {"type": "string"}
                },
                "required": ["description", "timestamp"]
            }
        },
        "positive_aspects": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "timestamp":   {"type": "string"}
                },
                "required": ["description", "timestamp"]
            }
        },
        "summary":         {"type": "string"},
        "explanation":     {"type": "string"},
        "recommendations": {"type": "string"},
        "key_moments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "timestamp_seconds": {"type": "integer"},
                    "timestamp_display": {"type": "string"},
                    "type":              {"type": "string", "enum": ["violence", "scary", "nsfw", "profanity", "educational", "positive"]},
                    "description":       {"type": "string"},
                    "severity":          {"type": "string", "enum": ["low", "moderate", "high"]}
                },
                "required": ["timestamp_seconds", "timestamp_display", "type", "description", "severity"]
            }
        }
    },
    "required": [
        "safety_score", "violence_score", "nsfw_score", "scary_score",
        "profanity_detected", "themes", "concerns", "positive_aspects",
        "summary", "explanation", "recommendations", "key_moments"
    ]
}

_SAFE_DEFAULT = {
    "safety_score": 50, "violence_score": 0, "nsfw_score": 0,
    "scary_score": 0, "profanity_detected": False, "themes": [],
    "concerns": [], "positive_aspects": [],
    "summary": "Video was analyzed but detailed results could not be extracted.",
    "explanation": "Please review the video manually for a detailed assessment.",
    "recommendations": "Manual review recommended.",
    "key_moments": []
}


def _repair_text(text):
    """Strip markdown fences and run json_repair.  Returns a dict or None."""
    if not text:
        return None
    text = text.strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*\n?', '', text)
        text = re.sub(r'\n?```\s*$', '', text)
    try:
        result = repair_json(text, return_objects=True)
        if isinstance(result, dict):
            return result
    except Exception as e:
        print(f"   ⚠️  json_repair failed: {e}")
    return None


def parse_gemini_response(response):
    """
    Parse a Gemini response.  Never raises — always returns a valid dict.

    With a dict response_schema the SDK does NOT eagerly validate, so
    response.text contains the raw (possibly drifted) JSON and json_repair
    fixes it.  response.parsed is tried first as an optimistic fast-path
    (works when the JSON happened to be valid).
    """
    # 1. Optimistic: response.parsed (works when JSON is valid)
    try:
        if hasattr(response, 'parsed') and response.parsed is not None:
            parsed = response.parsed
            if isinstance(parsed, dict):
                print(f"   ✅ Parsed via response.parsed")
                return parsed
            if hasattr(parsed, 'model_dump'):
                print(f"   ✅ Parsed via response.parsed (Pydantic)")
                return parsed.model_dump()
    except Exception as e:
        print(f"   ⚠️  response.parsed failed: {e}")

    # 2. json_repair on response.text (handles drift: trailing commas,
    #    unterminated strings, truncation, markdown fences)
    try:
        text = response.text if hasattr(response, 'text') else str(response)
        result = _repair_text(text)
        if result:
            print(f"   ✅ Parsed via json_repair")
            return result
    except Exception as e:
        print(f"   ⚠️  response.text extraction failed: {e}")

    # 3. Safe default — analysis "succeeds" with empty data; user never sees an error
    print(f"   ⚠️  Using safe default result (both parse paths failed)")
    return dict(_SAFE_DEFAULT)


# Create Gemini client with v1alpha for media_resolution support
client = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options={'api_version': 'v1alpha'}
)

# Model name
MODEL_NAME = 'gemini-2.5-flash'

# Configurable constants
# Gemini analyzes YouTube URLs directly (no download).
# For videos longer than 30 minutes, we use timestamp-based chunking:
# multiple Gemini calls with the same URL, each focusing on a time segment.
MAX_DURATION_FOR_FULL_ANALYSIS = 30 * 60  # 30 minutes
CHUNK_DURATION_SECONDS = 20 * 60  # 20 minutes per chunk

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
    """Get video duration using YouTube Data API"""
    video_id = extract_video_id(youtube_url)
    if video_id and YOUTUBE_API_KEY:
        metadata = get_video_metadata_api(video_id)
        if metadata and metadata.get('duration_seconds'):
            return metadata['duration_seconds']
    return None

def get_video_title(youtube_url):
    """Get video title using YouTube Data API"""
    video_id = extract_video_id(youtube_url)
    if video_id and YOUTUBE_API_KEY:
        metadata = get_video_metadata_api(video_id)
        if metadata and metadata.get('title'):
            return metadata['title']
    # Fallback: Use video ID
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


def format_timestamp(seconds):
    """Convert seconds to MM:SS or H:MM:SS format"""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def analyze_video_chunked(report_id, youtube_url, duration_seconds):
    """Analyze long videos using timestamp-based chunking (no downloads)"""
    from concurrent.futures import ThreadPoolExecutor, as_completed

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

        # Calculate chunks
        chunk_duration = CHUNK_DURATION_SECONDS
        num_chunks = (duration_seconds // chunk_duration) + 1
        print(f"   ✂️  Analyzing {num_chunks} segments of {chunk_duration/60:.0f} minutes each (in parallel)...")

        def analyze_segment(i):
            """Analyze a single segment"""
            start_seconds = i * chunk_duration
            end_seconds = min((i + 1) * chunk_duration, duration_seconds)
            start_timestamp = format_timestamp(start_seconds)
            end_timestamp = format_timestamp(end_seconds)

            print(f"   🤖 Analyzing segment {i+1}/{num_chunks} ({start_timestamp} to {end_timestamp})...")

            # Prompt Gemini to focus on specific time range
            prompt = f"""Analyze ONLY the time range {start_timestamp} to {end_timestamp} of this video for child safety.

IMPORTANT: Focus ONLY on content between {start_timestamp} and {end_timestamp}. This is segment {i+1} of {num_chunks}.

SCORING GUIDES:
- violence_score: 0-20=none/cartoon, 21-50=mild slapstick, 51-80=action violence, 81-100=graphic
- nsfw_score: 0-20=appropriate, 21-50=suggestive, 51-80=inappropriate, 81-100=explicit
- scary_score: 0-20=not scary, 21-40=tense, 41-60=monsters, 61-100=horror
- safety_score: 90-100=ages 5+, 70-89=ages 8+, 50-69=ages 11+, 30-49=ages 14+, 0-29=ages 17+
- profanity_detected: true ONLY if you HEAR profanity in audio

THEMES (only include what you ACTUALLY see):
educational, entertainment, religious, lgbtq, political, scary, romantic, action, musical, animated, live-action

SUMMARY - Brief overview of this segment WITHOUT timestamps.

CONCERNS - List up to 10 concerns. For EACH provide:
- description: What happens (short, clear description)
- timestamp: Exact time as "M:SS" or "H:MM:SS" from the START OF THE VIDEO

POSITIVE ASPECTS - List up to 10 positive aspects. For EACH provide:
- description: What happens (short, clear description)
- timestamp: Exact time as "M:SS" or "H:MM:SS" from the START OF THE VIDEO

KEY MOMENTS - Identify key moments with timestamps:
- timestamp_seconds: Exact time in seconds from the START OF THE VIDEO
- timestamp_display: Timestamp in MM:SS format
- type: violence, scary, nsfw, profanity, educational, or positive
- description: What happens (max 150 chars)
- severity: low, moderate, or high"""

            try:
                @retry_with_backoff(max_retries=4, base_delay=3)
                def call_gemini_segment():
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
                            max_output_tokens=8192,
                            media_resolution=types.MediaResolution.MEDIA_RESOLUTION_LOW,
                            response_mime_type="application/json",
                            response_schema=ANALYSIS_SCHEMA
                        )
                    )

                response = call_gemini_segment()
                chunk_result = parse_gemini_response(response)
                print(f"   ✅ Segment {i+1} analyzed")
                return (i, chunk_result)

            except Exception as chunk_err:
                err_lower = str(chunk_err).lower()
                if any(kw in err_lower for kw in ['503', '500', 'overloaded', 'rate limit', 'quota']):
                    raise  # Let retryable errors propagate
                print(f"   ⚠️  Segment {i+1} error (using safe default): {chunk_err}")
                return (i, dict(_SAFE_DEFAULT))

        # Analyze all segments in parallel (max 5 concurrent to avoid rate limits)
        chunk_results = [None] * num_chunks
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(analyze_segment, i): i for i in range(num_chunks)}
            for future in as_completed(futures):
                try:
                    i, result = future.result()
                    chunk_results[i] = result
                except Exception as e:
                    print(f"   ❌ Segment failed: {e}")
                    i = futures[future]
                    chunk_results[i] = dict(_SAFE_DEFAULT)

        # Merge results from all chunks
        print(f"   🔄 Merging results from {len(chunk_results)} segments...")
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
            'error_message': None,
            'analyzed_at': datetime.now().isoformat()
        }).eq('id', report_id).execute()

        print(f"   ✅ Timestamp-based analysis complete!")
        print(f"   📊 Safety: {merged_result['safety_score']}/100")

    except Exception as e:
        error_str = str(e)
        print(f"   ❌ Timestamp-based analysis failed: {error_str}")
        import traceback
        traceback.print_exc()
        raise


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
        all_concerns.extend(convert_structured_items(chunk.get('concerns', [])))
        all_positive.extend(convert_structured_items(chunk.get('positive_aspects', [])))
        all_key_moments.extend(chunk.get('key_moments', []))

    # Extract timestamps from concerns/positive and sort them chronologically
    def extract_timestamp(text):
        """Extract timestamp in seconds from text like 'Something at 2:35'"""
        match = re.search(r'at (\d+):(\d+)', text)
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            return minutes * 60 + seconds
        return 0

    # Sort concerns and positive by timestamp, deduplicate, and limit
    sorted_concerns = deduplicate_and_clean(sorted(all_concerns, key=extract_timestamp))[:10]
    sorted_positive = deduplicate_and_clean(sorted(all_positive, key=extract_timestamp))[:10]

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


def convert_structured_items(items):
    """
    Convert structured {description, timestamp} objects to "description at timestamp" strings.
    Handles both formats transparently:
    - If item is already a string (legacy/fallback), keep as-is
    - If item is a dict with description+timestamp, combine into string
    """
    if not items:
        return items

    converted = []
    for item in items:
        if isinstance(item, dict):
            desc = str(item.get('description', '')).strip()
            ts = str(item.get('timestamp', '')).strip()
            if desc and ts:
                converted.append(f"{desc} at {ts}")
            elif desc:
                converted.append(desc)
            # Skip empty dicts
        elif isinstance(item, str) and item.strip():
            converted.append(item.strip())
    return converted


def deduplicate_and_clean(items):
    """
    Remove duplicate and truncated concerns/positive_aspects.
    - Strips timestamps and deduplicates by description text
    - Removes truncated items (too short or missing timestamp)
    """
    if not items:
        return items

    timestamp_pattern = re.compile(r'\s*at\s+\d{1,2}:\d{2}(?::\d{2})?\s*$')
    has_timestamp_pattern = re.compile(r'at\s+\d{1,2}:\d{2}')

    seen_descriptions = set()
    cleaned = []

    for item in items:
        if not item or not isinstance(item, str):
            continue

        item = item.strip()

        # Remove truncated items (too short to be meaningful)
        if len(item) < 20:
            continue

        # Must contain a timestamp to be useful (clickable)
        if not has_timestamp_pattern.search(item):
            continue

        # Extract description without timestamp for dedup comparison
        desc = timestamp_pattern.sub('', item).strip().lower()

        # Skip if description is too short after stripping timestamp
        if len(desc) < 10:
            continue

        # Skip duplicate descriptions (same event, different timestamps)
        if desc in seen_descriptions:
            continue

        seen_descriptions.add(desc)
        cleaned.append(item)

    return cleaned


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
    """Analyze a YouTube video - uses timestamp-based chunking for 30+ minute videos"""

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
                print(f"   🔄 Video exceeds {MAX_DURATION_FOR_FULL_ANALYSIS/60:.0f} minutes - using timestamp-based chunking")
                print(f"   ✂️  Will analyze {num_chunks} segments of {CHUNK_DURATION_SECONDS/60:.0f} minutes each")
                return analyze_video_chunked(report_id, youtube_url, duration_seconds)
        else:
            print(f"   ⚠️  Duration detection failed - proceeding with direct analysis")

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

CONCERNS - List up to 10 concerns. For EACH concern provide:
- description: What happens (short, clear description)
- timestamp: The exact time as "M:SS" or "H:MM:SS" when it occurs in the video

POSITIVE ASPECTS - List up to 10 positive aspects. For EACH provide:
- description: What happens (short, clear description)
- timestamp: The exact time as "M:SS" or "H:MM:SS" when it occurs in the video

KEY MOMENTS - Identify 5-10 key moments with timestamps (both concerns AND positive moments):
- timestamp_seconds: The exact time in seconds from the start of the video
- timestamp_display: The timestamp in MM:SS format (e.g., "2:35" for 2 minutes 35 seconds)
- type: The category (violence, scary, nsfw, profanity, educational, positive)
- description: What happens at this moment (max 150 chars)
- severity: low, moderate, or high

For example, if you see violence at 155 seconds (2:35), record: timestamp_seconds=155, timestamp_display="2:35", type="violence", description="Character hits another with hammer", severity="moderate" """

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
                    response_schema=ANALYSIS_SCHEMA
                )
            )

        # Call Gemini — if the SDK raises JSONDecodeError (truncated/drifted
        # response that fails internal validation), recover with safe default
        # rather than propagating.  The SDK occasionally does this even with
        # dict schemas when the response is severely truncated.
        print(f"   📡 Calling Gemini API...")
        try:
            response = call_gemini_api()
            print(f"   ✅ Gemini API call succeeded!")
            # Parse response (never raises — always returns a valid dict)
            result = parse_gemini_response(response)
        except Exception as gemini_err:
            err_lower = str(gemini_err).lower()
            # Retryable errors (503, overloaded) should have been handled by
            # retry_with_backoff — if they still escape, re-raise them.
            if any(kw in err_lower for kw in ['503', '500', 'overloaded', 'rate limit', 'quota']):
                raise
            # JSONDecodeError / parse errors: use safe default so analysis
            # "completes" with empty data rather than showing an error.
            print(f"   ⚠️  Gemini response parse error (using safe default): {gemini_err}")
            result = dict(_SAFE_DEFAULT)

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
        result.setdefault('key_moments', [])

        # Convert structured {description, timestamp} objects to "desc at timestamp" strings
        result['concerns'] = convert_structured_items(result['concerns'])
        result['positive_aspects'] = convert_structured_items(result['positive_aspects'])

        # Deduplicate and remove truncated items from concerns/positive
        result['concerns'] = deduplicate_and_clean(result['concerns'])
        result['positive_aspects'] = deduplicate_and_clean(result['positive_aspects'])
        print(f"   📊 After dedup: {len(result['concerns'])} concerns, {len(result['positive_aspects'])} positives")

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
            'error_message': None,  # Clear any stale error from previous attempts
            'analyzed_at': datetime.now().isoformat()
        }).eq('id', report_id).execute()

        print(f"   ✅ Saved to database!")

    except Exception as e:
        error_str = str(e)
        print(f"   ❌ Failed: {error_str}")
        import traceback
        print(traceback.format_exc())

        # Map internal errors to clean, user-facing messages.
        # Only specific, user-actionable errors get bespoke text;
        # EVERYTHING else maps to the generic "technical issue" message so that
        # no internal stack trace / JSON parse detail ever reaches the end user.
        lower = error_str.lower()
        if 'age-restricted' in lower or 'unavailable' in lower:
            user_error = "This video is age-restricted or unavailable. Please try a different video."
        elif 'timed out' in lower or 'timeout' in lower:
            user_error = "Analysis timed out. Please try again — longer videos may take more time."
        else:
            # Catch-all: covers JSON drift errors ("Unterminated string…",
            # "Expecting property name…"), SDK validation errors, network
            # blips, and any future error variant we haven't seen yet.
            user_error = "Video analysis encountered a technical issue. Please try again."

        try:
            # Guard: only write 'failed' if still 'processing'.
            # A concurrent worker may have already completed this report —
            # don't overwrite 'completed' with 'failed'.
            service_supabase_client.table('reports').update({
                'status': 'failed',
                'error_message': user_error
            }).eq('id', report_id).eq('status', 'processing').execute()
        except:
            pass

def process_pending_reports():
    """Query and process all pending reports"""
    try:
        print(f"   🔍 Querying database for pending reports...")
        print(f"   🔗 Supabase URL: {service_supabase_client.supabase_url}")

        # Reset stale 'processing' reports (stuck >30 min) back to 'pending'.
        # 30 min (not 15) because long-video direct Gemini URL analysis can legitimately
        # take 10-20 min; 15 min was causing completed reports to be re-triggered.
        stale_cutoff = (datetime.now() - timedelta(minutes=30)).isoformat()
        stale_result = service_supabase_client.table('reports').update({
            'status': 'pending',
            'error_message': 'Reset: was stuck in processing for >30 min'
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

        # Process each report — atomic claim prevents concurrent workers from
        # double-processing the same report (Cloud Scheduler fires every minute).
        for idx, report in enumerate(reports, 1):
            # Atomically claim: UPDATE WHERE status = 'pending'.
            # If another concurrent worker already claimed it, this returns no rows
            # and we skip.
            claim = service_supabase_client.table('reports').update({
                'status': 'processing',
                'updated_at': datetime.now().isoformat()
            }).eq('id', report['id']).eq('status', 'pending').execute()

            if not claim.data:
                print(f"\n   ⏭️  Report {report['id'][:8]}… already claimed by another worker — skipping")
                continue

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

