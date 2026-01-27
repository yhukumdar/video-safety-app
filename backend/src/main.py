"""
FastAPI application for video safety analysis.

This application provides endpoints for:
- Health checks
- Generating signed URLs for video uploads to Google Cloud Storage
- Creating Cloud Tasks for video analysis
"""
import os
import json
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.cloud import tasks_v2
from google.cloud.tasks_v2 import HttpMethod
from datetime import datetime, timedelta
from pydantic import BaseModel
from config import supabase_client

from config import (
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

# Add CORS middleware to allow requests from React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
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
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        dict: Status and message indicating the API is running
    """
    return {"status": "ok", "message": "Video Safety API"}


@app.post("/api/upload/signed-url")
async def get_signed_upload_url(request: dict):
    try:
        print("=== Upload Request Started ===")
        print(f"Request data: {request}")
        
        filename = request.get("filename")
        content_type = request.get("content_type", "video/mp4")
        
        print(f"Filename: {filename}")
        print(f"Content-Type: {content_type}")
        
        # Generate unique path
        from datetime import datetime, timedelta
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        video_path = f"videos/{timestamp}_{filename}"
        
        print(f"Video path: {video_path}")
        print(f"Bucket: {GCS_BUCKET_NAME}")
        
        # Generate signed URL
        bucket = gcs_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(video_path)
        
        print("Generating signed URL...")
        upload_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=15),
            method="PUT",
            content_type=content_type
        )
        
        print(f"Signed URL generated: {upload_url[:100]}...")
        
        video_url = f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/{video_path}"
        
        print("Saving to Supabase...")
        from config import service_supabase_client
        
        result = service_supabase_client.table('reports').insert({
            'video_url': video_url,
            'video_path': video_path,
            'filename': filename,
            'status': 'pending'
        }).execute()
        
        print(f"Supabase insert result: {result.data}")
        
        report_id = result.data[0]['id'] if result.data else None
        print(f"Report ID: {report_id}")
        
        return {
            "upload_url": upload_url,
            "video_path": video_path,
            "report_id": report_id
        }
    except Exception as e:
        print(f"=== ERROR in upload endpoint ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        print(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
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
    Create a new video analysis report
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
        
        # Create report in database with pending status
        new_report = supabase_client.table('reports').insert({
            'video_url': youtube_url,
            'video_path': f'youtube/{video_id}',
            'filename': f'YouTube: {video_id}',
            'status': 'pending',
            'parent_id': request.parent_id
        }).execute()
        
        if not new_report.data:
            raise HTTPException(status_code=500, detail="Failed to create report")
        
        report_id = new_report.data[0]['id']
        
        return {
            "message": "Analysis started successfully",
            "report_id": report_id,
            "status": "pending"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
