from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

# --- Application Setup ---
app = FastAPI(
    title="CopyLess Plagiarism Checker API",
    description="Backend for lexical and semantic plagiarism detection.",
    version="0.1.0",
)

# --- CORS Configuration ---
# Allows the React frontend (running on a different port/domain) to connect to the backend
# In a prototype, we often allow all origins for simplicity.
origins = [
    "http://localhost",
    "http://localhost:3000",  # Default React development server port
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
    return {"message": "CopyLess API is operational.", "status": "ok"}


# --- Server Run Block (Optional, for easy local startup) ---
# This block is usually excluded when deploying with a dedicated process manager (like uvicorn directly)
# but it's handy for local development.
if __name__ == "__main__":
    # Get port from environment variables or default to 8000
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
