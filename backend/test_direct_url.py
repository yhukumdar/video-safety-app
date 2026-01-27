"""
Test if Gemini 2.5 Flash can actually analyze YouTube URLs directly
"""

print("Starting test script...")

from google import genai
from google.genai import types
import os
import sys
from dotenv import load_dotenv

print("Imports successful")

load_dotenv()
print("Environment loaded")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not found!")
    sys.exit(1)

print(f"API Key found: {GEMINI_API_KEY[:10]}...")

client = genai.Client(api_key=GEMINI_API_KEY)
print("Client created")

youtube_url = "https://www.youtube.com/watch?v=WP1blVh1ZQM"

print("=" * 60)
print("TESTING GEMINI'S DIRECT URL CLAIM")
print("=" * 60)
print(f"Video: {youtube_url}")
print()

# Method 1: Using FileData with YouTube URL
print("Method 1: Using FileData with YouTube URL")
print("-" * 60)
print("Calling Gemini API...")

try:
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=types.Content(
            parts=[
                types.Part(
                    file_data=types.FileData(
                        file_uri=youtube_url,
                        mime_type='video/mp4'
                    )
                ),
                types.Part(text="Describe what you see in this video. What is it about?")
            ]
        ),
        config=types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=500
        )
    )
    
    print("✅ API call completed!")
    print(f"Response type: {type(response)}")
    print(f"Response text: {response.text[:500]}")
    
    # Check accuracy
    response_lower = response.text.lower()
    if "alphabet" in response_lower or "letter" in response_lower:
        print("✅ Response seems accurate (mentions alphabet/letters)")
    elif "wheels" in response_lower or "bus" in response_lower:
        print("⚠️  HALLUCINATION: Mentions wrong content (wheels/bus)")
    else:
        print(f"⚠️  Unclear if accurate. Full response:")
        print(response.text)
        
except Exception as e:
    print(f"❌ FAILED!")
    print(f"Error type: {type(e).__name__}")
    print(f"Error message: {str(e)}")
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
print("TEST COMPLETE")
print("=" * 60)