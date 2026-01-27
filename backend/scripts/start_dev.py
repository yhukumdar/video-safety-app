"""
Development version with auto-reload
Worker runs in separate process that restarts with code changes
"""

import os
import sys
import subprocess
import threading
import time

def run_worker():
    """Run worker as subprocess that can be reloaded"""
    while True:
        try:
            print("\n🔄 Starting worker subprocess...")
            worker_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'workers', 'video_analyzer.py')
            process = subprocess.Popen([
                sys.executable,
                worker_path
            ])
            process.wait()
        except KeyboardInterrupt:
            process.terminate()
            break
        except Exception as e:
            print(f"Worker error: {e}")
            time.sleep(5)

def main():
    """Start backend with reload + worker"""
    print("=" * 60)
    print("🎬 DEV MODE - Backend + Worker with Auto-Reload")
    print("=" * 60)
    
    # Start worker thread
    worker_thread = threading.Thread(target=run_worker, daemon=True)
    worker_thread.start()
    
    # Start FastAPI with reload
    import uvicorn
    base_dir = os.path.join(os.path.dirname(__file__), '..')
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable reload for development
        reload_dirs=[os.path.join(base_dir, "src")],
        app_dir=base_dir
    )

if __name__ == "__main__":
    main()