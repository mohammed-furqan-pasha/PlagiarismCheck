from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated

from ..models.plagiarism import PlagiarismRequest, PlagiarismResponse
from ..services.plagiarism_service import PlagiarismService
from ..core.config import settings

# Initialize the router for all plagiarism-related endpoints
router = APIRouter(
    prefix="/v1",
    tags=["Plagiarism Check"],
)

# --- Dependency Placeholder ---
# We use this function to simulate getting the initialized service instance.
# In a real app, this function would be passed to the main app initialization
# or use a global state manager. For now, we rely on the main.py setup.
def get_plagiarism_service() -> PlagiarismService:
    """
    Placeholder to return the initialized PlagiarismService instance.
    This will be injected by the main application when the router is included.
    (Note: The actual assignment of the global instance is done in main.py)
    """
    # This will be replaced by the actual instance in main.py
    return None 


# --- Endpoint Definition ---
@router.post(
    "/check", 
    response_model=PlagiarismResponse, 
    status_code=status.HTTP_200_OK,
    summary="Run lexical and semantic plagiarism checks against the fixed corpus"
)
async def check_plagiarism_endpoint(
    request: PlagiarismRequest,
    # Inject the service instance
    checker: Annotated[PlagiarismService, Depends(get_plagiarism_service)]
):
    """
    Analyzes the submitted text against the fixed corpus using 
    MinHash/LSH (lexical) and SBERT/FAISS (semantic) algorithms.
    
    - **text_to_check**: The user's input text.
    """
    
    if checker is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Plagiarism service is not initialized. Corpus file or model loading failed."
        )

    # Basic input validation
    # Previously this required at least 10 characters, which rejected short queries.
    # For a better UX we now accept any non-empty text and let the scoring logic handle it.
    if not request.text_to_check or not request.text_to_check.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide some text to check (input cannot be empty)."
        )

    # Execute core logic
    results = checker.check_plagiarism(request.text_to_check)
    
    if "error" in results:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=results["error"]
        )

    # Create the final response model instance
    return PlagiarismResponse(
        overall_similarity=results["overall_similarity"],
        lexical_breakdown=results["lexical_breakdown"],
        semantic_breakdown=results["semantic_breakdown"],
        processing_time_s=results["processing_time_s"],
        message="Plagiarism check complete.",
        matches=results["matches"]
    )
