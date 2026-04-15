'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DeleteButton from '@/components/DeleteButton';

export default function MedsClient({ meds }: { meds: any[] }) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const markAsTaken = async (medId: string) => {
        setLoadingId(medId);
        try {
            const res = await fetch('/api/meds/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medId,
                    status: 'TAKEN',
                    scheduledAt: new Date().toISOString()
                })
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert('Failed to log medication');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-text-main dark:text-slate-100">Active Medications</h3>
                <span className="text-xs text-text-muted font-medium">{meds.length} total</span>
            </div>

            <div className="space-y-2.5">
                {meds.map((med: any) => {
                    const isTaken = med.logs.some((l: any) => l.status === 'TAKEN');

                    return (
                        <div key={med.id} className="card px-4 py-3.5 flex items-center gap-3 transition-opacity">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${med.isTolvaptan
                                ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-[0_4px_12px_rgba(139,92,246,0.3)]'
                                : 'bg-gradient-to-br from-primary to-indigo-500 shadow-glow-primary-sm'
                                } ${isTaken ? 'opacity-50 grayscale' : ''}`}>
                                <span className="material-symbols-outlined text-white text-[20px] fill-1">
                                    {med.isTolvaptan ? 'pill_off' : 'pill'}
                                </span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-bold text-text-main dark:text-slate-100 leading-tight ${isTaken ? 'line-through opacity-50' : ''}`}>
                                    {med.name}
                                </h4>
                                <p className="text-[11px] text-text-muted mt-0.5">{med.dosage} · {med.frequency}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {isTaken ? (
                                    <div className="h-8 px-3 bg-emerald-500 text-white text-[11px] font-bold rounded-xl flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">done</span>
                                        Taken
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => markAsTaken(med.id)}
                                        disabled={loadingId === med.id}
                                        className="h-8 px-3 bg-white dark:bg-slate-800 text-primary text-[11px] font-bold rounded-xl border border-primary/20 hover:bg-primary/5 transition-colors active:scale-95 disabled:opacity-50"
                                    >
                                        {loadingId === med.id ? '...' : 'Mark Taken'}
                                    </button>
                                )}
                                <DeleteButton id={med.id} type="meds" />
                            </div>
                        </div>
                    );
                })}

                {meds.length === 0 && (
                    <div className="card px-4 py-14 flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl">medication</span>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-text-main dark:text-slate-200">No medications yet</p>
                            <p className="text-xs text-text-muted mt-1">Add your first medication to get started</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
