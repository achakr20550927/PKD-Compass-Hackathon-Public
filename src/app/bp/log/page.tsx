'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BPLogPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        systolic: '',
        diastolic: '',
        heartRate: '',
        note: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/bp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData
                })
            });

            if (res.ok) {
                router.push('/');
                router.refresh();
            } else {
                alert('Failed to save BP log');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex-1 overflow-y-auto pb-24 bg-white dark:bg-background-dark min-h-screen">
            <header className="sticky top-0 z-10 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 border-b border-primary/10 justify-between">
                <button onClick={() => router.back()} className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-3xl">arrow_back</span>
                </button>
                <div className="flex flex-col items-center text-center">
                    <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-tight">Log Blood Pressure</h2>
                    <p className="text-xs text-primary font-medium">Daily Vital Tracking</p>
                </div>
                <div className="size-10"></div>
            </header>

            <form onSubmit={handleSubmit} className="px-4 py-8 space-y-8 max-w-md mx-auto">
                {/* BP section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary">favorite</span>
                        <h3 className="text-xl font-bold tracking-tight">Blood Pressure <span className="text-sm font-normal text-[#616f89] ml-1">(mmHg)</span></h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2 text-center">
                            <label className="text-sm font-medium text-[#616f89]">Systolic</label>
                            <input
                                type="number"
                                required
                                value={formData.systolic}
                                onChange={(e) => setFormData(prev => ({ ...prev, systolic: e.target.value }))}
                                className="w-full h-16 text-center text-2xl font-bold rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white transition-colors"
                                placeholder="120"
                            />
                        </div>
                        <div className="flex flex-col gap-2 text-center">
                            <label className="text-sm font-medium text-[#616f89]">Diastolic</label>
                            <input
                                type="number"
                                required
                                value={formData.diastolic}
                                onChange={(e) => setFormData(prev => ({ ...prev, diastolic: e.target.value }))}
                                className="w-full h-16 text-center text-2xl font-bold rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white transition-colors"
                                placeholder="80"
                            />
                        </div>
                    </div>
                </section>

                {/* Heart Rate */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary">pulse_alert</span>
                        <h3 className="text-xl font-bold tracking-tight">Heart Rate <span className="text-sm font-normal text-[#616f89] ml-1">(BPM)</span></h3>
                    </div>
                    <input
                        type="number"
                        value={formData.heartRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, heartRate: e.target.value }))}
                        className="w-full h-14 px-4 rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white font-semibold transition-all"
                        placeholder="72"
                    />
                </section>

                {/* Save Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 mt-10"
                >
                    <span className="material-symbols-outlined">save</span>
                    {loading ? 'Saving...' : 'Log Entry'}
                </button>
            </form>
        </main>
    );
}
