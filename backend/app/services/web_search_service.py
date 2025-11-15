import requests
import trafilatura
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from cachetools import TTLCache
from typing import List, Dict, Tuple
import numpy as np

from ..core.config import settings

# Caches to avoid hammering Serper and remote sites
SEARCH_CACHE: TTLCache = TTLCache(maxsize=100, ttl=300)  # 5 minutes
PAGE_TEXT_CACHE: TTLCache = TTLCache(maxsize=50, ttl=3600)  # 1 hour


class WebSearchService:
    """Performs live web search and semantic comparison using Serper + SBERT."""

    def __init__(self) -> None:
        # Debug: confirm whether a Serper API key is visible to settings (do NOT print the key itself)
        print(f"[WebSearchService] SERPER_API_KEY configured: {bool(settings.SERPER_API_KEY)}")
        # Reuse the same SBERT model name as the core plagiarism service
        self.sbert_model = SentenceTransformer(settings.SBERT_MODEL_NAME)

    # --- Internal helpers -------------------------------------------------

    def _fetch_serper_results(self, query: str) -> List[Dict]:
        """Calls the Serper API to get SERP results, with simple caching."""
        if not settings.SERPER_API_KEY:
            # If no key is configured, just return no web results.
            return []

        if query in SEARCH_CACHE:
            return SEARCH_CACHE[query]

        url = "https://google.serper.dev/search"
        headers = {"X-API-KEY": settings.SERPER_API_KEY}
        payload = {"q": query, "num": settings.MAX_SEARCH_RESULTS}

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
            resp.raise_for_status()
            data = resp.json()

            # Serper returns organic results under "organic"
            results = data.get("organic") or data.get("organic_results") or []
            SEARCH_CACHE[query] = results
            return results
        except requests.exceptions.RequestException as exc:
            print(f"Serper API error: {exc}")
            return []

    def _get_page_content(self, url: str) -> str:
        """Fetches and extracts clean text from a URL, with caching."""
        if url in PAGE_TEXT_CACHE:
            return PAGE_TEXT_CACHE[url]

        try:
            downloaded = trafilatura.fetch_url(url)
            if downloaded:
                text = trafilatura.extract(downloaded, favor_recall=True) or ""
                text = text.strip()
                if text:
                    PAGE_TEXT_CACHE[url] = text
                    return text
        except Exception as exc:  # pragma: no cover - defensive
            print(f"Content extraction failed for {url}: {exc}")

        return ""

    def _chunk_and_embed(self, text: str) -> Tuple[np.ndarray, List[str]]:
        """Splits long text into manageable chunks and returns embeddings + chunks.

        For now we do a simple paragraph-based split and cap the number of chunks
        per page to keep processing bounded.
        """
        chunks = [c.strip() for c in text.split("\n\n") if c.strip()]
        chunks = chunks[: settings.MAX_CHUNKS_PER_PAGE]

        if not chunks:
            return np.empty((0, 384)), []  # 384 is common for MiniLM; exact dim is inferred later

        embeddings = self.sbert_model.encode(chunks, convert_to_tensor=False)
        return embeddings, chunks

    # --- Public API -------------------------------------------------------

    def compare_to_web(self, input_text: str, top_k_results: int = 3) -> List[Dict]:
        """Searches the web for the input text and returns top semantic matches.

        Each result contains a URL, title, best-matching snippet, and similarity
        score in the 0.0–1.0 range.
        """
        search_results = self._fetch_serper_results(input_text)
        if not search_results:
            return []

        input_embedding = self.sbert_model.encode([input_text], convert_to_tensor=False)

        all_matches: List[Dict] = []

        for result in search_results:
            url = result.get("link") or result.get("url")
            title = result.get("title") or ""
            if not url:
                continue

            content = self._get_page_content(url)
            if not content:
                continue

            page_embeddings, page_chunks = self._chunk_and_embed(content)
            if page_embeddings.size == 0:
                continue

            # Compute cosine similarity between the input and all page chunks
            similarities = cosine_similarity(input_embedding, page_embeddings)[0]
            best_idx = int(np.argmax(similarities))
            best_score = float(similarities[best_idx])

            snippet_text = page_chunks[best_idx]
            snippet = (snippet_text[:247] + "...") if len(snippet_text) > 250 else snippet_text

            all_matches.append(
                {
                    "url": url,
                    "title": title,
                    "snippet": snippet,
                    "score": round(best_score, 4),
                }
            )

        # Sort overall matches and return the top K
        all_matches.sort(key=lambda m: m["score"], reverse=True)
        return all_matches[:top_k_results]


# Initialize a singleton service instance for dependency injection
WEB_SEARCH_SERVICE = WebSearchService()
