'use client';

import { useState } from 'react';

export default function UACRInfo() {
    const [showInfo, setShowInfo] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors text-amber-600 dark:text-amber-400"
                title="Learn about UACR"
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
                                <div className="size-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <span className="material-symbols-outlined">science</span>
                                </div>
                                <h2 className="text-xl font-bold text-[#111318] dark:text-white">What is UACR?</h2>
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
                                    UACR stands for <strong>Urine Albumin-to-Creatinine Ratio</strong>. It measures how much albumin (a protein) is leaking into your urine. Healthy kidneys keep albumin in your blood — when kidneys are damaged, albumin spills into urine. This is called <strong>proteinuria</strong>.
                                </p>
                            </div>

                            {/* UACR Ranges */}
                            <div>
                                <h3 className="font-bold text-[#111318] dark:text-white mb-3">UACR Ranges (mg/g)</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                        <span className="font-bold text-emerald-900 dark:text-emerald-200">&lt; 30 mg/g</span>
                                        <div className="text-right">
                                            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">A1 — Normal</p>
                                            <p className="text-xs text-emerald-700 dark:text-emerald-400">Kidneys filtering protein properly</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                        <span className="font-bold text-amber-900 dark:text-amber-200">30–300 mg/g</span>
                                        <div className="text-right">
                                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">A2 — Moderately Increased</p>
                                            <p className="text-xs text-amber-700 dark:text-amber-400">Early kidney damage signal</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                                        <span className="font-bold text-red-900 dark:text-red-200">&gt; 300 mg/g</span>
                                        <div className="text-right">
                                            <p className="text-xs font-semibold text-red-800 dark:text-red-300">A3 — Severely Increased</p>
                                            <p className="text-xs text-red-700 dark:text-red-400">Significant damage — see your doctor</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* How to log it */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
                                <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                    How to Log Your UACR
                                </p>
                                <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                                    <li className="flex gap-2">
                                        <span className="font-black text-blue-600 dark:text-blue-400 shrink-0">1.</span>
                                        <span>Get a urine test from your doctor or lab — they'll give you a UACR value in <strong>mg/g</strong>.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-black text-blue-600 dark:text-blue-400 shrink-0">2.</span>
                                        <span>Tap <strong>Add Lab</strong> from the dashboard quick actions (or go to <strong>Labs → Add Lab</strong>).</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-black text-blue-600 dark:text-blue-400 shrink-0">3.</span>
                                        <span>Select <strong>UACR</strong> as the lab type and enter your value.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-black text-blue-600 dark:text-blue-400 shrink-0">4.</span>
                                        <span>Your dashboard will instantly update with the new reading and trend bar.</span>
                                    </li>
                                </ol>
                            </div>

                            {/* Why it matters */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">💡 Why It Matters for PKD</p>
                                <p className="text-sm text-[#616f89] leading-relaxed">
                                    Even when your eGFR looks stable, rising UACR is an early warning sign of kidney damage. High UACR accelerates eGFR decline and increases cardiovascular risk — making it one of the most important values to track regularly.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
