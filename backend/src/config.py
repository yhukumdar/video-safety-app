"""
Configuration module for loading environment variables and initializing clients.
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from google.cloud import storage
from google.cloud import tasks_v2

# Load environment variables from .env file
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Google Cloud configuration
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "video-safety-app")
GCS_PROJECT_ID = os.getenv("GCS_PROJECT_ID", "video-safety-app")
CLOUD_TASKS_LOCATION = os.getenv("CLOUD_TASKS_LOCATION", "us-central1")
CLOUD_TASKS_QUEUE_NAME = os.getenv("CLOUD_TASKS_QUEUE_NAME", "video-analysis-queue")
SERVICE_ACCOUNT_PATH = os.getenv("SERVICE_ACCOUNT_PATH", "service-account.json")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Create a service role client for backend operations
service_supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Google Cloud Storage
gcs_client = storage.Client()


# Initialize Supabase client
supabase_client: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("Warning: SUPABASE_URL or SUPABASE_KEY not set. Supabase client not initialized.")

# Initialize Google Cloud Storage client
# Uses service account credentials from service-account.json
storage_client: storage.Client = None
try:
    storage_client = storage.Client.from_service_account_json(
        SERVICE_ACCOUNT_PATH,
        project=GCS_PROJECT_ID
    )
except Exception as e:
    print(f"Warning: Failed to initialize GCS client: {e}")

# Initialize Cloud Tasks client
tasks_client: tasks_v2.CloudTasksClient = None
try:
    tasks_client = tasks_v2.CloudTasksClient.from_service_account_json(
        SERVICE_ACCOUNT_PATH
    )
except Exception as e:
    print(f"Warning: Failed to initialize Cloud Tasks client: {e}")

    

# Export clients for use in other modules
__all__ = [
    "supabase_client",
    "service_supabase_client",
    "storage_client",
    "tasks_client",
    "GCS_BUCKET_NAME",
    "GCS_PROJECT_ID",
    "CLOUD_TASKS_LOCATION",
    "CLOUD_TASKS_QUEUE_NAME",
    "GEMINI_API_KEY",
]
