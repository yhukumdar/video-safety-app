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

from config import service_supabase_client, GEMINI_API_KEY

# NEW SDK imports
from google import genai
from google.genai import types
from google.genai import errors as genai_errors

# Create Gemini client with v1alpha for media_resolution support
client = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options={'api_version': 'v1alpha'}
)

# Model name
MODEL_NAME = 'gemini-2.5-flash'

# Configurable constants
MAX_DURATION_FOR_FULL_ANALYSIS = 30 * 60  # 30 minutes in seconds - use chunking if video is longer
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

def get_video_duration(youtube_url):
    """Get video duration in seconds using yt-dlp"""
    try:
        print(f"   🕐 Fetching duration with yt-dlp...")
        result = subprocess.run(
            ['yt-dlp', '--get-duration', '--no-warnings', '--quiet', youtube_url],
            capture_output=True,
            text=True,
            timeout=120  # Increased timeout for slow networks
        )
        if result.returncode == 0 and result.stdout.strip():
            duration_str = result.stdout.strip()
            print(f"   ✅ Raw duration: {duration_str}")
            # Parse duration (formats: "MM:SS" or "HH:MM:SS" or "H:MM:SS")
            parts = duration_str.split(':')
            if len(parts) == 2:  # MM:SS
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:  # HH:MM:SS or H:MM:SS
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        else:
            print(f"   ⚠️  yt-dlp failed: {result.stderr.strip()}")
    except subprocess.TimeoutExpired:
        print(f"   ⚠️  Duration fetch timed out after 120s")
    except Exception as e:
        print(f"   ⚠️  Could not fetch video duration: {e}")
    return None

def get_video_title(youtube_url):
    """Fetch video title from YouTube URL using yt-dlp"""
    try:
        result = subprocess.run(
            ['yt-dlp', '--get-title', youtube_url],
            capture_output=True,
            text=True,
            timeout=60  # Increased to 60 seconds for long videos
        )
        if result.returncode == 0:
            title = result.stdout.strip()
            if title:
                return title
    except Exception as e:
        print(f"   ⚠️  Could not fetch video title: {e}")

    # Fallback: Use video ID if available
    video_id = extract_video_id(youtube_url)
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
                    
                    # Check if it's a retryable error (503, overloaded, rate limit)
                    is_retryable = (
                        '503' in error_str or 
                        'overloaded' in error_str.lower() or
                        'rate limit' in error_str.lower() or
                        'quota' in error_str.lower()
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
            ['yt-dlp', '-f', 'worst', '-o', video_path, youtube_url],
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
            prompt = f"""Analyze this video chunk ({i+1}/{num_chunks}) for child safety. Watch the ENTIRE chunk carefully.

SCORING GUIDES:
- violence_score: 0-20=none/cartoon, 21-50=mild slapstick, 51-80=action violence, 81-100=graphic
- nsfw_score: 0-20=appropriate, 21-50=suggestive, 51-80=inappropriate, 81-100=explicit
- scary_score: 0-20=not scary, 21-40=tense, 41-60=monsters, 61-100=horror
- safety_score: 90-100=ages 5+, 70-89=ages 8+, 50-69=ages 11+, 30-49=ages 14+, 0-29=ages 17+
- profanity_detected: true ONLY if you HEAR profanity in audio

THEMES (only include what you ACTUALLY see):
educational, entertainment, religious, lgbtq, political, scary, romantic, action, musical, animated, live-action

Be accurate and thorough. Report specific safety concerns and positive aspects you observe."""

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
                    "concerns": {"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 3},
                    "positive_aspects": {"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 3},
                    "summary": {"type": "string", "maxLength": 300},
                    "explanation": {"type": "string", "maxLength": 300},
                    "recommendations": {"type": "string", "maxLength": 200}
                },
                "required": ["safety_score", "violence_score", "nsfw_score", "scary_score",
                            "profanity_detected", "themes", "concerns", "positive_aspects",
                            "summary", "explanation", "recommendations"]
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
        print(f"   ❌ Chunked analysis failed: {str(e)}")
        import traceback
        traceback.print_exc()

        service_supabase_client.table('reports').update({
            'status': 'failed',
            'error_message': str(e)
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
            'timestamps': []
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

    for chunk in chunk_results:
        all_themes.update(chunk.get('themes', []))
        all_concerns.extend(chunk.get('concerns', []))
        all_positive.extend(chunk.get('positive_aspects', []))

    # Deduplicate concerns/positive
    unique_concerns = list(set(all_concerns))[:5]  # Keep top 5
    unique_positive = list(set(all_positive))[:5]

    return {
        'safety_score': int(avg_safety),
        'violence_score': max_violence,
        'nsfw_score': max_nsfw,
        'scary_score': max_scary,
        'profanity_detected': any_profanity,
        'themes': list(all_themes),
        'concerns': unique_concerns,
        'positive_aspects': unique_positive,
        'summary': f'Video analyzed in {len(chunk_results)} chunks',
        'explanation': f'Max violence: {max_violence}, NSFW: {max_nsfw}, Scary: {max_scary}',
        'recommendations': 'Review all concerns carefully for long videos',
        'timestamps': []
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
                print(f"   🔄 Video exceeds {MAX_DURATION_FOR_FULL_ANALYSIS/60:.0f} minutes - using chunked analysis")
                print(f"   ✂️  Will split into {num_chunks} chunks of {CHUNK_DURATION_SECONDS/60:.0f} minutes each")
                return analyze_video_chunked(report_id, youtube_url, duration_seconds)
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

Be accurate and thorough. Report specific safety concerns and positive aspects you observe."""

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
                "concerns": {"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 3},
                "positive_aspects": {"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 3},
                "summary": {"type": "string", "maxLength": 300},
                "explanation": {"type": "string", "maxLength": 300},
                "recommendations": {"type": "string", "maxLength": 200}
            },
            "required": ["safety_score", "violence_score", "nsfw_score", "scary_score",
                        "profanity_detected", "themes", "concerns", "positive_aspects",
                        "summary", "explanation", "recommendations"]
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
                    max_output_tokens=2048,  # Lower limit to prevent truncation
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

        # Parse JSON
        result = json.loads(response.text)
        print(f"   ✅ JSON parsed successfully")

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

        # Query pending reports
        result = service_supabase_client.table('reports').select('*').eq('status', 'pending').execute()

        reports = result.data if result.data else []

        print(f"   📊 Query result: {len(reports)} report(s) found")

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

