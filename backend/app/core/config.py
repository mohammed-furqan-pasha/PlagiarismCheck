from pydantic_settings import BaseSettings
from typing import ClassVar

class Settings(BaseSettings):
    """
    Configuration settings for the CopyLess backend and AI models.
    We use Pydantic BaseSettings for easy environment variable loading
    (e.g., loading from a .env file if it existed).
    """

    # --- API Configuration ---
    API_TITLE: str = "CopyLess Plagiarism Checker API"
    API_VERSION: str = "0.1.0"
    
    # --- Model Selection ---
    # SBERT model name for semantic embeddings
    SBERT_MODEL_NAME: str = 'all-MiniLM-L6-v2'
    
    # --- Lexical (MinHash/LSH) Configuration ---
    LSH_PERMUTATIONS: int = 128      # Number of hash permutations for MinHash.
    LSH_THRESHOLD: float = 0.5       # Jaccard similarity threshold for LSH matches (0.0 to 1.0).
    
    # --- Search Parameters ---
    # Number of nearest neighbors to retrieve in semantic (FAISS) search
    K_SEMANTIC_NEIGHBORS: int = 5     
    # Number of candidates to retrieve in lexical (LSH) search
    K_LEXICAL_NEIGHBORS: int = 5    
    
    # --- Scoring Weights ---
    # Weights for calculating the final overall score (must sum to 1.0)
    WEIGHT_LEXICAL: float = 0.6
    WEIGHT_SEMANTIC: float = 0.4
    
    # --- CORS Configuration (Optional) ---
    # Frontend URL (default React port)
    FRONTEND_URL: str = "http://localhost:3000" 

# Create a single instance of settings to be imported across the app
settings = Settings()
