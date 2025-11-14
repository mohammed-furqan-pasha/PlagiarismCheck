import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Brain } from 'lucide-react';

/**
 * Renders a single matched snippet found during the plagiarism check.
 *
 * @param {object} props
 * @param {object} props.match - The match object from the backend results.
 * @param {string} props.match.query_text - The sentence from the user's input that matched.
 * @param {string} props.match.matched_text - The corresponding snippet from the corpus.
 * @param {number} props.match.similarity_score - The score for this specific match.
 * @param {string} props.match.match_type - 'lexical' or 'semantic'.
 */
const MatchSnippet = ({ match }) => {
    // Determine visual style based on match type
    const isLexical = match.match_type === 'lexical';
    const bgColorClass = isLexical ? 'bg-match-lexical' : 'bg-match-semantic';
    const borderColorClass = isLexical ? 'border-red-400' : 'border-blue-400';
    const icon = isLexical ? <Zap className="w-4 h-4 mr-1 text-red-600" /> : <Brain className="w-4 h-4 mr-1 text-blue-600" />;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-4 rounded-xl shadow-sm transition-shadow ${bgColorClass} border-l-4 ${borderColorClass}`}
        >
            {/* Match Type and Score */}
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200">
                <p className="text-sm font-semibold uppercase text-gray-700 flex items-center">
                    {icon}
                    {isLexical ? 'Lexical Match (Direct)' : 'Semantic Match (Meaning)'}
                </p>
                <p className="text-lg font-bold">
                    {match.similarity_score.toFixed(1)}%
                </p>
            </div>

            {/* Query Text */}
            <h4 className="text-base font-medium text-gray-800 mb-2">Your Text:</h4>
            <blockquote className="text-gray-900 border-l-4 border-gray-300 pl-3 italic">
                {match.query_text}
            </blockquote>

            {/* Source Preview */}
            <h4 className="text-base font-medium text-gray-800 mt-4 mb-2">Matched Source Preview:</h4>
            <div className="text-sm text-gray-600 bg-white p-3 rounded">
                {/* Truncate the source text for the preview */}
                {match.matched_text.length > 150 
                    ? match.matched_text.substring(0, 150) + '...'
                    : match.matched_text}
            </div>
        </motion.div>
    );
};

export default MatchSnippet;
