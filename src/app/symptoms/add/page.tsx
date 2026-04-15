'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SymptomLogPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: 'Pain',
        severity: 3,
        details: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/symptoms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData
                })
            });

            if (res.ok) {
                router.push('/labs');
                router.refresh();
            } else {
                alert('Failed to save symptom log');
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
                    <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-tight">Symptom Log</h2>
                    <p className="text-xs text-primary font-medium">How are you feeling?</p>
                </div>
                <div className="size-10"></div>
            </header>

            <form onSubmit={handleSubmit} className="px-4 py-8 space-y-8 max-w-md mx-auto">
                {/* Pain Scale Slider */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary">bar_chart</span>
                        <h3 className="text-xl font-bold tracking-tight">Symptom Severity</h3>
                    </div>
                    <div className="bg-background-light dark:bg-slate-800 p-6 rounded-2xl">
                        <div className="flex justify-between mb-4">
                            <span className="text-xs font-semibold text-green-600">None (0)</span>
                            <span className="text-xs font-semibold text-red-600">Severe (10)</span>
                        </div>
                        <input
                            className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer"
                            max="10"
                            min="0"
                            step="1"
                            type="range"
                            value={formData.severity}
                            onChange={(e) => setFormData(prev => ({ ...prev, severity: parseInt(e.target.value) }))}
                        />
                        <div className="grid grid-cols-11 mt-4 text-[10px] text-center text-[#616f89]">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <span key={n} className={formData.severity === n ? 'font-bold text-primary text-sm' : ''}>{n}</span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Symptom Type */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary">checklist</span>
                        <h3 className="text-xl font-bold tracking-tight">Symptom Type</h3>
                    </div>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full h-14 px-4 rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white font-semibold transition-all"
                    >
                        <option value="Pain">Pain (Flank/Back)</option>
                        <option value="Fatigue">Fatigue</option>
                        <option value="Hematuria">Hematuria (Blood in urine)</option>
                        <option value="Swelling">Swelling (Edema)</option>
                        <option value="Shortness of Breath">Shortness of Breath</option>
                    </select>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary">notes</span>
                        <h3 className="text-xl font-bold tracking-tight">Additional Details</h3>
                    </div>
                    <textarea
                        value={formData.details}
                        onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                        className="w-full h-32 p-4 rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white transition-colors"
                        placeholder="Any other details..."
                    />
                </section>

                {/* Save Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 mt-10"
                >
                    <span className="material-symbols-outlined">save</span>
                    {loading ? 'Saving...' : 'Log Symptom'}
                </button>
            </form>
        </main>
    );
}
