from pydantic import BaseModel
from typing import List, Dict, Union, Optional

# --- 1. Sub-Model for Individual Matches ---
class MatchResult(BaseModel):
    """
    Defines the structure for a single matched snippet found in the corpus.
    """
    query_text: str                # The sentence from the user's input.
    matched_text: str              # The corresponding text snippet from the corpus.
    similarity_score: float        # The match score (e.g., Jaccard or Semantic Similarity).
    match_type: str                # 'lexical' (MinHash/LSH) or 'semantic' (SBERT/FAISS).
    source_id: Optional[str] = None # Placeholder for source identifier, if applicable.


# --- 2. Request Model ---
class PlagiarismRequest(BaseModel):
    """
    Defines the structure of the JSON payload sent from the frontend to the API.
    """
    text_to_check: str             # The main text content submitted by the user.


# --- 3. Response Model ---
class PlagiarismResponse(BaseModel):
    """
    Defines the final structure of the JSON response sent back to the frontend.
    """
    overall_similarity: float      # Final combined score (0-100%).
    lexical_breakdown: float       # Breakdown of score attributed to direct matches.
    semantic_breakdown: float      # Breakdown of score attributed to meaning matches.
    processing_time_s: float       # Time taken to run the checks.
    message: str                   # A status message.
    
    # List of the top matched snippets found by either method
    matches: List[MatchResult] = []
