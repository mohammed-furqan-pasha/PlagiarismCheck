import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Zap, Brain } from 'lucide-react';

/**
 * Renders the main plagiarism score card with breakdown.
 *
 * @param {object} props
 * @param {number} props.score - The overall similarity score (0-100%).
 * @param {number} props.lexical - The lexical (direct match) breakdown percentage.
 * @param {number} props.semantic - The semantic (meaning match) breakdown percentage.
 */
const ScoreDisplay = ({ score, lexical, semantic }) => {
    // Determine the color based on the score (low score = good/green, high score = bad/red)
    const scoreColorClass =
        score > 50 ? 'text-red-600' : score > 20 ? 'text-amber-600' : 'text-academic-green';

    return (
        <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl bg-white shadow-lg border border-gray-100/70 overflow-hidden"
        >
            <div className="px-6 pt-5 pb-6">
                <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-academic-green" />
                    Originality overview
                </h3>

                <div className="flex flex-col items-center text-center gap-3 mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Overall similarity score
                    </p>
                    <div className="flex items-end gap-1">
                        <span className={`text-6xl sm:text-7xl font-extrabold leading-none ${scoreColorClass}`}>
                            {score.toFixed(1)}
                        </span>
                        <span className="text-3xl sm:text-4xl font-extrabold leading-none text-slate-700">
                            %
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-md">
                        Lower scores indicate higher originality. Values are aggregated from lexical and semantic
                        similarity signals.
                    </p>
                </div>

                {/* Breakdown Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Lexical Breakdown */}
                    <div className="p-4 rounded-xl bg-match-lexical bg-red-50/80">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-700 flex items-center mb-2">
                            <Zap className="w-4 h-4 mr-2" />
                            Lexical (direct word overlap)
                        </p>
                        <p className="text-3xl font-bold text-slate-900">
                            {lexical.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Driven by MinHash &amp; LSH. High lexical similarity suggests direct copying or strongly
                            overlapping phrases.
                        </p>
                    </div>

                    {/* Semantic Breakdown */}
                    <div className="p-4 rounded-xl bg-match-semantic bg-emerald-50/80">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center mb-2">
                            <Brain className="w-4 h-4 mr-2" />
                            Semantic (meaning-level)
                        </p>
                        <p className="text-3xl font-bold text-slate-900">
                            {semantic.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Based on SBERT &amp; FAISS. High semantic similarity indicates paraphrasing or close
                            rephrasing of ideas.
                        </p>
                    </div>
                </div>
            </div>
        </motion.section>
    );
};

export default ScoreDisplay;
