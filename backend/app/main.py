from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models.plagiarism import PlagiarismRequest, PlagiarismResponse
import uvicorn
import os
import time
from pathlib import Path

# Import the service logic we just created
from .services.plagiarism_service import PlagiarismService

# --- Pydantic Data Models (Request/Response) ---
# Defines the expected structure of the incoming data
class PlagiarismRequest(BaseModel):
    text_to_check: str

# Defines the expected structure of the response (minimal for now)
class PlagiarismResponse(BaseModel):
    overall_similarity: float
    lexical_breakdown: float # Placeholder for a detailed breakdown
    semantic_breakdown: float # Placeholder for a detailed breakdown
    processing_time_s: float
    message: str


# --- Core Initialization (The Singleton) ---
# NOTE: This code executes when the module is imported (when Uvicorn starts)

# Define the path to the corpus file relative to the project root
CORPUS_FILE_PATH = Path(__file__).resolve().parent.parent.parent / "corpus" / "fixed_corpus.txt"

# Initialize the heavy service once globally
# If the file exists, it initializes the models; otherwise, it prints an error.
if CORPUS_FILE_PATH.exists():
    PLAGIARISM_CHECKER = PlagiarismService(corpus_path=str(CORPUS_FILE_PATH))
else:
    print(f"CRITICAL ERROR: Corpus file not found at {CORPUS_FILE_PATH}. Service not initialized.")
    PLAGIARISM_CHECKER = None


# --- Application Setup ---
app = FastAPI(
    title="CopyLess Plagiarism Checker API",
    description="Backend for lexical and semantic plagiarism detection using SBERT, FAISS, and MinHash/LSH.",
    version="0.1.0",
)

# --- CORS Configuration ---
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routes/Endpoints ---

@app.get("/", tags=["Health Check"])
def read_root():
    """
    A simple health check to ensure the API is operational.
    """
    return {"message": "CopyLess API is operational.", 
            "status": "ok",
            "service_ready": PLAGIARISM_CHECKER is not None}

@app.post("/api/v1/check", response_model=PlagiarismResponse, tags=["Plagiarism"])
def check_plagiarism_endpoint(request: PlagiarismRequest):
    """
    Analyzes the submitted text against the fixed corpus using 
    lexical and semantic matching algorithms.
    """
    if PLAGIARISM_CHECKER is None:
        raise HTTPException(
            status_code=503,
            detail="Plagiarism service is not initialized. Check server logs for corpus file error."
        )

    # Sanity check for empty text
    if not request.text_to_check or len(request.text_to_check.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Please provide a substantial amount of text (at least 10 characters) to check."
        )

    # --- Execute Core Logic ---
    start_time = time.time()
    
    # Call the service method we defined earlier
    results = PLAGIARISM_CHECKER.check_plagiarism(request.text_to_check)
    
    end_time = time.time()

    # NOTE: In a real scenario, we'd process the full results dictionary 
    # to get the breakdowns. For now, we'll simplify:
    
    overall_score = results.get("overall_similarity", 0.0)
    
    # Simple placeholder for breakdown
    # Lexical is usually the "harder" match, Semantic is "softer"
    lex_count = len(results.get("lexical_matches", []))
    sem_count = len(results.get("semantic_matches", []))
    
    # Quick, simple logic to show some breakdown (needs refinement in service.py later)
    lexical_breakdown = min(overall_score, lex_count * 10) 
    semantic_breakdown = min(overall_score, sem_count * 10) 


    return PlagiarismResponse(
        overall_similarity=overall_score,
        lexical_breakdown=round(lexical_breakdown / 100 * overall_score, 2),
        semantic_breakdown=round(semantic_breakdown / 100 * overall_score, 2),
        processing_time_s=round(end_time - start_time, 3),
        message="Plagiarism check complete."
    )
    
# The if __name__ == "__main__": block is removed for production-style deployment (Uvicorn command is better)
