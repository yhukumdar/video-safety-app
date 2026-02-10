"""
FastAPI application for video safety analysis.

This application provides endpoints for:
- Health checks
- Generating signed URLs for video uploads to Google Cloud Storage
- Creating Cloud Tasks for video analysis
- YouTube video search (by name and by image)
"""
import os
import json
import base64
import requests
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.cloud import tasks_v2
from google.cloud.tasks_v2 import HttpMethod
from google import genai
from google.genai import types
from src.config import supabase_client, service_supabase_client, YOUTUBE_API_KEY, GEMINI_API_KEY

from src.config import (
    storage_client,
    tasks_client,
    gcs_client,
    GCS_BUCKET_NAME,
    GCS_PROJECT_ID,
    CLOUD_TASKS_LOCATION,
    CLOUD_TASKS_QUEUE_NAME,
)

# Initialize FastAPI app
app = FastAPI(
    title="Video Safety API",
    description="API for video safety analysis",
    version="1.0.0"
)

# Add CORS middleware to allow requests from React dev server and Firebase
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # React dev server
        "http://localhost:5174",  # React dev server (alternate port)
        "https://video-safety-app-9a6b5.web.app",  # Firebase Hosting
        "https://video-safety-app-9a6b5.firebaseapp.com"  # Firebase alternate domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    youtube_url: str
    parent_id: str | None = None

# Pydantic models for request/response validation
class SignedUrlRequest(BaseModel):
    """Request model for generating signed upload URL."""
    filename: str
    content_type: str = "video/mp4"


class SignedUrlResponse(BaseModel):
    """Response model for signed upload URL."""
    upload_url: str
    video_path: str


class CreateTaskRequest(BaseModel):
    """Request model for creating analysis task."""
    video_path: str


class CreateTaskResponse(BaseModel):
    """Response model for task creation."""
    task_id: str
    status: str


@app.get("/")
async def root():
    """Root endpoint."""
    return {"status": "ok", "message": "Video Safety API"}


