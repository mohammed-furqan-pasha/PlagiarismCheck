import React, { useState } from 'react';
import { Send, FileText, Clipboard, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Import Extracted Components ---
import ScoreDisplay from './components/ScoreDisplay';
import MatchSnippet from './components/MatchSnippet';

// --- Main Application Component ---

function App() {
    const [inputText, setInputText] = useState('');
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults(null);

        try {
            const response = await fetch('http://localhost:8000/api/v1/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text_to_check: inputText }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle API errors (400, 500, 503)
                throw new Error(data.detail || 'Failed to connect to the backend API.');
            }

            // --- KEY UPDATE: Store the full structured response ---
            setResults({
                overall_similarity: data.overall_similarity,
                lexical_breakdown: data.lexical_breakdown,
                semantic_breakdown: data.semantic_breakdown,
                processing_time_s: data.processing_time_s,
                matches: data.matches || [] // Use the real matches array
            });

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Function to clear input and results
    const handleClear = () => {
        setInputText('');
        setResults(null);
        setError(null);
    };

    return (
        <div className="min-h-screen flex flex-col bg-white">
            {/* Top Bar (Green Academic Theme) */}
            <header className="w-full bg-academic-green text-white p-4 shadow-lg flex justify-center sticky top-0 z-10">
                <div className="max-w-4xl w-full flex items-center">
                    <h1 className="text-xl font-bold tracking-wider">
                        CopyLess <span className="font-normal text-sm opacity-80">[Prototype]</span>
                    </h1>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow flex justify-center p-8 pt-6">
                <div className="w-full max-w-4xl">
                    
                    {/* Results / Dashboard Area */}
                    <div className="min-h-60 mb-8">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg mb-4 flex items-center"
                            >
                                <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">Error:</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            </motion.div>
                        )}

                        {isLoading && (
                            <div className="text-center p-12 text-gray-500 flex flex-col items-center">
                                <motion.div 
                                    animate={{ rotate: 360 }} 
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-6 h-6 border-2 border-academic-green border-t-transparent rounded-full mb-3"
                                />
                                <p>Analyzing text (Lexical & Semantic Checks)...</p>
                            </div>
                        )}

                        {results && (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="w-full"
                            >
                                <ScoreDisplay 
                                    score={results.overall_similarity}
                                    lexical={results.lexical_breakdown}
                                    semantic={results.semantic_breakdown}
                                />
                                
                                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800 flex justify-between items-center">
                                    Matched Snippets ({results.matches.length})
                                </h2>
                                
                                <div className="space-y-4">
                                    {/* --- KEY UPDATE: Mapping over the real matches array --- */}
                                    {results.matches.length > 0 ? (
                                        results.matches.map((match, index) => (
                                            <MatchSnippet key={index} match={match} />
                                        ))
                                    ) : (
                                        <div className="p-4 bg-green-50 text-academic-green rounded-lg border border-green-200">
                                            🎉 **Zero Plagiarism Detected!** Your text is highly original against the current corpus.
                                        </div>
                                    )}
                                    
                                    {/* Display processing time */}
                                    <p className="text-xs text-gray-400 pt-4">
                                        Processing Time: {results.processing_time_s} seconds.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {!isLoading && !results && !error && (
                             <div className="text-center p-12 text-gray-400">
                                <Clipboard className="w-10 h-10 mx-auto mb-3" />
                                <p>Paste your text below to check for plagiarism.</p>
                            </div>
                        )}
                    </div>


                    {/* Chat-style Input Box */}
                    <form onSubmit={handleSubmit} className="w-full sticky bottom-0 bg-white p-4 rounded-xl shadow-2xl border border-gray-100">
                        <div className="flex items-end">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                rows={3} // Start with a few rows visible
                                placeholder="Paste your assignment or report here..."
                                className="flex-grow resize-none p-3 text-lg bg-input-bg rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-academic-green transition-all"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !inputText.trim()}
                                className="ml-3 p-3 bg-academic-green text-white rounded-lg hover:bg-academic-green/80 transition-colors disabled:bg-gray-400"
                                title="Check Plagiarism"
                            >
                                <Send className="w-6 h-6" />
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                disabled={isLoading || (!inputText && !results && !error)}
                                className="ml-2 p-3 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                                title="Clear Input & Results"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                    </form>

                </div>
            </main>
        </div>
    );
}

export default App;
