'use client';

import { useState } from 'react';

export default function EGFRInfo() {
    const [showInfo, setShowInfo] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                title="Learn about eGFR"
            >
                <span className="material-symbols-outlined text-[20px]">info</span>
            </button>

            {/* Modal Backdrop */}
            {showInfo && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                    onClick={() => setShowInfo(false)}
                />
            )}

            {/* Modal */}
            {showInfo && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-5 md:zoom-in-95">
                        {/* Header */}
                        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <span className="material-symbols-outlined">favorite</span>
                                </div>
                                <h2 className="text-xl font-bold text-[#111318] dark:text-white">What is eGFR?</h2>
                            </div>
                            <button
                                onClick={() => setShowInfo(false)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined text-[#616f89]">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Definition */}
                            <div>
                                <h3 className="font-bold text-[#111318] dark:text-white mb-2">Definition</h3>
                                <p className="text-sm text-[#616f89] leading-relaxed">
                                    eGFR stands for <strong>Estimated Glomerular Filtration Rate</strong>. It measures how well your kidneys are filtering waste from your blood. The result is given in milliliters per minute per 1.73 square meters of body surface area (mL/min/1.73m²).
                                </p>
                            </div>

                            {/* What it Tracks */}
                            <div>
                                <h3 className="font-bold text-[#111318] dark:text-white mb-3">What It Tracks</h3>
                                <div className="space-y-2">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Kidney Function</p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">How efficiently your kidneys filter blood</p>
                                    </div>
                                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-900/30">
                                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">CKD Stage</p>
                                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">Determines your chronic kidney disease (CKD) stage</p>
                                    </div>
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Treatment Plan</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Guides your doctor in treatment decisions</p>
                                    </div>
                                </div>
                            </div>

                            {/* How It's Calculated */}
                            <div>
                                <h3 className="font-bold text-[#111318] dark:text-white mb-2">How It's Calculated</h3>
                                <p className="text-sm text-[#616f89] mb-3 leading-relaxed">
                                    eGFR is estimated using a mathematical formula (MDRD equation) that takes into account:
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2 text-sm">
                                        <span className="text-primary font-bold mt-0.5">•</span>
                                        <span className="text-[#616f89]"><strong>Serum Creatinine</strong> - A waste product from muscle metabolism</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm">
                                        <span className="text-primary font-bold mt-0.5">•</span>
                                        <span className="text-[#616f89]"><strong>Age</strong> - Kidney function naturally declines with age</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm">
                                        <span className="text-primary font-bold mt-0.5">•</span>
                                        <span className="text-[#616f89]"><strong>Sex</strong> - Biological differences in muscle mass</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm">
                                        <span className="text-primary font-bold mt-0.5">•</span>
                                        <span className="text-[#616f89]"><strong>Race/Ethnicity</strong> - Adjustment factor in the calculation</span>
                                    </li>
                                </ul>
                            </div>

                            {/* eGFR Ranges */}
                            <div>
                                <h3 className="font-bold text-[#111318] dark:text-white mb-3">eGFR Ranges</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
                                        <span className="font-semibold text-emerald-900 dark:text-emerald-200">&gt;90</span>
                                        <span className="text-xs text-emerald-700 dark:text-emerald-300">Normal kidney function</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                        <span className="font-semibold text-blue-900 dark:text-blue-200">60-89</span>
                                        <span className="text-xs text-blue-700 dark:text-blue-300">Stage 1 (Mild)</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                                        <span className="font-semibold text-amber-900 dark:text-amber-200">45-59</span>
                                        <span className="text-xs text-amber-700 dark:text-amber-300">Stage 2 (Mild-Moderate)</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                                        <span className="font-semibold text-orange-900 dark:text-orange-200">30-44</span>
                                        <span className="text-xs text-orange-700 dark:text-orange-300">Stage 3a (Moderate)</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                        <span className="font-semibold text-red-900 dark:text-red-200">&lt;30</span>
                                        <span className="text-xs text-red-700 dark:text-red-300">Stage 4-5 (Severe)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tips */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">💡 Pro Tip</p>
                                <p className="text-sm text-[#616f89] leading-relaxed">
                                    Monitor your eGFR regularly and track changes over time. A declining trend may indicate progressive kidney disease, while stable values suggest your treatment plan is working well.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
