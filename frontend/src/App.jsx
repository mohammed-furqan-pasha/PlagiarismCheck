import React, { useState } from 'react';
import { Send, Clipboard, Trash2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Import Extracted Components ---
import ScoreDisplay from './components/ScoreDisplay';
import MatchSnippet from './components/MatchSnippet';
// Put this at the top of your file
const BASE_URL = "https://plagiarismcheck-weoc.onrender.com"; 

// --- Helper: normalize web comparison results into local-style shape ---
const normalizeWebResults = (inputText, webMatches) => {
    if (!Array.isArray(webMatches) || webMatches.length === 0) {
        return {
            overall_similarity: 0,
            lexical_breakdown: 0,
            semantic_breakdown: 0,
            processing_time_s: 0,
            matches: [],
        };
    }

    const maxScore = Math.max(...webMatches.map((m) => m.score ?? 0));
    const overallPct = Number((maxScore * 100).toFixed(2));

    const matches = webMatches.map((m) => ({
        query_text: inputText,
        matched_text: m.snippet || '',
        // web scores come back 0.0–1.0; convert to percent for UI
        similarity_score: (m.score ?? 0) * 100,
        match_type: 'web_semantic',
        url: m.url,
        title: m.title,
    }));

    return {
        overall_similarity: overallPct,
        lexical_breakdown: 0,
        semantic_breakdown: overallPct, // semantic-only signal
        processing_time_s: 0,
        matches,
    };
};

// --- Main Application Component ---

function App() {
    const [inputText, setInputText] = useState('');
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('local_corpus'); // 'local_corpus' | 'web_comparison'
    const isWebMode = mode === 'web_comparison';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults(null);

        try {
            const endpoint = isWebMode
                ? `${BASE_URL}/api/web/compare`
                : `${BASE_URL}/api/v1/check`;

            const payload = isWebMode
                ? { text: inputText, top_k: 5 }
                : { text_to_check: inputText };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle API errors (400, 500, 503)
                throw new Error(data.detail || 'Failed to connect to the backend API.');
            }

            if (isWebMode) {
                const normalized = normalizeWebResults(inputText, data);
                setResults(normalized);
            } else {
                // Local corpus check: keep structured response from API
                setResults({
                    overall_similarity: data.overall_similarity,
                    lexical_breakdown: data.lexical_breakdown,
                    semantic_breakdown: data.semantic_breakdown,
                    processing_time_s: data.processing_time_s,
                    matches: data.matches || [], // Use the real matches array
                });
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-resizing textarea handler (up to ~6 lines)
    const handleInputChange = (e) => {
        const textarea = e.target;
        textarea.style.height = 'auto';
        const maxHeight = 160; // ~5-6 lines depending on font-size
        textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
        setInputText(textarea.value);
    };

    // Function to clear input and results
    const handleClear = () => {
        setInputText('');
        setResults(null);
        setError(null);
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Top Bar (Green Academic Theme) */}
            <header className="w-full bg-academic-green text-white px-4 py-3 shadow-md flex justify-center sticky top-0 z-20">
                <div className="max-w-4xl w-full flex items-center">
                    <h1 className="text-xl font-semibold tracking-wide">
                        CopyLess
                    </h1>
                </div>
            </header>

            {/* Main Content Area */}
            {/* Main content is centered with constrained width for readability */}
            <main className="flex-1 flex justify-center px-4 pt-6 pb-40">
                <div className="w-full max-w-4xl flex flex-col gap-6">
                    {/* Results / Dashboard Area */}
                    <div className="min-h-[220px]">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-start shadow-sm"
                            >
                                <XCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold">Error</p>
                                    <p className="text-sm leading-relaxed">{error}</p>
                                </div>
                            </motion.div>
                        )}

                        {isLoading && (
                            <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-6 h-6 border-2 border-academic-green border-t-transparent rounded-full mb-3"
                                />
                                <p className="text-sm">Analyzing text (Lexical &amp; Semantic Checks)...</p>
                            </div>
                        )}

                        {results && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full space-y-6"
                            >
                                <ScoreDisplay
                                    score={results.overall_similarity}
                                    lexical={results.lexical_breakdown}
                                    semantic={results.semantic_breakdown}
                                />

                                <section>
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            Matched Snippets
                                        </h2>
                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                                            {results.matches.length} matches
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {results.matches.length > 0 ? (
                                            results.matches.map((match, index) => (
                                                <MatchSnippet key={index} match={match} />
                                            ))
                                        ) : (
                                            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 shadow-sm">
                                                <p className="text-sm font-semibold mb-1">
                                                    Zero Plagiarism Detected
                                                </p>
                                                <p className="text-xs">
                                                    Your text appears highly original against the current corpus.
                                                </p>
                                            </div>
                                        )}

                                        {/* Processing time */}
                                        <p className="text-xs text-gray-400 pt-2">
                                            Processing time: {results.processing_time_s} seconds.
                                        </p>
                                    </div>
                                </section>
                            </motion.div>
                        )}

                        {!isLoading && !results && !error && (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <Clipboard className="w-10 h-10 mb-3" />
                                <p className="text-sm">Paste your text below to check for plagiarism.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Docked chat-style input bar */}
            {/* Docked chat-style input bar (fixed, floating card) */}
            <div className="w-full fixed inset-x-0 bottom-0 bg-white/90 backdrop-blur-sm border-t border-slate-200 shadow-2xl">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <form
                        onSubmit={handleSubmit}
                        className="w-full rounded-2xl bg-input-bg shadow-xl px-3 py-2"
                    >
                        {/* Mode toggle: Local corpus vs Web comparison */}
                        <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[11px] text-slate-500">Mode</span>
                            <div className="inline-flex rounded-full bg-slate-100 p-1 text-[11px] font-medium">
                                <button
                                    type="button"
                                    onClick={() => setMode('local_corpus')}
                                    className={`px-3 py-1 rounded-full transition-colors ${
                                        mode === 'local_corpus'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500'
                                    }`}
                                >
                                    Local corpus
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('web_comparison')}
                                    className={`px-3 py-1 rounded-full transition-colors ${
                                        mode === 'web_comparison'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500'
                                    }`}
                                >
                                    Web comparison
                                </button>
                            </div>
                        </div>

                        <div className="flex items-end gap-3">
                            <textarea
                                value={inputText}
                                onChange={handleInputChange}
                                rows={1}
                                placeholder="Paste your assignment or report here..."
                                className="flex-grow max-h-40 min-h-[44px] resize-none p-3 text-sm md:text-base bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-academic-green focus:border-transparent transition-all overflow-y-auto"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !inputText.trim()}
                                className="flex items-center justify-center px-5 py-3 rounded-xl bg-academic-green text-white text-sm font-semibold shadow-md hover:bg-academic-green/90 disabled:bg-gray-400 disabled:shadow-none transition-colors"
                                title="Check Plagiarism"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                disabled={isLoading || (!inputText && !results && !error)}
                                className="flex items-center justify-center px-3 py-3 rounded-xl bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
                                title="Clear Input & Results"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default App;
