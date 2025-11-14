import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import os
import sys

# Add the project root to the path so we can import modules correctly
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

# Import the main FastAPI app and the Pydantic models
from backend.app.main import app
from backend.app.models.plagiarism import PlagiarismRequest

# Create a test client instance pointing to your FastAPI application
client = TestClient(app)

# --- Test Data ---
# Note: These tests assume your corpus/fixed_corpus.txt has the sample text provided earlier.
PLAGIARISM_TEXT = "Sentence-BERT (SBERT) is a modification of the BERT network architecture that uses a siamese and triplet network structure to derive semantically meaningful sentence embeddings."
ORIGINAL_TEXT = "The quick brown fox jumps over the lazy dog."
SHORT_TEXT = "Hi."

# --- Fixtures/Setup (Optional but Recommended) ---
# If your PlagiarismService needs heavy setup, fixtures can manage this.
# For simplicity, we rely on the global initialization in app.main.

# --- Test Cases ---

def test_health_check_operational():
    """Test the root endpoint to ensure the API is running and service is ready."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "CopyLess API is operational."
    # Ensure the heavy AI service loaded the corpus correctly
    assert response.json()["service_ready"] is True

def test_check_plagiarism_minimal_original_text():
    """Test a minimal original text against the corpus."""
    request_data = PlagiarismRequest(text_to_check=ORIGINAL_TEXT)
    response = client.post("/api/v1/check", json=request_data.model_dump())
    
    assert response.status_code == 200
    data = response.json()
    
    # Minimal original text should result in a very low similarity score
    assert data["overall_similarity"] < 10.0  # Should be near 0%
    assert data["message"] == "Plagiarism check complete."

def test_check_plagiarism_with_plagiarism():
    """Test text that is known to match the corpus text."""
    request_data = PlagiarismRequest(text_to_check=PLAGIARISM_TEXT)
    response = client.post("/api/v1/check", json=request_data.model_dump())
    
    assert response.status_code == 200
    data = response.json()
    
    # Text copied directly from the corpus should result in a high similarity score
    assert data["overall_similarity"] > 70.0 # Expect a high score due to high lexical/semantic match
    assert data["processing_time_s"] > 0

def test_check_plagiarism_short_text_error():
    """Test the input validation for short text."""
    request_data = PlagiarismRequest(text_to_check=SHORT_TEXT)
    response = client.post("/api/v1/check", json=request_data.model_dump())
    
    assert response.status_code == 400
    assert "substantial amount of text" in response.json()["detail"]
