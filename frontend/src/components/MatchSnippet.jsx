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
    const isWeb = match.match_type === 'web_semantic';
    const isLexical = match.match_type === 'lexical';
    const isSemantic = match.match_type === 'semantic' || (!isLexical && !isWeb);

    const bgTintClass = isWeb
        ? 'bg-match-semantic bg-sky-50/80'
        : isLexical
        ? 'bg-match-lexical bg-red-50/80'
        : 'bg-match-semantic bg-sky-50/80';

    const borderColorClass = isWeb
        ? 'border-sky-500'
        : isLexical
        ? 'border-red-500'
        : 'border-sky-500';

    const labelColorClass = isWeb
        ? 'text-sky-700'
        : isLexical
        ? 'text-red-700'
        : 'text-sky-700';

    const icon = isLexical ? (
        <Zap className="w-4 h-4 mr-1" />
    ) : (
        <Brain className="w-4 h-4 mr-1" />
    );

    const labelText = isWeb
        ? 'Web Source Match'
        : isLexical
        ? 'Lexical match (direct overlap)'
        : 'Semantic match (similar meaning)';

    // Scores come in as percentages for local matches; for safety, if a web
    // score is still in 0.0–1.0 range, scale it to 0–100.
    const rawScore = match.similarity_score ?? 0;
    const normalizedScore = isWeb && rawScore <= 1 ? rawScore * 100 : rawScore;

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
                    {labelText}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                    {normalizedScore.toFixed(1)}%
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
                        {isWeb ? 'Web source preview' : 'Matched source preview'}
                    </h4>
                    <div className="text-xs sm:text-sm text-slate-50 bg-slate-900 rounded-lg px-3 py-2 border border-slate-700 space-y-1">
                        <p>
                            {match.matched_text.length > 180
                                ? `${match.matched_text.substring(0, 180)}...`
                                : match.matched_text}
                        </p>
                        {isWeb && match.url && (
                            <p className="text-[11px] text-slate-300 break-all">
                                <span className="font-semibold">Source:</span>{' '}
                                {match.title ? `${match.title} — ` : ''}
                                <a
                                    href={match.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline underline-offset-2"
                                >
                                    {match.url}
                                </a>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </motion.article>
    );
};

export default MatchSnippet;
