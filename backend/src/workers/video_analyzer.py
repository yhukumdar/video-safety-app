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

# Create Gemini client with new SDK
client = genai.Client(api_key=GEMINI_API_KEY)

# Model name
MODEL_NAME = 'gemini-2.5-flash'

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

def get_video_title(youtube_url):
    """Fetch video title from YouTube URL using yt-dlp"""
    try:
        result = subprocess.run(
            ['yt-dlp', '--get-title', youtube_url],
            capture_output=True,
            text=True,
            timeout=30  # Increased from 10 to 30 seconds
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


def analyze_video(report_id, youtube_url):
    """Analyze a YouTube video directly via URL (no download needed!)"""
    
    try:
        print(f"   🎥 Video URL: {youtube_url}")
        print(f"   🆔 Report ID: {report_id}")
        
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
        
        # Create analysis prompt
        # Create prompt
        prompt = """You are a content safety analyst for parents reviewing videos their children want to watch.
                    CRITICAL INSTRUCTIONS:
                    - You MUST actually watch and analyze the ENTIRE video
                    - DO NOT make assumptions based on titles or descriptions
                    - Only report issues you can actually observe in the video
                    - Be accurate and truthful above all else

                    Your task: Analyze this video comprehensively and provide a detailed safety assessment.

                    ANALYSIS REQUIREMENTS:

                    1. VIOLENCE ASSESSMENT (0-100 scale):
                    - 0-20: No violence (safe for all ages)
                    - 21-50: Mild cartoon/slapstick violence (ages 7+)
                    - 51-80: Moderate action violence (ages 10+)
                    - 81-100: Graphic/realistic violence (ages 16+)

                    2. NSFW CONTENT ASSESSMENT (0-100 scale):
                    - 0-20: Completely appropriate (safe for all)
                    - 21-50: Mild suggestive content (ages 10+)
                    - 51-80: Moderate inappropriate content (ages 13+)
                    - 81-100: Explicit sexual content (ages 18+)

                    3. LANGUAGE ASSESSMENT (boolean):
                    - Listen to the audio carefully
                    - Only mark true if you ACTUALLY HEAR profanity

                    4. OVERALL SAFETY SCORE (0-100):
                    - 90-100: Excellent for young children (ages 5+)
                    - 70-89: Good for older children (ages 8+)
                    - 50-69: Suitable for tweens/teens (ages 11+)
                    - 30-49: Mature content (ages 14+)
                    - 0-29: Not suitable for children (ages 17+)

                    5. CONTENT THEMES DETECTION:
                    Detect and list ALL themes present in the video. Only include themes you ACTUALLY observe.
                    
                    Possible themes:
                    - "educational" - Teaching/learning content (alphabet, math, science, etc.)
                    - "entertainment" - Pure entertainment (music, comedy, games)
                    - "religious" - Religious content, prayer, worship, religious figures/stories
                    - "lgbtq" - LGBTQ+ characters, themes, pride flags, same-sex relationships
                    - "political" - Political figures, campaigns, partisan messaging
                    - "scary" - Horror elements, monsters, jump scares, dark themes
                    - "romantic" - Romance, dating, relationships, kissing
                    - "action" - Action sequences, fighting (not violent, but action-oriented)
                    - "musical" - Music videos, singing, dancing
                    - "animated" - Cartoon/animated content
                    - "live-action" - Real people, not animated
                    
                    IMPORTANT: 
                    - Only include themes you can CLEARLY observe in the video
                    - Do NOT guess or assume based on video title
                    - Educational content with diverse characters is NOT automatically "lgbtq"
                    - Historical or news content about religion/politics should be marked accurately

                    6. SCARY CONTENT ASSESSMENT (0-100 scale):
                    - 0-20: Not scary at all
                    - 21-40: Mildly suspenseful or tense
                    - 41-60: Moderately scary (monsters, dark themes)
                    - 61-80: Very scary (horror elements, jump scares)
                    - 81-100: Extremely frightening (intense horror)

                    7. EXPLANATION:
                    - Write 2-3 clear sentences
                    - ONLY describe what you actually observed
                    - Be specific about the actual content

                    8. RECOMMENDATIONS:
                    - Provide age guidance based on what you observed
                    - Keep it concise (1-2 sentences)

                    RESPONSE FORMAT (return ONLY valid JSON, keep it concise):
                    {
                    "safety_score": <integer 0-100>,
                    "violence_score": <integer 0-100>,
                    "nsfw_score": <integer 0-100>,
                    "scary_score": <integer 0-100>,
                    "profanity_detected": <boolean>,
                    "themes": ["theme1", "theme2"],
                    "summary": "<2-3 sentences describing what happens in the video>",
                    "concerns": ["<specific concern 1>", "<specific concern 2>"],
                    "positive_aspects": ["<positive aspect 1>", "<positive aspect 2>"],
                    "explanation": "<2-3 sentences about safety assessment>",
                    "recommendations": "<1-2 sentences with age guidance>",
                    "timestamps": []
                    }

                    IMPORTANT:
                    - Keep response under 500 words
                    - summary: Brief description of video content (what happens)
                    - concerns: List specific safety issues found (empty array if none)
                    - positive_aspects: List educational/positive elements (empty array if none)
                    - timestamps should almost always be []
                    - Only include themes you ACTUALLY observed in the video
                    - Be objective and accurate about content themes

                    Now analyze this video:"""
        
        # Analyze directly from YouTube URL
        print(f"   🤖 Analyzing video directly from URL...")
        print(f"   ⚡ No download needed - using Gemini's native YouTube support")
        
        # Wrap Gemini API call with retry logic for 503 errors
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
                    max_output_tokens=4096
                )
            )
        
        # Call Gemini with automatic retry on 503 errors
        response = call_gemini_api()
        
        print(f"\n{'='*60}")
        print(f"📄 RAW GEMINI RESPONSE:")
        print(f"{'='*60}")
        print(response.text[:500] + ("..." if len(response.text) > 500 else ""))
        print(f"{'='*60}\n")
        
        # Parse JSON with robust error handling
        response_text = response.text.strip()
        
        # Remove markdown code fences
        if '```' in response_text:
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        # Try to parse complete JSON
        result = None
        try:
            result = json.loads(response_text)
            print(f"   ✅ JSON parsed successfully")
            
        except json.JSONDecodeError as e:
            print(f"   ⚠️  JSON parsing failed (response too long or incomplete)")
            print(f"   🔧 Extracting essential fields with regex...")
            
            # Use regex to extract just what we need
            import re
            
            # Extract scores using regex
            safety_match = re.search(r'"safety_score":\s*(\d+)', response_text)
            violence_match = re.search(r'"violence_score":\s*(\d+)', response_text)
            nsfw_match = re.search(r'"nsfw_score":\s*(\d+)', response_text)
            scary_match = re.search(r'"scary_score":\s*(\d+)', response_text)
            profanity_match = re.search(r'"profanity_detected":\s*(true|false)', response_text, re.IGNORECASE)
            summary_match = re.search(r'"summary":\s*"([^"]+)"', response_text)
            explanation_match = re.search(r'"explanation":\s*"([^"]+)"', response_text)
            recommendations_match = re.search(r'"recommendations":\s*"([^"]+)"', response_text)
            themes_match = re.search(r'"themes":\s*\[(.*?)\]', response_text)
            concerns_match = re.search(r'"concerns":\s*\[(.*?)\]', response_text)
            positive_match = re.search(r'"positive_aspects":\s*\[(.*?)\]', response_text)
            
            result = {}
            result['safety_score'] = int(safety_match.group(1)) if safety_match else 50
            result['violence_score'] = int(violence_match.group(1)) if violence_match else 0
            result['nsfw_score'] = int(nsfw_match.group(1)) if nsfw_match else 0
            result['scary_score'] = int(scary_match.group(1)) if scary_match else 0
            result['profanity_detected'] = (profanity_match.group(1).lower() == 'true') if profanity_match else False
            result['summary'] = summary_match.group(1) if summary_match else "Video content analyzed."
            result['explanation'] = explanation_match.group(1) if explanation_match else "Video analyzed."
            result['recommendations'] = recommendations_match.group(1) if recommendations_match else "Please review scores."
            
            # Extract themes from JSON array string
            if themes_match:
                themes_str = themes_match.group(1)
                theme_items = re.findall(r'"([^"]+)"', themes_str)
                result['themes'] = theme_items
            else:
                result['themes'] = []
            
            # Extract concerns from JSON array string
            if concerns_match:
                concerns_str = concerns_match.group(1)
                concern_items = re.findall(r'"([^"]+)"', concerns_str)
                result['concerns'] = concern_items
            else:
                result['concerns'] = []
            
            # Extract positive aspects from JSON array string
            if positive_match:
                positive_str = positive_match.group(1)
                positive_items = re.findall(r'"([^"]+)"', positive_str)
                result['positive_aspects'] = positive_items
            else:
                result['positive_aspects'] = []
            
            result['timestamps'] = []
            
            print(f"   ✅ Successfully extracted core fields")
        
        # Validate and extract final scores
        safety_score = max(0, min(100, int(result.get('safety_score', 50))))
        violence_score = max(0, min(100, int(result.get('violence_score', 0))))
        nsfw_score = max(0, min(100, int(result.get('nsfw_score', 0))))
        scary_score = max(0, min(100, int(result.get('scary_score', 0))))
        profanity_detected = bool(result.get('profanity_detected', False))
        
        # Ensure required text fields
        if not result.get('explanation'):
            result['explanation'] = f"Video analyzed with safety score: {safety_score}/100"
        
        if not result.get('summary'):
            result['summary'] = f"Video content analyzed with a safety score of {safety_score}/100."
        
        if not result.get('recommendations'):
            if safety_score >= 80:
                result['recommendations'] = "Suitable for children with minimal parental guidance."
            else:
                result['recommendations'] = "Parents should preview before showing to younger children."
        
        # Ensure arrays exist
        if 'themes' not in result or not isinstance(result.get('themes'), list):
            result['themes'] = []
        
        if 'concerns' not in result or not isinstance(result.get('concerns'), list):
            result['concerns'] = []
        
        if 'positive_aspects' not in result or not isinstance(result.get('positive_aspects'), list):
            result['positive_aspects'] = []
        
        if 'timestamps' not in result or not isinstance(result.get('timestamps'), list):
            result['timestamps'] = []
        
        # Calculate age recommendation based on scores
        def calculate_age_recommendation(violence, scary, nsfw, profanity):
            """Calculate minimum recommended age based on content scores"""
            min_age = 3  # Start with youngest age
            
            # Violence raises age
            if violence > 70: min_age = max(min_age, 13)
            elif violence > 50: min_age = max(min_age, 10)
            elif violence > 30: min_age = max(min_age, 7)
            elif violence > 15: min_age = max(min_age, 5)
            
            # Scary content raises age
            if scary > 70: min_age = max(min_age, 13)
            elif scary > 50: min_age = max(min_age, 10)
            elif scary > 30: min_age = max(min_age, 7)
            elif scary > 15: min_age = max(min_age, 5)
            
            # NSFW content raises age significantly
            if nsfw > 60: min_age = max(min_age, 18)
            elif nsfw > 40: min_age = max(min_age, 16)
            elif nsfw > 20: min_age = max(min_age, 13)
            elif nsfw > 10: min_age = max(min_age, 10)
            
            # Profanity raises age
            if profanity: min_age = max(min_age, 10)
            
            return min_age
        
        age_recommendation = calculate_age_recommendation(
            violence_score, 
            scary_score, 
            nsfw_score, 
            profanity_detected
        )
        result['age_recommendation'] = age_recommendation
        
        print(f"   ✅ Analysis complete!")
        print(f"   📊 Safety: {safety_score}/100, Violence: {violence_score}, NSFW: {nsfw_score}, Scary: {scary_score}, Profanity: {profanity_detected}")
        print(f"   🎂 Recommended Age: {age_recommendation}+")
        if result.get('themes'):
            print(f"   🏷️  Themes: {', '.join(result['themes'])}")
        
        # Save to database
        print(f"   💾 Saving results to database...")
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
        
        # Save content tags separately for easy filtering
        themes = result.get('themes', [])
        if themes:
            print(f"   🏷️  Saving content themes: {', '.join(themes)}")
            # Delete old tags for this report
            service_supabase_client.table('content_tags').delete().eq('report_id', report_id).execute()
            
            # Insert new tags
            tags_to_insert = [
                {
                    'report_id': report_id,
                    'tag_name': theme,
                    'confidence': 0.9  # Default confidence
                }
                for theme in themes
            ]
            
            if tags_to_insert:
                service_supabase_client.table('content_tags').insert(tags_to_insert).execute()
        
        print(f"   ✅ Analysis saved successfully!")
        
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
        # Query pending reports
        result = service_supabase_client.table('reports').select('*').eq('status', 'pending').execute()
        
        reports = result.data if result.data else []
        
        if not reports:
            return 0
        
        print(f"📋 Found {len(reports)} pending report(s)")
        print()
        
        # Process each report
        for idx, report in enumerate(reports, 1):
            print(f"[{idx}/{len(reports)}] Processing: {report['filename']}")
            analyze_video(report['id'], report['video_url'])
            
            # Small delay between videos
            if idx < len(reports):
                print(f"⏸️  Waiting 2 seconds before next video...")
                time.sleep(2)
        
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