@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run."""
    return {"status": "ok", "message": "Video Safety API is healthy"}


@app.post("/api/upload/signed-url")
async def get_signed_upload_url(request: dict):
    try:
        filename = request.get("filename")
        content_type = request.get("content_type", "video/mp4")
        
        # Generate unique path
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        video_path = f"videos/{timestamp}_{filename}"
        
        # Generate signed URL
        bucket = gcs_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(video_path)
        
        upload_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=15),
            method="PUT",
            content_type=content_type
        )
        
        video_url = f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/{video_path}"
        
        # Save to Supabase using service role (bypasses RLS)
        from config import service_supabase_client
        
        result = service_supabase_client.table('reports').insert({
            'video_url': video_url,
            'video_path': video_path,
            'filename': filename,
            'status': 'pending'
        }).execute()
        
        return {
            "upload_url": upload_url,
            "video_path": video_path,
            "report_id": result.data[0]['id'] if result.data else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def create_signed_url(request: SignedUrlRequest):
    """
    Generate a signed URL for uploading videos to Google Cloud Storage.
    
    The signed URL allows PUT requests and expires after 15 minutes.
    
    Args:
        request: Contains filename and content_type for the video
        
    Returns:
        dict: Contains the signed upload URL and the video path in GCS
        
    Raises:
        HTTPException: If GCS client is not initialized or URL generation fails
    """
    if storage_client is None:
        raise HTTPException(
            status_code=503,
            detail="Google Cloud Storage client is not initialized"
        )
    
    try:
        # Generate a unique video path using timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        video_path = f"videos/{timestamp}_{request.filename}"
        
        # Get the bucket
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(video_path)
        
        # Generate signed URL that allows PUT requests for 15 minutes
        upload_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=15),
            method="PUT",
            content_type=request.content_type,
        )
        
        return SignedUrlResponse(
            upload_url=upload_url,
            video_path=video_path
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate signed URL: {str(e)}"
        )


@app.post("/api/analyze/create-task", response_model=CreateTaskResponse)
async def create_analysis_task(request: CreateTaskRequest):
    """
    Create a Cloud Task to analyze a video.
    
    This endpoint queues a task that will be processed by a worker
    (to be implemented later) for video safety analysis.
    
    Args:
        request: Contains the video_path in Google Cloud Storage
        
    Returns:
        dict: Contains the task ID and status
        
    Raises:
        HTTPException: If Cloud Tasks client is not initialized or task creation fails
    """
    if tasks_client is None:
        raise HTTPException(
            status_code=503,
            detail="Cloud Tasks client is not initialized"
        )
    
    try:
        # Construct the fully qualified queue name
        parent = tasks_client.queue_path(
            GCS_PROJECT_ID,
            CLOUD_TASKS_LOCATION,
            CLOUD_TASKS_QUEUE_NAME
        )
        
        # Create the task payload
        # Note: The worker endpoint URL will be configured later
        # For now, we'll use a placeholder that can be updated
        worker_url = os.getenv("WORKER_URL", "https://your-worker-url.com/api/analyze")
        
        # Create HTTP task
        task = {
            "http_request": {
                "http_method": HttpMethod.POST,
                "url": worker_url,
                "headers": {
                    "Content-Type": "application/json",
                },
                "body": json.dumps({
                    "video_path": request.video_path,
                    "bucket_name": GCS_BUCKET_NAME,
                }).encode(),
            }
        }
        
        # Create the task
        response = tasks_client.create_task(
            request={
                "parent": parent,
                "task": task,
            }
        )
        
        # Extract task ID from the response
        task_id = response.name.split("/")[-1]
        
        return CreateTaskResponse(
            task_id=task_id,
            status="queued"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create analysis task: {str(e)}"
        )
        
@app.post("/api/analyze/youtube")
async def analyze_youtube_video(request: dict):
    """Analyze a YouTube video"""
    try:
        youtube_url = request.get("youtube_url")
        video_id = request.get("video_id")
        
        if not youtube_url or not video_id:
            raise HTTPException(status_code=400, detail="YouTube URL and video ID required")
        
        print(f"=== YouTube Analysis Request ===")
        print(f"URL: {youtube_url}")
        print(f"Video ID: {video_id}")
        
        # Generate filename
        filename = f"YouTube: {video_id}"
        video_path = f"youtube/{video_id}"
        
        # Save to Supabase
        from config import service_supabase_client
        
        result = service_supabase_client.table('reports').insert({
            'video_url': youtube_url,
            'video_path': video_path,
            'filename': filename,
            'status': 'pending'
        }).execute()
        
        report_id = result.data[0]['id'] if result.data else None
        
        print(f"Created report with ID: {report_id}")
        
        # TODO: In Step 14, we'll trigger the actual analysis worker here
        
        return {
            "status": "success",
            "report_id": report_id,
            "message": "Video queued for analysis"
        }
        
    except Exception as e:
        print(f"=== Error in YouTube analysis ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_video(request: AnalyzeRequest):
    """
    Create a new video analysis report and queue it for processing
    """
    try:
        # Extract video ID from YouTube URL
        youtube_url = request.youtube_url

        if 'youtube.com' in youtube_url:
            # Format: https://www.youtube.com/watch?v=VIDEO_ID
            if 'v=' in youtube_url:
                video_id = youtube_url.split('v=')[1].split('&')[0]
            else:
                raise HTTPException(status_code=400, detail="Invalid YouTube URL format")
        elif 'youtu.be' in youtube_url:
            # Format: https://youtu.be/VIDEO_ID
            video_id = youtube_url.split('/')[-1].split('?')[0]
        else:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")

        # Create report in database with pending status (use service role client)
        print(f"📝 Creating report in database...")
        print(f"   URL: {youtube_url}")
        print(f"   Video ID: {video_id}")
        print(f"   Parent ID: {request.parent_id}")

        new_report = service_supabase_client.table('reports').insert({
            'video_url': youtube_url,
            'video_path': f'youtube/{video_id}',
            'filename': f'YouTube: {video_id}',
            'status': 'pending',
            'parent_id': request.parent_id
        }).execute()

        print(f"   Insert result: {new_report.data}")

        if not new_report.data:
            print(f"   ❌ Failed to create report - no data returned")
            raise HTTPException(status_code=500, detail="Failed to create report")

        report_id = new_report.data[0]['id']
        print(f"   ✅ Report created with ID: {report_id}")

        return {
            "message": "Analysis queued successfully",
            "report_id": report_id,
            "status": "pending"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/api/retry/{report_id}")
async def retry_failed_report(report_id: str):
    """
    Retry a failed report by resetting its status back to 'pending'.
    The Cloud Scheduler will pick it up automatically within 60 seconds.
    """
    try:
        # Verify report exists and is failed
        result = service_supabase_client.table('reports').select('id,status,video_url').eq('id', report_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Report not found")

        report = result.data[0]
        if report['status'] != 'failed':
            raise HTTPException(status_code=400, detail=f"Report is not in failed state (current: {report['status']})")

        # Reset to pending so worker picks it up
        service_supabase_client.table('reports').update({
            'status': 'pending',
            'error_message': None
        }).eq('id', report_id).execute()

        print(f"✅ Report {report_id} reset to pending for retry")
        return {"status": "success", "message": "Report queued for retry", "report_id": report_id}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Retry error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Retry failed: {str(e)}")


@app.post("/worker/process-pending")
async def process_pending_reports_endpoint():
    """
    Worker endpoint that processes all pending video analysis reports.
    This should be called periodically (e.g., by Cloud Scheduler every minute).
    """
    try:
        from src.workers.video_analyzer import process_pending_reports

        print("🔄 Worker started - checking for pending reports...")
        processed_count = process_pending_reports()

        return {
            "status": "success",
            "processed": processed_count,
            "message": f"Processed {processed_count} report(s)"
        }
    except Exception as e:
        print(f"❌ Worker error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Worker error: {str(e)}")


@app.get("/api/search/youtube")
async def search_youtube_by_name(q: str, max_results: int = 10):
    """
    Search YouTube videos by name/keywords using YouTube Data API.

    Args:
        q: Search query (video name/keywords)
        max_results: Maximum number of results to return (default: 10)

    Returns:
        List of video results with id, title, thumbnail, channel, description
    """
    try:
        if not YOUTUBE_API_KEY:
            raise HTTPException(status_code=500, detail="YouTube API key not configured")

        # Call YouTube Data API
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": q,
            "type": "video",
            "maxResults": max_results,
            "key": YOUTUBE_API_KEY
        }

        response = requests.get(url, params=params)

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"YouTube API error: {response.text}")

        data = response.json()

        # Format results
        videos = []
        for item in data.get("items", []):
            video_id = item["id"]["videoId"]
            snippet = item["snippet"]
            videos.append({
                "video_id": video_id,
                "video_url": f"https://www.youtube.com/watch?v={video_id}",
                "title": snippet["title"],
                "thumbnail": snippet["thumbnails"]["medium"]["url"],
                "channel": snippet["channelTitle"],
                "description": snippet["description"],
                "published_at": snippet["publishedAt"]
            })

        return {
            "status": "success",
            "count": len(videos),
            "videos": videos
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error searching YouTube: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/search/image")
async def search_youtube_by_image(file: UploadFile = File(...)):
    """
    Search YouTube videos by uploading an image/screenshot.
    Uses Gemini Vision to analyze the image and generate search query.

    Args:
        file: Image file (JPG, PNG, etc.)

    Returns:
        List of matching YouTube videos
    """
    try:
        print(f"📸 Image upload received: {file.filename}, type: {file.content_type}")

        if not GEMINI_API_KEY:
            print("❌ Gemini API key not configured")
            raise HTTPException(status_code=500, detail="Gemini API key not configured")

        if not YOUTUBE_API_KEY:
            print("❌ YouTube API key not configured")
            raise HTTPException(status_code=500, detail="YouTube API key not configured")

        # Read image file
        image_data = await file.read()
        print(f"✅ Image data read: {len(image_data)} bytes")

        # Initialize Gemini client with v1alpha (same as video analyzer)
        client = genai.Client(
            api_key=GEMINI_API_KEY,
            http_options={'api_version': 'v1alpha'}
        )

        # Analyze image with Gemini Vision
        print("🤖 Analyzing image with Gemini Vision...")

        prompt = """Analyze this image and describe what you see in detail. Focus on:
