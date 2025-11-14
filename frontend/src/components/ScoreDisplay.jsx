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
    const scoreColorClass = score > 50 ? 'text-red-600' : (score > 20 ? 'text-yellow-600' : 'text-academic-green');

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-6 rounded-xl border border-gray-100 shadow-xl transition-all duration-300"
        >
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-academic-green" />
                Originality Check Summary
            </h3>
            
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div className="text-left">
                    <p className="text-lg font-medium text-gray-500">Overall Similarity Score</p>
                    <div className="flex items-end">
                        <span className={`text-7xl font-extrabold ${scoreColorClass}`}>
                            {score.toFixed(1)}
                        </span>
                        <span className="text-4xl font-extrabold ml-1 leading-none">%</span>
                    </div>
                </div>
            </div>

            {/* Breakdown Section */}
            <div className="grid grid-cols-2 gap-6 pt-4">
                
                {/* Lexical Breakdown */}
                <div className="p-4 bg-input-bg rounded-lg">
                    <p className="font-semibold text-gray-700 flex items-center mb-1">
                        <Zap className="w-4 h-4 mr-2 text-red-500" />
                        Lexical (Direct Word Match)
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                        {lexical.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Based on MinHash & LSH (High score here indicates direct copying)
                    </p>
                </div>

                {/* Semantic Breakdown */}
                <div className="p-4 bg-input-bg rounded-lg">
                    <p className="font-semibold text-gray-700 flex items-center mb-1">
                        <Brain className="w-4 h-4 mr-2 text-blue-500" />
                        Semantic (Meaning Match)
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                        {semantic.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Based on SBERT & FAISS (High score here indicates paraphrasing)
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default ScoreDisplay;
