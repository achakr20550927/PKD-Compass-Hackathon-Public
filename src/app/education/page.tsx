'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EducationPage() {
    const router = useRouter();

    return (
        <main className="flex-1 w-full max-w-md mx-auto pb-24 bg-background-light dark:bg-background-dark min-h-screen">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center p-4 justify-between max-w-md mx-auto w-full">
                    <button onClick={() => router.back()} className="text-slate-600 dark:text-slate-400 p-1">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold tracking-tight">PKD Compass</h1>
                    <button className="text-slate-600 dark:text-slate-400 p-1">
                        <span className="material-symbols-outlined">info</span>
                    </button>
                </div>
            </header>

            <div className="flex-1">
                {/* Current Stage Summary */}
                <section className="p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-primary text-3xl">nephrology</span>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Stage G3a, A2</h2>
                        <p className="text-primary font-semibold text-lg">Mild to Moderate CKD</p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Based on your latest labs: eGFR 48 mL/min & ACR 150 mg/g</p>
                    </div>
                </section>

                {/* Risk Heat Map Grid */}
                <section className="px-4 py-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">Risk Heat Map</h3>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">KDIGO Risk Grid</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-center uppercase tracking-wider text-slate-400 mb-1">
                            <div></div>
                            <div>A1</div>
                            <div>A2</div>
                            <div>A3</div>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                            {/* Row G1 */}
                            <div className="flex items-center justify-center font-bold text-slate-400 text-xs">G1</div>
                            <div className="h-12 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400"><span className="material-symbols-outlined text-xs">check_circle</span></div>
                            <div className="h-12 rounded bg-yellow-400/20 border border-yellow-400/30"></div>
                            <div className="h-12 rounded bg-orange-500/20 border border-orange-500/30"></div>

                            {/* Row G2 */}
                            <div className="flex items-center justify-center font-bold text-slate-400 text-xs">G2</div>
                            <div className="h-12 rounded bg-emerald-500/20 border border-emerald-500/30"></div>
                            <div className="h-12 rounded bg-yellow-400/20 border border-yellow-400/30"></div>
                            <div className="h-12 rounded bg-orange-500/20 border border-orange-500/30"></div>

                            {/* Row G3a */}
                            <div className="flex items-center justify-center font-bold text-slate-400 text-xs">G3a</div>
                            <div className="h-12 rounded bg-yellow-400/20 border border-yellow-400/30"></div>
                            {/* ACTIVE CELL */}
                            <div className="h-12 rounded bg-orange-500 border-4 border-primary flex items-center justify-center shadow-lg transform scale-105 z-10 relative">
                                <span className="material-symbols-outlined text-white">location_on</span>
                            </div>
                            <div className="h-12 rounded bg-red-500/20 border border-red-500/30"></div>

                            {/* Row G3b */}
                            <div className="flex items-center justify-center font-bold text-slate-400 text-xs">G3b</div>
                            <div className="h-12 rounded bg-orange-500/20 border border-orange-500/30"></div>
                            <div className="h-12 rounded bg-red-500/20 border border-red-500/30"></div>
                            <div className="h-12 rounded bg-red-600/20 border border-red-600/30"></div>

                            {/* Row G4 */}
                            <div className="flex items-center justify-center font-bold text-slate-400 text-xs">G4</div>
                            <div className="h-12 rounded bg-red-500/20 border border-red-500/30"></div>
                            <div className="h-12 rounded bg-red-600/20 border border-red-600/30"></div>
                            <div className="h-12 rounded bg-red-700/20 border border-red-700/30"></div>

                            {/* Row G5 */}
                            <div className="flex items-center justify-center font-bold text-slate-400 text-xs">G5</div>
                            <div className="h-12 rounded bg-red-700/20 border border-red-700/30"></div>
                            <div className="h-12 rounded bg-red-800/20 border border-red-800/30"></div>
                            <div className="h-12 rounded bg-red-900/20 border border-red-900/30"></div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3 justify-center text-[10px] font-medium text-slate-500">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Low Risk</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>Moderately Increased</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span>High Risk</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600"></span>Very High Risk</div>
                        </div>
                    </div>
                </section>

                {/* Educational Sections */}
                <section className="p-4 space-y-4">
                    <h3 className="text-lg font-bold">Understand Your Results</h3>
                    {/* G-Stage Definition */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <details className="group">
                            <summary className="p-4 flex items-center justify-between cursor-pointer list-none border-b border-slate-50 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/5 rounded-lg">
                                        <span className="material-symbols-outlined text-primary">analytics</span>
                                    </div>
                                    <div>
                                        <p className="font-bold">G-Stage (GFR)</p>
                                        <p className="text-xs text-slate-500">Filtration Performance</p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
                            </summary>
                            <div className="p-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                The <strong>Glomerular Filtration Rate (GFR)</strong> measures how well your kidneys filter waste from your blood.
                                <ul className="mt-2 space-y-2">
                                    <li className="flex gap-2"><span className="font-bold text-slate-900 dark:text-white">G1-G2:</span> Normal or mild decrease.</li>
                                    <li className="flex gap-2"><span className="font-bold text-slate-900 dark:text-white">G3a-G3b:</span> Mild to severe decrease.</li>
                                    <li className="flex gap-2"><span className="font-bold text-slate-900 dark:text-white">G4-G5:</span> Severe decrease or kidney failure.</li>
                                </ul>
                            </div>
                        </details>
                    </div>
                    {/* A-Stage Definition */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <details className="group">
                            <summary className="p-4 flex items-center justify-between cursor-pointer list-none border-b border-slate-50 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/5 rounded-lg">
                                        <span className="material-symbols-outlined text-primary">opacity</span>
                                    </div>
                                    <div>
                                        <p className="font-bold">A-Stage (Albuminuria)</p>
                                        <p className="text-xs text-slate-500">Protein Leakage</p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
                            </summary>
                            <div className="p-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                <strong>Albuminuria</strong> measures the amount of albumin (protein) in your urine. Higher levels indicate kidney damage.
                                <ul className="mt-2 space-y-2">
                                    <li className="flex gap-2"><span className="font-bold text-slate-900 dark:text-white">A1:</span> Normal to mildly increased.</li>
                                    <li className="flex gap-2"><span className="font-bold text-slate-900 dark:text-white text-primary">A2:</span> Moderately increased (Your Stage).</li>
                                    <li className="flex gap-2"><span className="font-bold text-slate-900 dark:text-white">A3:</span> Severely increased.</li>
                                </ul>
                            </div>
                        </details>
                    </div>
                </section>

                {/* Education CTA */}
                <section className="px-4 py-2">
                    <Link href="/log" className="w-full bg-primary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">
                        <span>Manage Your CKD Stage</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                </section>

                {/* Disclaimer */}
                <section className="p-6">
                    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-4 border-l-4 border-slate-300 dark:border-slate-600">
                        <div className="flex gap-3">
                            <span className="material-symbols-outlined text-slate-400 text-sm">warning</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                                <strong>Educational Purpose Only:</strong> This classification is provided for educational purposes based on KDIGO guidelines. It does not constitute medical advice or a formal diagnosis. Always consult your nephrologist for medical interpretation.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
