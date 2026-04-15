'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { interpretObservation, ClinicalProfile } from '@/lib/interpretation';

const OBSERVATION_TYPES = [
    // ... (rest same, omitting for brevity in targetContent match but I'll replace it carefully)
    { value: 'EGFR', label: 'eGFR', unit: 'mL/min/1.73m²', description: 'Estimated Glomerular Filtration Rate measures kidney function. Higher values indicate better kidney health. Normal is >90.' },
    { value: 'CREATININE', label: 'Serum Creatinine', unit: 'mg/dL', description: 'A waste product from muscle metabolism. Higher levels may indicate reduced kidney function. Normal range is 0.7-1.3 mg/dL.' },
    { value: 'POTASSIUM', label: 'Potassium', unit: 'mEq/L', description: 'An electrolyte essential for heart and muscle function. Kidney disease can cause potassium buildup. Normal range is 3.5-5.0.' },
    { value: 'SODIUM', label: 'Sodium', unit: 'mEq/L', description: 'An electrolyte that regulates fluid and blood pressure. Kidney disease affects sodium balance. Normal range is 135-145.' },
    { value: 'PHOSPHORUS', label: 'Phosphorus', unit: 'mg/dL', description: 'A mineral essential for bone health. Kidney disease reduces phosphorus excretion. Normal range is 2.5-4.5.' },
    { value: 'BUN', label: 'BUN', unit: 'mg/dL', description: 'Blood Urea Nitrogen, a waste product from protein breakdown. Higher levels may indicate kidney problems. Normal range is 7-20.' },
    { value: 'UACR', label: 'uACR', unit: 'mg/g', description: 'Urine Albumin-to-Creatinine Ratio measures protein in urine. Higher values indicate kidney damage. Normal is <30.' },
];

const TEST_DESCRIPTIONS: { [key: string]: string } = OBSERVATION_TYPES.reduce((acc, type) => {
    acc[type.value] = type.description;
    return acc;
}, {} as { [key: string]: string });

export default function LabsAddPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [profile, setProfile] = useState<ClinicalProfile | null>(null);
    const [formData, setFormData] = useState({
        type: 'EGFR',
        value: '',
        unit: 'mL/min/1.73m²',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetch('/api/user/profile')
            .then(res => res.ok ? res.json() : null)
            .then(data => data && setProfile(data.profile))
            .catch(err => console.error('Failed to fetch profile:', err));
    }, []);

    const handleTypeChange = (type: string) => {
        const selected = OBSERVATION_TYPES.find(t => t.value === type);
        setFormData(prev => ({
            ...prev,
            type,
            unit: selected?.unit || prev.unit
        }));
    };

    const val = parseFloat(formData.value);
    const interpretation = (!isNaN(val))
        ? interpretObservation({ type: formData.type, value: val, timestamp: new Date() }, [], profile || {})
        : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/labs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    value: parseFloat(formData.value),
                    timestamp: new Date(formData.date)
                })
            });

            if (res.ok) {
                router.push('/labs');
                router.refresh();
            } else {
                alert('Failed to save lab result');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex-1 overflow-y-auto pb-24 bg-white dark:bg-background-dark min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 border-b border-primary/10 justify-between">
                <button onClick={() => router.back()} className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-3xl">arrow_back</span>
                </button>
                <div className="flex flex-col items-center text-center">
                    <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-tight">Add Lab Result</h2>
                    <p className="text-xs text-primary font-medium">New Lab Obs</p>
                </div>
                <div className="size-10"></div>
            </header>

            <form onSubmit={handleSubmit} className="px-4 py-8 space-y-8 max-w-md mx-auto">
                {/* Observation Type */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary">science</span>
                        <h3 className="text-xl font-bold tracking-tight">Test Type</h3>
                        <button
                            type="button"
                            onClick={() => setShowInfo(!showInfo)}
                            className="ml-auto p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                            title="View test type information"
                        >
                            <span className="material-symbols-outlined">info</span>
                        </button>
                    </div>

                    {/* Info Tooltip */}
                    {showInfo && (
                        <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-primary text-sm">What is {OBSERVATION_TYPES.find(t => t.value === formData.type)?.label}?</h4>
                                <button
                                    type="button"
                                    onClick={() => setShowInfo(false)}
                                    className="text-primary hover:bg-primary/10 rounded p-0.5"
                                >
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>
                            <p className="text-sm text-[#616f89] leading-relaxed">{TEST_DESCRIPTIONS[formData.type]}</p>
                        </div>
                    )}

                    <div className="relative">
                        <select
                            value={formData.type}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            className="w-full h-14 pl-4 pr-12 rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white appearance-none font-semibold transition-all"
                        >
                            {OBSERVATION_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none">expand_more</span>
                    </div>
                </section>

                {/* Value Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary">analytics</span>
                        <h3 className="text-xl font-bold tracking-tight">Value <span className="text-sm font-normal text-[#616f89] ml-1">({formData.unit})</span></h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.value}
                            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                            className={`w-full h-20 text-center text-4xl font-bold rounded-2xl border-2 focus:ring-0 transition-all ${interpretation && interpretation.status !== 'NORMAL'
                                    ? (interpretation.status === 'ATTENTION' ? 'border-amber-300 bg-amber-50/30' : 'border-red-300 bg-red-50/30')
                                    : 'border-primary/10 focus:border-primary'
                                } bg-background-light dark:bg-slate-800 dark:text-white`}
                            placeholder="0.00"
                        />

                        {interpretation && (
                            <div className={`mt-2 p-4 rounded-2xl border flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2 ${interpretation.status === 'NORMAL' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-200' :
                                    interpretation.status === 'ATTENTION' ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30 text-amber-800 dark:text-amber-200' :
                                        'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800/30 text-red-800 dark:text-red-200'
                                }`}>
                                <span className="material-symbols-outlined mt-0.5 fill-1">
                                    {interpretation.status === 'NORMAL' ? 'check_circle' : 'warning'}
                                </span>
                                <div className="flex-1">
                                    <p className="text-sm font-bold tracking-tight">{interpretation.label}</p>
                                    <p className="text-xs opacity-90 leading-relaxed font-medium mt-0.5">{interpretation.message}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Date Selection */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary">calendar_today</span>
                        <h3 className="text-xl font-bold tracking-tight">Date of Test</h3>
                    </div>
                    <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full h-14 px-4 rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white font-semibold transition-all"
                    />
                </section>

                {/* Save Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 mt-10"
                >
                    <span className="material-symbols-outlined">save</span>
                    {loading ? 'Saving...' : 'Save Lab Result'}
                </button>
            </form>
        </main>
    );
}
