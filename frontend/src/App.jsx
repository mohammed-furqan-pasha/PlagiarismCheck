import React, { useState } from 'react';
import { Send, FileText, Clipboard } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Placeholder Components (You will create these later) ---

// Card to display the overall similarity score
const ScoreDisplay = ({ score, lexical, semantic }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-lg border border-gray-100 shadow-md transition-all duration-300"
    >
        <h3 className="text-xl font-semibold text-academic-green mb-3 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Overall Originality Score
        </h3>
        <div className="text-6xl font-extrabold text-gray-900 mb-4">
            {score}%
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
                <p className="font-medium text-gray-700">Lexical Match:</p>
                <p className="text-red-600 font-bold">{lexical}%</p>
            </div>
            <div>
                <p className="font-medium text-gray-700">Semantic Match:</p>
                <p className="text-blue-600 font-bold">{semantic}%</p>
            </div>
        </div>
    </motion.div>
);

// Component to display matched snippets (We will refine this later)
const MatchSnippet = ({ match }) => (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`p-4 rounded-lg mt-3 ${match.match_type === 'lexical' ? 'bg-match-lexical border-red-300' : 'bg-match-semantic border-blue-300'} border-l-4`}
    >
        <p className="text-xs font-semibold uppercase text-gray-600 mb-1">
            {match.match_type} Match ({match.similarity_score}%)
        </p>
        <p className="text-gray-800 italic">
            "{match.query_text}"
        </p>
        <p className="mt-2 text-sm text-gray-600 border-t pt-2">
            Source Preview: {match.matched_text.substring(0, 80)}...
        </p>
    </motion.div>
);

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

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to connect to the backend API.');
            }

            const data = await response.json();
            // The backend returns a detailed object, but the response_model is simplified for now.
            // We'll store the core data and a simplified list of matches (mocked for now).
            setResults({
                ...data,
                // Mocking the detailed match list until we fetch the full service response
                detailed_matches: [
                    { query_text: "The student copied this phrase.", matched_text: "The student copied this phrase, which is identical to the source.", similarity_score: 98.5, match_type: 'lexical' },
                    { query_text: "The concept is fundamentally the same.", matched_text: "The idea is essentially identical in meaning.", similarity_score: 85.2, match_type: 'semantic' },
                ]
            });

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
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
                            <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg mb-4">
                                <p className="font-semibold">Error:</p>
                                <p>{error}</p>
                            </div>
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
                                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800">Matched Snippets</h2>
                                <div className="space-y-3">
                                    {results.detailed_matches.map((match, index) => (
                                        <MatchSnippet key={index} match={match} />
                                    ))}
                                    {/* Display processing time */}
                                    <p className="text-xs text-gray-400 pt-4">
                                        Processed in {results.processing_time_s} seconds.
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
                            >
                                <Send className="w-6 h-6" />
                            </button>
                        </div>
                    </form>

                </div>
            </main>
        </div>
    );
}

export default App;
