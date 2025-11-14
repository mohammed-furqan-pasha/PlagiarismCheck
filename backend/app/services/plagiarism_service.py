import numpy as np
import time
from typing import List, Dict, Tuple
from sentence_transformers import SentenceTransformer
from datasketch import MinHashLSH, MinHash
import faiss

from ..core.config import settings

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
        print(f"Loading SBERT model: {MODEL_NAME}...")
        self.sbert_model = SentenceTransformer(MODEL_NAME)
        self.corpus_embeddings = self._generate_embeddings(self.corpus_documents)

        # 3. Semantic Index (FAISS)
        self.faiss_index = self._build_faiss_index(self.corpus_embeddings)

        # 4. Lexical Index (MinHash/LSH)
        self.lsh_index = MinHashLSH(threshold=LSH_THRESHOLD, num_permutations=LSH_PERMUTATIONS)
        self.corpus_minhashes = self._build_lsh_index(self.corpus_documents)

        print("Plagiarism Service initialization complete.")

    def _load_corpus(self, path: str) -> List[str]:
        """Loads and splits the corpus text into manageable 'documents' (sentences/paragraphs)."""
        # For a prototype, we'll split by double newline (paragraph break)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            # Simple split by paragraph or sentence
            documents = [doc.strip() for doc in content.split('\n\n') if doc.strip()]
            print(f"Loaded corpus with {len(documents)} documents.")
            return documents
        except FileNotFoundError:
            print(f"Error: Corpus file not found at {path}")
            return []

    def _generate_embeddings(self, documents: List[str]) -> np.ndarray:
        """Generates SBERT embeddings for the corpus documents."""
        # Note: Setting convert_to_tensor=False ensures a numpy array output
        return self.sbert_model.encode(documents, convert_to_tensor=False)

    def _build_faiss_index(self, embeddings: np.ndarray) -> faiss.Index:
        """Builds a FAISS Index for fast semantic similarity search."""
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)  # Simple L2 (Euclidean distance) index
        index.add(embeddings)
        print(f"FAISS index built with {index.ntotal} vectors of dimension {dimension}.")
        return index

    def _build_lsh_index(self, documents: List[str]) -> Dict[str, MinHash]:
        """Generates MinHashes and populates the LSH index."""
        minhashes = {}
        for i, doc in enumerate(documents):
            m = MinHash(num_permutations=LSH_PERMUTATIONS)
            # Simple word-based hashing; can be improved with n-grams
            for d in doc.lower().split():
                m.update(d.encode('utf8'))
            key = f"doc_{i}"
            minhashes[key] = m
            self.lsh_index.insert(key, m)
        print(f"LSH index built with {len(minhashes)} MinHashes.")
        return minhashes

    def check_plagiarism(self, input_text: str, k_semantic: int = 5, k_lexical: int = 5) -> dict:
        """
        The main method for checking the input text against the corpus.
        """
        if not self.corpus_documents:
            return {"error": "Corpus not loaded."}

        # 1. Prepare Input
        start_time = time.time()
        input_sentences = [sent.strip() for sent in input_text.split('.') if sent.strip()]
        if not input_sentences:
            return {"error": "Input text is too short or invalid."}

        # 2. Semantic Check (SBERT + FAISS)
        semantic_results = self._semantic_search(input_sentences, k=k_semantic)

        # 3. Lexical Check (MinHash + LSH)
        lexical_results = self._lexical_search(input_sentences, k=k_lexical)
        
        # 4. Combine and Score (Placeholder logic)
        combined_score = self._calculate_overall_score(semantic_results, lexical_results)

        end_time = time.time()

        return {
            "overall_similarity": combined_score,
            "lexical_matches": lexical_results,
            "semantic_matches": semantic_results,
            "processing_time_s": round(end_time - start_time, 3)
        }

    # --- Private Search Methods ---

    def _semantic_search(self, input_sentences: List[str], k: int) -> List[Dict]:
        """Performs semantic search using SBERT embeddings and FAISS."""
        results = []
        input_embeddings = self._generate_embeddings(input_sentences)
        
        # Search the index: D = distances, I = indices of nearest neighbors
        # k is the number of nearest neighbors to retrieve for *each* input sentence
        D, I = self.faiss_index.search(input_embeddings, k) 

        for i, (query_sentence, indices, distances) in enumerate(zip(input_sentences, I, D)):
            for index, distance in zip(indices, distances):
                # distance is L2, convert to similarity score (higher is better, rough estimation)
                # A simple, non-linear conversion: 1 / (1 + distance)
                similarity = round(1 / (1 + distance), 4)

                results.append({
                    "query_text": query_sentence,
                    "matched_text": self.corpus_documents[index],
                    "similarity_score": similarity,
                    "match_type": "semantic"
                })

        # Sort by similarity and return top matches overall
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        return results[:k]

    def _lexical_search(self, input_sentences: List[str], k: int) -> List[Dict]:
        """Performs lexical search using MinHash and LSH."""
        results = []
        
        for query_sentence in input_sentences:
            m_query = MinHash(num_permutations=LSH_PERMUTATIONS)
            # Hash the query sentence
            for d in query_sentence.lower().split():
                m_query.update(d.encode('utf8'))
            
            # Query the LSH index for potential candidates
            candidates = self.lsh_index.query(m_query)
            
            for doc_key in candidates:
                # Calculate Jaccard similarity between query and candidate MinHashes
                m_candidate = self.corpus_minhashes[doc_key]
                jaccard_similarity = m_query.jaccard(m_candidate)
                
                # Retrieve the full text of the matched document
                doc_index = int(doc_key.split('_')[1])
                
                results.append({
                    "query_text": query_sentence,
                    "matched_text": self.corpus_documents[doc_index],
                    "similarity_score": round(jaccard_similarity * 100, 2),
                    "match_type": "lexical"
                })

        # Sort by similarity and return top matches overall
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        return results[:k]

    def _calculate_overall_score(self, semantic_results: List[Dict], lexical_results: List[Dict]) -> float:
        """
        Placeholder function to calculate a final, combined score (0-100%).
        This is where the magic (or weighted average) happens.
        """
        # Simple Example: Average the top 3 similarities from both methods
        
        # Get top similarities (normalized 0 to 1)
        lexical_scores = [r['similarity_score'] / 100.0 for r in lexical_results[:3]]
        semantic_scores = [r['similarity_score'] for r in semantic_results[:3]]

        all_scores = lexical_scores + semantic_scores
        
        if not all_scores:
            return 0.0

        # Weighted average or simple mean
        mean_score = np.mean(all_scores)
        
        # Convert back to percentage (0-100)
        return round(float(mean_score * 100), 2)
