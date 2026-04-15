'use client';

import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export default function LabReviewClient({ flaggedLabs, profile }: { flaggedLabs: any[], profile: any }) {
    return (
        <main className="flex-1 pb-32 bg-background-light dark:bg-background-dark min-h-screen">
            <header className="sticky top-0 z-20 glass border-b border-white/40 dark:border-white/5 px-4 py-3 flex items-center justify-between">
                <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-xl text-text-muted hover:bg-primary/10 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div className="flex flex-col items-center">
                    <h2 className="text-base font-bold text-text-main dark:text-slate-100">Lab Attention</h2>
                    <p className="text-[11px] text-red-500 font-semibold">{flaggedLabs.length} {flaggedLabs.length === 1 ? 'result' : 'results'} to review</p>
                </div>
                <div className="w-9" />
            </header>

            <div className="max-w-md mx-auto px-4 pt-5 space-y-6">
                {flaggedLabs.length === 0 ? (
                    <div className="card-hero p-8 text-center flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-4xl">check_circle</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">All Caught Up!</h3>
                            <p className="text-white/70 text-sm">You have no outstanding lab results that require immediate attention. Keep up the great work!</p>
                        </div>
                        <Link href="/dashboard" className="btn bg-white text-primary mt-4 w-full h-12 flex items-center justify-center font-bold">
                            Back to Dashboard
                        </Link>
                    </div>
                ) : (
                    <>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest px-1">Flagged Results & Management</p>
                        <div className="space-y-4">
                            {flaggedLabs.map((item, idx) => {
                                const { interpretation } = item;
                                const isDanger = interpretation.status === 'DANGER' || interpretation.status === 'CRITICAL';
                                const badgeColor = isDanger ? 'bg-red-500' : 'bg-amber-500';

                                return (
                                    <div key={item.id} className="card overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                                        {/* Header */}
                                        <div className={`p-4 ${isDanger ? 'bg-red-50 dark:bg-red-900/10' : 'bg-amber-50 dark:bg-amber-900/10'} border-b border-black/5 flex justify-between items-start`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl ${badgeColor} flex items-center justify-center shadow-lg shadow-black/5`}>
                                                    <span className="material-symbols-outlined text-white text-[20px] fill-1">warning</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-black text-text-main dark:text-slate-100">{item.type}</h3>
                                                    <p className="text-[11px] text-text-muted font-medium">{formatDate(item.timestamp)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-xl font-black ${isDanger ? 'text-red-600' : 'text-amber-600'}`}>
                                                    {item.value} <span className="text-xs font-normal text-text-muted">{item.unit}</span>
                                                </p>
                                                <p className={`text-[10px] font-bold uppercase tracking-tighter ${isDanger ? 'text-red-500' : 'text-amber-500'}`}>
                                                    {interpretation.label}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Body */}
                                        <div className="p-5 space-y-5">
                                            <div>
                                                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-sm">info</span>
                                                    Why this matters
                                                </h4>
                                                <p className="text-sm text-text-main dark:text-slate-200 leading-relaxed">
                                                    {interpretation.message}
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-sm">medical_services</span>
                                                    Management Steps
                                                </h4>
                                                <ul className="space-y-2.5">
                                                    {interpretation.managementSteps.map((step: string, sIdx: number) => (
                                                        <li key={sIdx} className="flex gap-3 text-sm text-text-main dark:text-slate-200 group">
                                                            <div className={`shrink-0 w-5 h-5 rounded-full ${isDanger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'} flex items-center justify-center text-[10px] font-black`}>
                                                                {sIdx + 1}
                                                            </div>
                                                            <span className="leading-snug">{step}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* References info */}
                                            <div className="pt-4 border-t border-black/5">
                                                <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 flex gap-3">
                                                    <span className="material-symbols-outlined text-slate-400 text-sm">description</span>
                                                    <p className="text-[10px] text-text-muted leading-relaxed italic">
                                                        {interpretation.disclaimer}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-8 text-center pb-4">
                            <p className="text-xs text-text-muted mb-4 px-8">Always discuss these interpretations with your nephrology team during your next appointment.</p>
                            <Link href="/labs" className="text-sm font-bold text-primary hover:underline">
                                View Full Lab History
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
