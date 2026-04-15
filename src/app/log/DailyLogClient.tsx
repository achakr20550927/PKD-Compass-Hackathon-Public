'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DailyLogClientProps {
    medications: Array<{ id: string; name: string; dosage: string; frequency: string; isTolvaptan: boolean }>;
}

const FATIGUE_LEVELS = [
    { value: 'Low', icon: 'sentiment_satisfied', color: 'text-emerald-500', activeBg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 text-emerald-700' },
    { value: 'Medium', icon: 'sentiment_neutral', color: 'text-amber-500', activeBg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 text-amber-700' },
    { value: 'High', icon: 'sentiment_dissatisfied', color: 'text-red-500', activeBg: 'bg-red-50 dark:bg-red-900/20 border-red-300 text-red-700' },
];

export default function DailyLogClient({ medications }: DailyLogClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({ systolic: '', diastolic: '', painLevel: 3, hematuria: 'No', fatigue: 'Low' });

    const handleSave = async () => {
        setLoading(true);
        try {
            if (formData.systolic && formData.diastolic) {
                await fetch('/api/bp', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ systolic: parseInt(formData.systolic), diastolic: parseInt(formData.diastolic), heartRate: 72 })
                });
            }
            await fetch('/api/symptoms', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'DAILY_LOG', severity: formData.painLevel, details: `Hematuria: ${formData.hematuria}, Fatigue: ${formData.fatigue}` })
            });
            setSuccess(true);
            setFormData({ systolic: '', diastolic: '', painLevel: 3, hematuria: 'No', fatigue: 'Low' });
            setTimeout(() => setSuccess(false), 3000);
            router.refresh();
        } catch (err) { console.error(err); alert('Failed to save log'); }
        finally { setLoading(false); }
    };

    const painColors = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const painColor = formData.painLevel <= 3 ? 'text-emerald-600' : formData.painLevel <= 6 ? 'text-amber-600' : 'text-red-600';
    const painBg = formData.painLevel <= 3 ? 'from-emerald-400 to-teal-400' : formData.painLevel <= 6 ? 'from-amber-400 to-orange-400' : 'from-red-400 to-rose-500';

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <main className="flex-1 w-full max-w-md mx-auto flex flex-col bg-background-light dark:bg-background-dark overflow-x-hidden min-h-screen pb-32">
            {/* Header */}
            <header className="sticky top-0 z-20 flex items-center glass border-b border-white/40 dark:border-white/5 px-4 py-3 justify-between">
                <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-500 shadow-glow-primary-sm">
                    <span className="material-symbols-outlined text-white text-[20px] fill-1">medical_services</span>
                </div>
                <div className="text-center">
                    <h2 className="text-base font-bold text-text-main dark:text-slate-100">Daily Log</h2>
                    <p className="text-[11px] text-text-muted font-medium">{today}</p>
                </div>
                <div className="w-9 h-9 flex items-center justify-center rounded-xl text-text-muted">
                    <span className="material-symbols-outlined text-[20px]">notifications</span>
                </div>
            </header>

            {/* Success Toast */}
            {success && (
                <div className="mx-4 mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl flex gap-3 items-center shadow-card animate-slide-up">
                    <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-white text-[18px] fill-1">check</span>
                    </div>
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Entry logged successfully!</p>
                </div>
            )}

            <div className="flex-1 px-4 py-5 space-y-4">

                {/* Blood Pressure */}
                <div className="card p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[16px] fill-1">favorite</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-text-main dark:text-slate-100">Blood Pressure</h3>
                            <p className="text-[11px] text-text-muted">mmHg</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Systolic', key: 'systolic', placeholder: '120' },
                            { label: 'Diastolic', key: 'diastolic', placeholder: '80' },
                        ].map(({ label, key, placeholder }) => (
                            <div key={key} className="flex flex-col gap-1.5">
                                <label className="label px-1">{label}</label>
                                <input
                                    className="w-full h-16 text-center text-3xl font-black rounded-2xl border-2 border-blue-50 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-text-main dark:text-slate-100 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                                    placeholder={placeholder}
                                    type="number"
                                    value={(formData as any)[key]}
                                    onChange={(e) => setFormData(p => ({ ...p, [key]: e.target.value }))}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pain Intensity */}
                <div className="card p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${painBg} flex items-center justify-center transition-all duration-300`}>
                            <span className="material-symbols-outlined text-white text-[16px] fill-1">bar_chart</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-text-main dark:text-slate-100">Pain Intensity</h3>
                        </div>
                        <div className={`text-4xl font-black ${painColor} transition-colors duration-200`}>
                            {formData.painLevel}
                            <span className="text-base text-text-muted font-medium">/10</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4">
                        <input
                            className="w-full accent-primary"
                            max="10" min="0" step="1" type="range"
                            style={{
                                background: `linear-gradient(90deg, #4F80FF ${formData.painLevel * 10}%, #e2e8f0 ${formData.painLevel * 10}%)`
                            }}
                            value={formData.painLevel}
                            onChange={(e) => setFormData(p => ({ ...p, painLevel: parseInt(e.target.value) }))}
                        />
                        <div className="flex justify-between mt-2 text-[10px] font-bold text-text-muted">
                            <span className="text-emerald-500">None (0)</span>
                            <span>Moderate (5)</span>
                            <span className="text-red-500">Severe (10)</span>
                        </div>
                    </div>
                </div>

                {/* Symptoms */}
                <div className="card p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[16px] fill-1">checklist</span>
                        </div>
                        <h3 className="text-sm font-bold text-text-main dark:text-slate-100">Symptoms</h3>
                    </div>

                    {/* Hematuria */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2.5">
                            <div>
                                <p className="text-sm font-bold text-text-main dark:text-slate-100">Hematuria</p>
                                <p className="text-[11px] text-text-muted">Blood in urine</p>
                            </div>
                            <div className="flex bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-blue-50 dark:border-white/5">
                                {['No', 'Yes'].map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => setFormData(p => ({ ...p, hematuria: v }))}
                                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${formData.hematuria === v
                                                ? v === 'Yes'
                                                    ? 'bg-red-500 text-white shadow-sm'
                                                    : 'bg-white dark:bg-card-dark shadow-sm text-text-main dark:text-slate-100'
                                                : 'text-text-muted'
                                            }`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Fatigue */}
                    <div>
                        <p className="text-sm font-bold text-text-main dark:text-slate-100 mb-2.5">Fatigue Level</p>
                        <div className="grid grid-cols-3 gap-2">
                            {FATIGUE_LEVELS.map(({ value, icon, color, activeBg }) => (
                                <button
                                    key={value}
                                    onClick={() => setFormData(p => ({ ...p, fatigue: value }))}
                                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-xs font-bold transition-all ${formData.fatigue === value
                                            ? activeBg
                                            : 'border-blue-50 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-text-muted'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-[22px] fill-1 ${formData.fatigue === value ? color : 'text-slate-300'}`}>{icon}</span>
                                    {value}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Medications */}
                {medications.length > 0 && (
                    <div className="card p-5">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[16px] fill-1">pill</span>
                            </div>
                            <h3 className="text-sm font-bold text-text-main dark:text-slate-100">Today's Medications</h3>
                        </div>
                        <div className="space-y-2">
                            {medications.map((med) => (
                                <div key={med.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-blue-50 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${med.isTolvaptan ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-primary/10'}`}>
                                            <span className={`material-symbols-outlined text-[16px] fill-1 ${med.isTolvaptan ? 'text-violet-600' : 'text-primary'}`}>{med.isTolvaptan ? 'pill_off' : 'pill'}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-text-main dark:text-slate-100">{med.name}</p>
                                            <p className="text-[10px] text-text-muted">{med.dosage} · {med.frequency}</p>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-emerald-500 text-[22px] fill-1">check_circle</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tolvaptan alert */}
                {medications.some(m => m.isTolvaptan) && (
                    <div className="card p-4 flex items-center gap-3 border-l-4 border-l-amber-400">
                        <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-600 text-[18px] fill-1">warning</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-text-main dark:text-slate-100">Tolvaptan Monitoring</p>
                            <p className="text-[11px] text-text-muted">Next liver function test due in 12 days</p>
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <div className="space-y-3 pt-1">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="btn-primary w-full h-14 text-base font-bold disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[20px] fill-1">save</span>
                                Log Entry
                            </>
                        )}
                    </button>
                    <a
                        href="/logs"
                        className="btn-outline w-full h-12 text-sm font-bold"
                    >
                        <span className="material-symbols-outlined text-[18px]">history</span>
                        View History
                    </a>
                </div>
            </div>
        </main>
    );
}
