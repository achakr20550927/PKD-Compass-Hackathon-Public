'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NutritionSettingsPage() {
    const router = useRouter();
    const [targets, setTargets] = useState<any>({
        sodiumMg: 2300,
        potassiumMg: 3500,
        phosphorusMg: 1000,
        proteinG: 60,
        fluidMl: 2500
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/nutrition-targets')
            .then(res => res.json())
            .then(data => {
                setTargets(data);
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch('/api/nutrition-targets', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(targets)
            });
            router.back();
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    return (
        <div className="max-w-md mx-auto px-4 pt-6 pb-24 min-h-screen bg-background-light dark:bg-background-dark">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="p-2 hover:bg-primary/5 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-primary">arrow_back</span>
                </button>
                <h1 className="text-xl font-black text-primary uppercase tracking-tight">Nutrition Settings</h1>
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-3xl border border-red-500/20 mb-8">
                <div className="flex gap-3 mb-2">
                    <span className="material-symbols-outlined text-red-500">info</span>
                    <p className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Medical Disclaimer</p>
                </div>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed font-bold italic">
                    Education only. Nutritional ranges vary based on your stage and health conditions. Please consult your clinician or renal dietitian before setting targets.
                </p>
            </div>

            <div className="space-y-6">
                {[
                    { label: 'Sodium Limit', key: 'sodiumMg', unit: 'mg', icon: 'salt' },
                    { label: 'Potassium Limit', key: 'potassiumMg', unit: 'mg', icon: 'potassium' },
                    { label: 'Phosphorus Limit', key: 'phosphorusMg', unit: 'mg', icon: 'nutrition' },
                    { label: 'Protein Target', key: 'proteinG', unit: 'g', icon: 'egg' },
                    { label: 'Fluid Target', key: 'fluidMl', unit: 'ml', icon: 'water_drop' },
                ].map((field) => (
                    <div key={field.key} className="bg-white dark:bg-card-dark p-6 rounded-3xl shadow-sm border border-primary/5">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-primary/40">{field.icon}</span>
                            <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest leading-none">{field.label}</label>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                value={targets[field.key]}
                                onChange={(e) => setTargets({ ...targets, [field.key]: e.target.value })}
                                className="w-full p-4 pr-16 rounded-2xl bg-primary/5 border border-primary/10 text-lg font-black text-primary outline-none focus:border-primary/50 transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/40 uppercase tracking-widest">{field.unit}</span>
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-5 rounded-3xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
                >
                    {saving ? 'Saving...' : 'Save Targets'}
                </button>
            </div>
        </div>
    );
}
