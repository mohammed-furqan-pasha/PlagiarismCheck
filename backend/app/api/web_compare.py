from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..services.web_search_service import WEB_SEARCH_SERVICE, WebSearchService

router = APIRouter(
    prefix="/web",
    tags=["Web Plagiarism Check"],
)


class WebCompareRequest(BaseModel):
    text: str
    top_k: int = 3


class WebMatchResult(BaseModel):
    url: str
    title: str
    snippet: str
    score: float  # Cosine similarity (0.0–1.0)


def get_web_service() -> WebSearchService:
    """Dependency provider for the singleton WebSearchService instance."""
    if WEB_SEARCH_SERVICE is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web search service is not initialized.",
        )
    return WEB_SEARCH_SERVICE


@router.post(
    "/compare",
    response_model=List[WebMatchResult],
    status_code=status.HTTP_200_OK,
)
async def compare_to_web_endpoint(
    request: WebCompareRequest,
    service: Annotated[WebSearchService, Depends(get_web_service)],
):
    """Runs a live web comparison for the provided text using Serper + SBERT."""
    if not request.text or len(request.text.strip()) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide at least 20 characters for web comparison.",
        )

    matches = service.compare_to_web(request.text, request.top_k)
    return [WebMatchResult(**m) for m in matches]
