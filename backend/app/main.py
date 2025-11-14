from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

# --- Core Service & Router Imports ---
from .services.plagiarism_service import PlagiarismService
from .api.plagiarism import router as plagiarism_router, get_plagiarism_service

# --- Core Initialization (The Singleton) ---
# NOTE: This section runs once when the module is imported (Uvicorn starts)

PLAGIARISM_CHECKER: PlagiarismService = None 

# Define the path to the corpus file relative to the project root
CORPUS_FILE_PATH = Path(__file__).resolve().parent.parent.parent / "corpus" / "fixed_corpus.txt"

# Initialize the heavy service once globally
if CORPUS_FILE_PATH.exists():
    PLAGIARISM_CHECKER = PlagiarismService(corpus_path=str(CORPUS_FILE_PATH))
else:
    print(f"CRITICAL ERROR: Corpus file not found at {CORPUS_FILE_PATH}. Service not initialized.")


# --- Dependency Function ---
# This function is used by the router to inject the singleton instance.
def get_checker():
    """Returns the globally initialized PlagiarismService instance."""
    return PLAGIARISM_CHECKER


# --- Application Setup ---
app = FastAPI(
    title="CopyLess Plagiarism Checker API",
    description="Backend for lexical and semantic plagiarism detection using SBERT, FAISS, and MinHash/LSH.",
    version="0.1.0",
)

# Wire the router's placeholder dependency (`get_plagiarism_service`) to the global singleton.
# Any `Depends(get_plagiarism_service)` in the router will now receive `get_checker()`.
app.dependency_overrides[get_plagiarism_service] = get_checker

# --- CORS Configuration ---
# Wide-open for development so frontend on any local port (e.g. Vite 5173) can talk to the API.
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1",
]

app.add_middleware(
    CORSMiddleware,
    # For development, allow all origins so preflight OPTIONS from any localhost port works.
    allow_origins=["*"],  # alternatively: allow_origins=origins
    allow_credentials=True,
    allow_methods=["*"],  # allow GET, POST, OPTIONS, etc.
    allow_headers=["*"],  # allow all standard/custom headers
)

# --- Router Inclusion ---
# All plagiarism check endpoints (e.g., /api/v1/check) are now defined in plagiarism_router.
app.include_router(plagiarism_router, prefix="/api")

# --- Health Check Endpoint (Kept in main.py) ---
@app.get("/", tags=["Health Check"])
def read_root():
    """
    A simple health check to ensure the API is operational.
    """
    return {"message": "CopyLess API is operational.", 
            "status": "ok",
            "service_ready": PLAGIARISM_CHECKER is not None}
