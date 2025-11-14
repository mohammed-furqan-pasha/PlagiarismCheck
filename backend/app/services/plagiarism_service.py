import numpy as np
import time
from typing import List, Dict, Tuple
from sentence_transformers import SentenceTransformer
from datasketch import MinHashLSH, MinHash
import faiss

# --- IMPORT CONFIGURATION ---
from ..core.config import settings
from ..models.plagiarism import MatchResult 
# NOTE: Removed hardcoded constants as they are now in settings

class PlagiarismService:
    """
    Handles the initialization of AI models (SBERT, LSH, FAISS)
    and executes the core lexical and semantic plagiarism checks.
    """
    def __init__(self, corpus_path: str):
        """
        Initializes the models and loads/processes the corpus.
        """
        print("Initializing Plagiarism Service...")

        # 1. Load Corpus
        self.corpus_path = corpus_path
        self.corpus_documents = self._load_corpus(corpus_path)

        # 2. Semantic Model (SBERT)
        # --- USAGE UPDATE 1: Use settings.SBERT_MODEL_NAME ---
        print(f"Loading SBERT model: {settings.SBERT_MODEL_NAME}...")
        self.sbert_model = SentenceTransformer(settings.SBERT_MODEL_NAME)
        self.corpus_embeddings = self._generate_embeddings(self.corpus_documents)

        # 3. Semantic Index (FAISS)
        self.faiss_index = self._build_faiss_index(self.corpus_embeddings)

        # 4. Lexical Index (MinHash/LSH)
        # --- USAGE UPDATE 2 & 3: Use settings.LSH_THRESHOLD and settings.LSH_PERMUTATIONS ---
        # NOTE: datasketch.MinHashLSH uses the `num_perm` keyword (not `num_permutations`).
        self.lsh_index = MinHashLSH(
            threshold=settings.LSH_THRESHOLD,
            num_perm=settings.LSH_PERMUTATIONS,
        )
        self.corpus_minhashes = self._build_lsh_index(self.corpus_documents)

        print("Plagiarism Service initialization complete.")

    def _load_corpus(self, path: str) -> List[str]:
        """Loads and splits the corpus text into manageable 'documents' (sentences/paragraphs)."""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            documents = [doc.strip() for doc in content.split('\n\n') if doc.strip()]
            print(f"Loaded corpus with {len(documents)} documents.")
            return documents
        except FileNotFoundError:
            print(f"Error: Corpus file not found at {path}")
            return []

    def _generate_embeddings(self, documents: List[str]) -> np.ndarray:
        """Generates SBERT embeddings for the corpus documents."""
        return self.sbert_model.encode(documents, convert_to_tensor=False)

    def _build_faiss_index(self, embeddings: np.ndarray) -> faiss.Index:
        """Builds a FAISS Index for fast semantic similarity search."""
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(embeddings)
        print(f"FAISS index built with {index.ntotal} vectors of dimension {dimension}.")
        return index

    def _build_lsh_index(self, documents: List[str]) -> Dict[str, MinHash]:
        """Generates MinHashes and populates the LSH index."""
        minhashes = {}
        # --- USAGE UPDATE 4: Use settings.LSH_PERMUTATIONS ---
        num_perms = settings.LSH_PERMUTATIONS
        
        for i, doc in enumerate(documents):
            # NOTE: datasketch.MinHash uses the `num_perm` keyword (not `num_permutations`).
            m = MinHash(num_perm=num_perms)
            for d in doc.lower().split():
                m.update(d.encode('utf8'))
            key = f"doc_{i}"
            minhashes[key] = m
            self.lsh_index.insert(key, m)
        print(f"LSH index built with {len(minhashes)} MinHashes.")
        return minhashes

    def check_plagiarism(self, input_text: str) -> dict:
        """
        The main method for checking the input text against the corpus.
        
        Note: The k values are now pulled from the settings.
        """
        if not self.corpus_documents:
            return {"error": "Corpus not loaded."}

        start_time = time.time()
        # Simple sentence tokenization
        input_sentences = [sent.strip() for sent in input_text.split('.') if sent.strip()]
        if not input_sentences:
            return {"error": "Input text is too short or invalid."}

        # 1. Semantic Check (SBERT + FAISS)
        semantic_results = self._semantic_search(
            input_sentences, 
            k=settings.K_SEMANTIC_NEIGHBORS
        )

        # 2. Lexical Check (MinHash + LSH)
        lexical_results = self._lexical_search(
            input_sentences, 
            k=settings.K_LEXICAL_NEIGHBORS
        )
        
        # 3. Combine and Score
        combined_score, lexical_breakdown, semantic_breakdown = self._calculate_overall_score(
            semantic_results, lexical_results
        )

        end_time = time.time()
        
        # Combine results into a single list of matches for the API response
        all_matches = sorted(
            semantic_results + lexical_results, 
            key=lambda x: x['similarity_score'], 
            reverse=True
        )

        return {
            "overall_similarity": combined_score,
            "lexical_breakdown": lexical_breakdown,
            "semantic_breakdown": semantic_breakdown,
            "lexical_matches": lexical_results,
            "semantic_matches": semantic_results,
            "matches": [MatchResult(**m).model_dump() for m in all_matches],
            "processing_time_s": round(end_time - start_time, 3)
        }

    # --- Private Search Methods ---

    def _semantic_search(self, input_sentences: List[str], k: int) -> List[Dict]:
        """Performs semantic search using SBERT embeddings and FAISS."""
        results = []
        if not input_sentences: return results
        
        input_embeddings = self._generate_embeddings(input_sentences)
        D, I = self.faiss_index.search(input_embeddings, k) 

        for i, (query_sentence, indices, distances) in enumerate(zip(input_sentences, I, D)):
            for index, distance in zip(indices, distances):
                # Cosine similarity is generally 1 / (1 + distance) for L2 in unit space, 
                # but we use a simpler formula for a score: 1 - normalized_distance
                # A cosine similarity transformation: 1 - (distance / 2) is often used, but here we keep it simple.
                similarity = round(1 / (1 + distance) * 100, 2) # Score 0-100%

                results.append({
                    "query_text": query_sentence,
                    "matched_text": self.corpus_documents[index],
                    "similarity_score": similarity,
                    "match_type": "semantic",
                    "source_id": f"corpus_doc_{index}"
                })

        # Return only the top 'k' semantic results overall
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        return results[:k]


    def _lexical_search(self, input_sentences: List[str], k: int) -> List[Dict]:
        """Performs lexical search using MinHash and LSH."""
        results = []
        num_perms = settings.LSH_PERMUTATIONS
        
        for query_sentence in input_sentences:
            # First, check for direct inclusion of the query sentence in any corpus
            # paragraph. This strongly rewards verbatim plagiarism (identical or
            # nearly-identical sentences/paragraphs), without requiring the entire
            # paragraph text to match.
            normalized_query = query_sentence.strip()
            for doc_index, doc in enumerate(self.corpus_documents):
                if normalized_query and normalized_query in doc:
                    results.append({
                        "query_text": query_sentence,
                        "matched_text": doc,
                        "similarity_score": 100.0,
                        "match_type": "lexical",
                        "source_id": f"corpus_doc_{doc_index}",
                    })

            # NOTE: datasketch.MinHash uses the `num_perm` keyword (not `num_permutations`).
            m_query = MinHash(num_perm=num_perms)
            for d in query_sentence.lower().split():
                m_query.update(d.encode("utf8"))

            candidates = self.lsh_index.query(m_query)

            for doc_key in candidates:
                m_candidate = self.corpus_minhashes[doc_key]
                jaccard_similarity = m_query.jaccard(m_candidate)
                
                # We only consider matches that meet the MinHash LSH threshold for accuracy
                if jaccard_similarity >= settings.LSH_THRESHOLD:
                    doc_index = int(doc_key.split('_')[1])
                    
                    results.append({
                        "query_text": query_sentence,
                        "matched_text": self.corpus_documents[doc_index],
                        "similarity_score": round(jaccard_similarity * 100, 2),
                        "match_type": "lexical",
                        "source_id": doc_key
                    })

        # Return only the top 'k' lexical results overall
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        return results[:k]


    def _calculate_overall_score(self, semantic_results: List[Dict], lexical_results: List[Dict]) -> Tuple[float, float, float]:
        """
        Calculates a final, combined score (0-100%) using weights from settings.
        """
        W_LEX = settings.WEIGHT_LEXICAL
        W_SEM = settings.WEIGHT_SEMANTIC
        
        # 1. Get scores from top matches
        # Normalize scores to 0-1.
        top_k = 5  # Look at up to the top 5 matches in each channel.

        lex_scores = [r["similarity_score"] / 100.0 for r in lexical_results[:top_k]]
        sem_scores = [r["similarity_score"] / 100.0 for r in semantic_results[:top_k]]

        # Use max similarity (0-1) from each channel if available.
        lex_score = max(lex_scores) if lex_scores else 0.0
        sem_score = max(sem_scores) if sem_scores else 0.0

        # 2. Calculate the combined score:
        # Use the stronger of the two channels as the base overall similarity
        # signal, then aggressively downscale weak similarities so that
        # incidental matches stay near 0 while strong matches remain high.
        raw_score = max(lex_score, sem_score)
        if raw_score < 0.5:
            # Anything below 0.5 similarity is treated as weak and heavily
            # compressed towards zero.
            combined_score_norm = raw_score * 0.2
        else:
            # Preserve strong similarities so direct/near-direct plagiarism
            # remains clearly distinguishable.
            combined_score_norm = raw_score

        # Convert to percentage
        overall_score = round(float(combined_score_norm * 100), 2)

        # Breakdown shows each channel's weighted contribution (for UI only)
        lexical_breakdown = round(float(lex_score * W_LEX * 100), 2)
        semantic_breakdown = round(float(sem_score * W_SEM * 100), 2)

        return overall_score, lexical_breakdown, semantic_breakdown
