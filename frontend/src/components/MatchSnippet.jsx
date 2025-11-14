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
    const bgTintClass = isLexical
        ? 'bg-match-lexical bg-red-50/80'
        : 'bg-match-semantic bg-sky-50/80';
    const borderColorClass = isLexical ? 'border-red-500' : 'border-sky-500';
    const labelColorClass = isLexical ? 'text-red-700' : 'text-sky-700';
    const icon = isLexical ? (
        <Zap className="w-4 h-4 mr-1" />
    ) : (
        <Brain className="w-4 h-4 mr-1" />
    );

    return (
        <motion.article
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className={`rounded-2xl bg-white shadow-md border border-slate-100 border-l-4 ${borderColorClass} overflow-hidden`}
        >
            {/* Match Type and Score */}
            <div className={`flex justify-between items-center px-4 py-2 border-b border-slate-100 ${bgTintClass}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide flex items-center ${labelColorClass}`}>
                    {icon}
                    {isLexical ? 'Lexical match (direct overlap)' : 'Semantic match (similar meaning)'}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                    {match.similarity_score.toFixed(1)}%
                </p>
            </div>

            <div className="px-4 py-3 space-y-3">
                {/* Query Text */}
                <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Your sentence
                    </h4>
                    <blockquote className="text-sm text-slate-900 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                        {match.query_text}
                    </blockquote>
                </div>

                {/* Source Preview */}
                <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Matched source preview
                    </h4>
                    <div className="text-xs sm:text-sm text-slate-50 bg-slate-900 rounded-lg px-3 py-2 border border-slate-700">
                        {match.matched_text.length > 180
                            ? `${match.matched_text.substring(0, 180)}...`
                            : match.matched_text}
                    </div>
                </div>
            </div>
        </motion.article>
    );
};

export default MatchSnippet;
