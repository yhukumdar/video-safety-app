"""
Backend API Tests
Tests FastAPI endpoints and video analyzer functionality
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import your FastAPI app
# from main import app  # Adjust import based on your structure

# client = TestClient(app)

# Test data
TEST_YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
INVALID_URL = "https://not-youtube.com/video"


class TestAnalyzeEndpoint:
    """Test /analyze endpoint"""
    
    @pytest.mark.skip(reason="Need to import app first")
    def test_analyze_valid_url(self):
        """Should accept valid YouTube URL"""
        response = client.post("/analyze", json={
            "youtube_url": TEST_YOUTUBE_URL,
            "parent_id": "test-parent-id"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "report_id" in data or "id" in data
    
    @pytest.mark.skip(reason="Need to import app first")
    def test_analyze_invalid_url(self):
        """Should reject invalid URL"""
        response = client.post("/analyze", json={
            "youtube_url": INVALID_URL,
            "parent_id": "test-parent-id"
        })
        
        assert response.status_code in [400, 422]
    
    @pytest.mark.skip(reason="Need to import app first")
    def test_analyze_missing_url(self):
        """Should reject missing URL"""
        response = client.post("/analyze", json={
            "parent_id": "test-parent-id"
        })
        
        assert response.status_code == 422


class TestVideoAnalyzer:
    """Test video analyzer functions"""
    
    def test_extract_video_id(self):
        """Should extract video ID from various URL formats"""
        from src.workers.video_analyzer import extract_video_id
        
        # Standard URL
        url1 = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        assert extract_video_id(url1) == "dQw4w9WgXcQ"
        
        # Short URL
        url2 = "https://youtu.be/dQw4w9WgXcQ"
        assert extract_video_id(url2) == "dQw4w9WgXcQ"
        
        # URL with params
        url3 = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=xyz"
        assert extract_video_id(url3) == "dQw4w9WgXcQ"
    
    def test_get_video_title(self):
        """Should fetch video title"""
        from src.workers.video_analyzer import get_video_title
        
        # This might timeout or fail if no internet
        title = get_video_title(TEST_YOUTUBE_URL)
        
        # Should return something (real title or fallback)
        assert title is not None
        assert len(title) > 0
        assert "YouTube Video" in title or len(title) > 10
    
    def test_age_recommendation_calculation(self):
        """Should calculate age recommendations correctly"""
        # You'll need to expose this function or test it indirectly
        
        # Low scores → Young age
        # Violence: 10, Scary: 5, NSFW: 0, Profanity: False
        # Expected: Ages 3-5
        
        # Medium scores → Medium age
        # Violence: 40, Scary: 35, NSFW: 10, Profanity: False
        # Expected: Ages 7-10
        
        # High scores → Older age
        # Violence: 75, Scary: 70, NSFW: 50, Profanity: True
        # Expected: Ages 13+
        
        # This is a placeholder - implement based on your function
        pass


class TestDatabase:
    """Test database operations"""
    
    @pytest.mark.skip(reason="Requires database setup")
    def test_create_report(self):
        """Should create report in database"""
        # Test creating a new report
        pass
    
    @pytest.mark.skip(reason="Requires database setup")
    def test_update_report_status(self):
        """Should update report status"""
        # Test status: pending → processing → completed
        pass
    
    @pytest.mark.skip(reason="Requires database setup")
    def test_save_kid_profile(self):
        """Should save kid profile"""
        pass
    
    @pytest.mark.skip(reason="Requires database setup")
    def test_save_content_preferences(self):
        """Should save content preferences"""
        pass


# Run tests with: pytest test_api.py -v
