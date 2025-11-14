# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

PlagiarismCheck (CopyLess) is a full-stack plagiarism checker prototype:

- **Backend**: FastAPI service providing lexical and semantic plagiarism detection over a fixed text corpus.
- **Frontend**: React + Vite single-page UI for submitting text and visualizing plagiarism scores and matched snippets.
- **Corpus**: Plain-text corpus under `corpus/` (e.g. `corpus/fixed_corpus.txt`) used to build the plagiarism indices.
- **Notebooks**: Experiments and prototyping live under `notebooks/`.

---

## Common Commands

All commands assume the repository root as the working directory: `C:\Users\furqa\OneDrive\Desktop\PlagiarismCheck`.

### Initial Setup

- **Python dependencies (backend)**
  - Install core backend requirements:
    - `pip install -r requirements.txt`

- **Node dependencies (root + frontend)**
  - Install root dev tooling (e.g. `concurrently`):
    - `npm install`
  - Install frontend dependencies:
    - `npm install --prefix frontend`

### Run Development Servers

- **Backend only (FastAPI via Uvicorn)**
  - `npm run dev:backend`
  - Runs `uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000`.

- **Frontend only (React/Vite)**
  - `npm run dev:frontend`
  - Runs `npm run start --prefix frontend` (Vite dev server).

- **Full-stack dev (backend + frontend concurrently)**
  - `npm run dev`
  - Uses `concurrently` to run `dev:backend` and `dev:frontend` together.

### Frontend: Build & Lint

Run these from the repo root:

- **Build production bundle**
  - `npm run build --prefix frontend`

- **Lint frontend source**
  - `npm run lint --prefix frontend`

- **Preview built frontend**
  - `npm run preview --prefix frontend`

### Backend: Tests

Backend tests live under `backend/tests/` and use `pytest` plus FastAPI's `TestClient`.

- **Run all backend tests**
  - From the repo root:
    - `pytest backend/tests`
  - Or from within the backend directory:
    - `cd backend`
    - `pytest`

- **Run a single test file**
  - `pytest backend/tests/test_plagiarism.py`

- **Run a single test case**
  - Example (end-to-end plagiarism case):
    - `pytest backend/tests/test_plagiarism.py::test_check_plagiarism_with_plagiarism`

> Note: The tests expect the corpus file (e.g. `corpus/fixed_corpus.txt`) to exist and be readable so the global `PlagiarismService` can initialize.

---

## Backend Architecture (FastAPI)

### High-Level Flow

1. **App initialization** (`backend/app/main.py`)
   - Defines the FastAPI app instance, sets metadata, and configures CORS to allow local frontend origins.
   - Computes the corpus path (`corpus/fixed_corpus.txt` relative to the project root).
   - Initializes a singleton `PlagiarismService` with that corpus at import time:
     - If the corpus is missing, logs a critical error and leaves the service uninitialized.
   - Exposes a `get_checker()` function intended for dependency injection, returning the singleton service.
   - Includes the plagiarism router under the `/api` prefix.
   - Provides a root health check endpoint `/` reporting service readiness and a simple status message.

2. **Configuration** (`backend/app/core/config.py`)
   - `Settings` (Pydantic BaseSettings) centralizes tunable parameters:
     - API metadata: `API_TITLE`, `API_VERSION`.
     - Model and index parameters: `SBERT_MODEL_NAME`, `LSH_PERMUTATIONS`, `LSH_THRESHOLD`.
     - Search fan-out: `K_SEMANTIC_NEIGHBORS`, `K_LEXICAL_NEIGHBORS`.
     - Scoring weights: `WEIGHT_LEXICAL`, `WEIGHT_SEMANTIC` (expected to sum to 1.0).
     - CORS-related config: `FRONTEND_URL`.
   - A singleton `settings` object is imported across the backend; adjust behavior here instead of hardcoding values in services.

3. **Domain Models** (`backend/app/models/plagiarism.py`)
   - `MatchResult`: describes a single corpus match (query sentence, matched corpus snippet, similarity score, `match_type` = `lexical` or `semantic`, optional `source_id`).
   - `PlagiarismRequest`: request body model from the frontend, with `text_to_check` as the main input.
   - `PlagiarismResponse`: response model returned to the frontend, containing:
     - `overall_similarity` (final 0–100% score),
     - `lexical_breakdown` / `semantic_breakdown`,
     - `processing_time_s`,
     - `message`,
     - `matches: List[MatchResult]`.

