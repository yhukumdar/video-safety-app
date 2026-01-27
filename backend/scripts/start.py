"""
Combined Backend + Worker Launcher
Starts both FastAPI server and video analysis worker in one process
"""

import os
import sys
import threading
import time
from datetime import datetime
import uvicorn

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))

def run_worker():
    """Run the video analysis worker in background thread"""
    print("\n" + "=" * 60)
    print("🤖 VIDEO ANALYSIS WORKER THREAD STARTING")
    print("=" * 60)
    
    # Import worker functions
    from workers.video_analyzer import process_pending_reports
    
    check_count = 0
    
    while True:
        try:
            check_count += 1
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            print(f"\n[Worker Check #{check_count}] {current_time}")
            print("-" * 40)
            
            # Process pending reports
            result = process_pending_reports()
            
            if result > 0:
                print(f"✅ Processed {result} video(s)")
            else:
                print(f"💤 No pending videos")
            
            print(f"⏳ Next check in 30 seconds...")
            print("-" * 40)
            
            time.sleep(30)  # Wait 30 seconds
            
        except Exception as e:
            print(f"\n❌ Worker error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            print(f"⏳ Retrying in 30 seconds...")
            time.sleep(30)

def run_api():
    """Run the FastAPI server"""
    print("\n" + "=" * 60)
    print("🚀 FASTAPI SERVER STARTING")
    print("=" * 60)
    
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Disable reload when running with worker
        log_level="info",
        app_dir=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    )

def main():
    """Main entry point - starts both API and Worker"""
    print("\n" + "=" * 60)
    print("🎬 VIDEO SAFETY APP - COMBINED LAUNCHER")
    print("=" * 60)
    print("Starting Backend API + Worker together...")
    print("Press Ctrl+C to stop everything")
    print("=" * 60)
    
    # Start worker in background thread
    worker_thread = threading.Thread(target=run_worker, daemon=True)
    worker_thread.start()
    
    # Give worker thread a moment to start
    time.sleep(1)
    
    # Start API server (this blocks until stopped)
    try:
        run_api()
    except KeyboardInterrupt:
        print("\n" + "=" * 60)
        print("🛑 Shutting down...")
        print("=" * 60)

if __name__ == "__main__":
    main()