- What is happening in the scene?
- Who are the characters/people?
- What is the setting/location?
- Any text, logos, or distinctive elements?
- What video/show/movie might this be from?

Generate 2-3 specific YouTube search queries that would help find this video.
Return as JSON: {"description": "detailed description", "search_queries": ["query1", "query2", "query3"]}"""

        # Upload image to Gemini (using same model as video analyzer)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_bytes(data=image_data, mime_type=file.content_type),
                        types.Part(text=prompt)
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json"
            )
        )

        # Parse Gemini response
        result = json.loads(response.text)
        description = result.get("description", "")
        search_queries = result.get("search_queries", [])

        print(f"📝 Image description: {description}")
        print(f"🔍 Search queries: {search_queries}")

        # Search YouTube with the generated queries
        all_videos = []
        seen_video_ids = set()

        for query in search_queries[:2]:  # Use top 2 queries
            url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": 5,
                "key": YOUTUBE_API_KEY
            }

            youtube_response = requests.get(url, params=params)

            if youtube_response.status_code == 200:
                data = youtube_response.json()

                for item in data.get("items", []):
                    video_id = item["id"]["videoId"]

                    # Avoid duplicates
                    if video_id in seen_video_ids:
                        continue

                    seen_video_ids.add(video_id)
                    snippet = item["snippet"]

                    all_videos.append({
                        "video_id": video_id,
                        "video_url": f"https://www.youtube.com/watch?v={video_id}",
                        "title": snippet["title"],
                        "thumbnail": snippet["thumbnails"]["medium"]["url"],
                        "channel": snippet["channelTitle"],
                        "description": snippet["description"],
                        "published_at": snippet["publishedAt"]
                    })

        return {
            "status": "success",
            "image_description": description,
            "search_queries": search_queries,
            "count": len(all_videos),
            "videos": all_videos
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error processing image: {error_msg}")
        import traceback
        traceback.print_exc()

        # Provide more helpful error messages
        if "quota" in error_msg.lower() or "exceeded" in error_msg.lower():
            raise HTTPException(status_code=429, detail="API quota exceeded. Please try again later.")
        elif "api key" in error_msg.lower():
            raise HTTPException(status_code=500, detail="Invalid API key configuration")
        else:
            raise HTTPException(status_code=500, detail=f"Image analysis failed: {error_msg}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