4. **Service Layer** (`backend/app/services/plagiarism_service.py`)
   - `PlagiarismService` encapsulates all heavy AI/algorithmic logic and corpus management:
     - Loads and splits the corpus into logical "documents" (double-newline-separated blocks).
     - Semantic pipeline:
       - Uses `SentenceTransformer` (`settings.SBERT_MODEL_NAME`) to embed corpus documents.
       - Builds a FAISS `IndexFlatL2` over the embeddings for fast nearest-neighbor queries.
       - `_semantic_search` encodes query sentences, queries FAISS, and maps results back to corpus text with similarity scores.
     - Lexical pipeline:
       - Uses `datasketch.MinHash` and `MinHashLSH` with `settings.LSH_PERMUTATIONS` and `settings.LSH_THRESHOLD`.
       - `_build_lsh_index` constructs MinHashes of corpus documents and stores them in the LSH index.
       - `_lexical_search` builds a MinHash for each query sentence, queries the LSH index, and computes Jaccard similarity.
     - Scoring:
       - `check_plagiarism(input_text: str)` orchestrates:
         - sentence-level tokenization of input,
         - semantic and lexical searches with `settings.K_SEMANTIC_NEIGHBORS` and `settings.K_LEXICAL_NEIGHBORS`,
         - `_calculate_overall_score` to compute a weighted overall similarity and breakdown using `settings.WEIGHT_*`.
       - Aggregates lexical and semantic matches, sorts them by similarity, and returns them as `MatchResult`-compatible dictionaries.
   - This class is intended to be instantiated once at startup (in `main.py`) due to heavy model and index initialization.

5. **API Layer** (`backend/app/api/plagiarism.py`)
   - Defines an `APIRouter` mounted under `/api/v1` for plagiarism-related endpoints.
   - Key endpoint: `POST /api/v1/check`
     - Accepts `PlagiarismRequest`.
     - Dependency-injects a `PlagiarismService` instance (via `Depends(get_plagiarism_service)`; wired from `main.py`).
     - Performs input validation (minimal length requirement) and returns 400 for insufficient text.
     - Guards against uninitialized service (503) and propagates internal errors as 500 with structured messages.
     - On success, returns `PlagiarismResponse` built from the service's result.

6. **Tests** (`backend/tests/test_plagiarism.py`)
   - Uses `fastapi.testclient.TestClient` against the real app from `backend.app.main`.
   - Health check coverage: asserts `/` returns a 200 status, an "operational" message, and `service_ready == True`.
   - Functional tests around `/api/v1/check`:
     - Low similarity path (`ORIGINAL_TEXT`): expects low overall similarity.
     - High similarity path (`PLAGIARISM_TEXT` that matches corpus content): expects `overall_similarity` > 70%.
     - Input validation: very short text returns 400 with an explanatory message.
   - When adding new endpoints or behavior, mirror the pattern of using the real `app` instance and `PlagiarismRequest` for constructing request payloads.

---

## Frontend Architecture (React + Vite)

### High-Level Flow

1. **Entry Point** (`frontend/src/main.jsx`)
   - Standard React 18 root creation via `ReactDOM.createRoot`.
   - Renders `<App />` inside `React.StrictMode` and imports Tailwind-powered global styles from `index.css`.

2. **App Shell & Main UX** (`frontend/src/App.jsx`)
   - Maintains the main UI state:
     - `inputText`: user text to check for plagiarism.
     - `results`: structured response from the backend (overall score, breakdown, matches, processing time).
     - `isLoading`, `error`: request lifecycle flags.
   - `handleSubmit`:
     - Sends a POST request to `http://localhost:8000/api/v1/check` with JSON `{ text_to_check: inputText }`.
     - Parses the JSON response and, on success, stores:
       - `overall_similarity`, `lexical_breakdown`, `semantic_breakdown`, `processing_time_s`, `matches`.
     - On non-OK responses, throws with the backend's `detail` message (if present) for user-facing error display.
   - Renders three primary areas:
     - Status area (errors, loading spinner, or initial instructions).
     - Result dashboard (overall score and breakdown via `ScoreDisplay`, list of matches via `MatchSnippet`).
     - Chat-style text input bar with send and clear controls.
   - Uses Tailwind-style utility classes and a small design system (e.g. `bg-academic-green`, `bg-input-bg`) for a cohesive academic-themed UI.

3. **Components** (`frontend/src/components/`)

   - **`ScoreDisplay.jsx`**
     - Displays the overall similarity score in a prominent card.
     - Breaks down scores into two tiles:
       - Lexical (direct word matches, MinHash/LSH).
       - Semantic (meaning matches, SBERT/FAISS).
     - Uses iconography from `lucide-react` and animation from `framer-motion`.

   - **`MatchSnippet.jsx`**
     - Renders a single `MatchResult` from the backend:
       - Shows match type (lexical vs semantic) with different color schemes and icons.
       - Displays the query sentence and a truncated preview of the matched corpus text.
     - Designed to handle the shape emitted by the backend's `matches` list.

4. **Pages Layer** (`frontend/src/pages/Home.jsx`)
   - Simple wrapper that renders `<App />`.
   - Provides a hook point if routing or additional pages are introduced later.

---

## API Contract Between Frontend and Backend

- **Endpoint**: `POST http://localhost:8000/api/v1/check`
- **Request body** (`application/json`):
  - `{ "text_to_check": "... user input text ..." }`
- **Response body (success)**: matches `PlagiarismResponse` from `backend/app/models/plagiarism.py`:
  - `overall_similarity: float`
  - `lexical_breakdown: float`
  - `semantic_breakdown: float`
  - `processing_time_s: float`
  - `message: string`
  - `matches: MatchResult[]` where each match includes at least:
    - `query_text: string`
    - `matched_text: string`
    - `similarity_score: number`
    - `match_type: "lexical" | "semantic"`

Frontend logic in `App.jsx` assumes this shape; if you change the backend response, update the frontend's `setResults` mapping accordingly.
