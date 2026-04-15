'use client';

import { useState, useEffect } from 'react';
import { scaleNutrients } from '@/lib/nutrition';

interface FoodDetailModalProps {
    item: any;
    mealType: string;
    date: string;
    onClose: () => void;
    onAdded: () => void;
}

export default function FoodDetailModal({ item, mealType, date, onClose, onAdded }: FoodDetailModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [selectedServing, setSelectedServing] = useState<any>(null);
    const [targets, setTargets] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (item.servingSizes && item.servingSizes.length > 0) {
            setSelectedServing(item.servingSizes[0]);
        } else {
            setSelectedServing({ name: '100g', weightG: 100 });
        }

        // Fetch targets for risk calculation
        fetch('/api/nutrition-targets')
            .then(res => res.json())
            .then(setTargets);
    }, [item]);

    if (!selectedServing) return null;

    // Calculate scaled nutrients using shared utility
    const currentNutrients = scaleNutrients(
        item.nutrients || { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0 },
        quantity,
        selectedServing?.name || '100g',
        item.servingSizes
    );

    const handleLog = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/diary/${date}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mealType,
                    itemType: item.type,
                    itemId: item.id,
                    quantity,
                    unit: selectedServing.name,
                    nutrientsSnapshot: currentNutrients
                })
            });

            if (res.ok) {
                onAdded();
            }
        } catch (err) {
            console.error('Logging failed:', err);
        } finally {
            setLoading(false);
        }
    };

    // Warnings
    const warnings = [];
    if (targets) {
        if (currentNutrients.potassium > (targets.potassiumMg || 3500) * 0.4) {
            warnings.push('High Potassium: This item contains >40% of your daily target.');
        }
        if (currentNutrients.sodium > (targets.sodiumMg || 2300) * 0.4) {
            warnings.push('High Sodium: This item contains >40% of your daily target.');
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-md bg-white dark:bg-card-dark rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="p-6 pb-0 flex justify-between items-start">
                    <div className="flex-1">
                        <h2 className="text-xl font-black text-primary leading-tight">{item.name}</h2>
                        <p className="text-xs font-bold text-primary/40 uppercase tracking-widest">{item.brand || 'Generic'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-primary/5 rounded-full text-primary/40">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* selectors */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-2 block">Serving Size</label>
                            <select
                                value={selectedServing?.name || ''}
                                onChange={(e) => setSelectedServing(item.servingSizes?.find((s: any) => s.name === e.target.value))}
                                className="w-full p-3 rounded-2xl bg-primary/5 border border-primary/10 text-sm font-bold text-primary outline-none appearance-none"
                            >
                                {(item.servingSizes || [{ name: '100g', weightG: 100 }]).map((s: any) => (
                                    <option key={s.name} value={s.name}>{s.name} ({s.weightG}g)</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-24">
                            <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-2 block">Quantity</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                                className="w-full p-3 rounded-2xl bg-primary/5 border border-primary/10 text-sm font-bold text-primary outline-none"
                            />
                        </div>
                    </div>

                    {/* Warnings */}
                    {warnings.length > 0 && (
                        <div className="space-y-2">
                            {warnings.map((w, i) => (
                                <div key={i} className="flex gap-3 bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-500/20">
                                    <span className="material-symbols-outlined text-red-500">warning</span>
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{w}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Nutrition Facts */}
                    <div className="bg-primary/[0.02] rounded-3xl p-5 border border-primary/5">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-1">Calories</p>
                                <p className="text-3xl font-black text-primary">{Math.round(currentNutrients.calories)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-1">Log to</p>
                                <div className="px-3 py-1 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                                    {mealType}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            {[
                                { label: 'Sodium', value: currentNutrients.sodium, unit: 'mg' },
                                { label: 'Potassium', value: currentNutrients.potassium, unit: 'mg' },
                                { label: 'Phosphorus', value: currentNutrients.phosphorus, unit: 'mg' },
                                { label: 'Protein', value: currentNutrients.protein, unit: 'g' },
                                { label: 'Fluid', value: currentNutrients.fluid, unit: 'ml' },
                            ].map((n) => (
                                <div key={n.label} className="flex justify-between items-center border-b border-primary/5 pb-1">
                                    <span className="text-xs font-bold text-primary/60">{n.label}</span>
                                    <span className="text-xs font-black text-primary">{Math.round(n.value)} {n.unit}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleLog}
                        disabled={loading}
                        className="w-full py-5 rounded-3xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Logging...' : 'Add to Meal'}
                    </button>
                </div>
            </div>
        </div>
    );
}
