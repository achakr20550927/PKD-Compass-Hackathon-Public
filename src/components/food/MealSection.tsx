'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MealSectionProps {
    type: string;
    data: any;
    date: string;
    onRefresh: () => void;
}

const MEAL_ICONS: Record<string, string> = {
    BREAKFAST: 'wb_sunny',
    LUNCH: 'light_mode',
    DINNER: 'bedtime',
    SNACKS: 'cookie',
    OTHER: 'more_horiz',
};

const MEAL_COLORS: Record<string, string> = {
    BREAKFAST: 'from-amber-400 to-orange-400',
    LUNCH: 'from-emerald-400 to-teal-400',
    DINNER: 'from-indigo-400 to-violet-500',
    SNACKS: 'from-pink-400 to-rose-400',
    OTHER: 'from-slate-400 to-slate-500',
};

export default function MealSection({ type, data, date, onRefresh }: MealSectionProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const router = useRouter();

    const mealName = type.charAt(0) + type.slice(1).toLowerCase();
    const entries = data?.entries || [];
    const totals = data?.totals || { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0 };

    const icon = MEAL_ICONS[type] || 'restaurant';
    const gradient = MEAL_COLORS[type] || 'from-slate-400 to-slate-500';

    const handleToggleChecked = async (entryId: string, checked: boolean) => {
        try {
            await fetch(`/api/diary/entries/${entryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checked: !checked })
            });
            onRefresh();
        } catch (err) {
            console.error('Failed to toggle checked:', err);
        }
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm('Are you sure you want to remove this item?')) return;
        try {
            await fetch(`/api/diary/entries/${entryId}`, { method: 'DELETE' });
            onRefresh();
        } catch (err) {
            console.error('Failed to delete entry:', err);
        }
    };

    return (
        <div className="bg-white dark:bg-card-dark rounded-3xl shadow-card border border-blue-50 dark:border-white/5 overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                        <span className="material-symbols-outlined text-white text-[18px] fill-1">{icon}</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-text-main dark:text-slate-100 leading-tight">{mealName}</h3>
                        <p className="text-[11px] text-text-muted leading-tight mt-0.5">
                            {Math.round(totals.calories)} kcal
                            {totals.protein > 0 ? ` · ${Math.round(totals.protein)}g protein` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {totals.sodium > 0 && (
                        <div className="hidden sm:flex items-center gap-2 text-right">
                            <div className="text-[10px] font-bold text-text-muted">
                                <span className="text-blue-400">Na</span> {Math.round(totals.sodium)} ·{' '}
                                <span className="text-orange-400">K</span> {Math.round(totals.potassium)}
                            </div>
                        </div>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/food-tracker/add?date=${date}&meal=${type}`); }}
                        className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                    <span className={`material-symbols-outlined text-text-muted text-[18px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                </div>
            </div>

            {/* Entry List */}
            {isExpanded && (
                <div className="border-t border-blue-50 dark:border-white/5">
                    {entries.length === 0 ? (
                        <div className="py-8 flex flex-col items-center gap-2 text-center">
                            <span className="material-symbols-outlined text-slate-200 dark:text-slate-700 text-4xl">{icon}</span>
                            <p className="text-xs text-text-muted italic">Nothing logged yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-blue-50 dark:divide-white/5">
                            {entries.map((entry: any) => {
                                const item = entry.foodItem || entry.recipe;
                                const name = entry.itemType === 'FOOD' ? item.name : item.title;
                                const sub = entry.itemType === 'FOOD' ? item.brand : 'Recipe';
                                const nutrients = entry.nutrientsSnapshot;

                                return (
                                    <div key={entry.id} className="px-4 py-3 flex items-center justify-between group">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <button
                                                onClick={() => handleToggleChecked(entry.id, entry.checked)}
                                                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${entry.checked
                                                    ? 'bg-primary border-primary text-white'
                                                    : 'border-slate-200 dark:border-slate-600 hover:border-primary/50'
                                                    }`}
                                            >
                                                {entry.checked && <span className="material-symbols-outlined text-[12px] fill-1">check</span>}
                                            </button>
                                            <div className="min-w-0">
                                                <h4 className={`text-sm font-semibold truncate ${entry.checked ? 'line-through text-text-muted' : 'text-text-main dark:text-slate-200'}`}>{name}</h4>
                                                <p className="text-[11px] text-text-muted">
                                                    {entry.quantity} {entry.unit} · {Math.round(nutrients.calories * (entry.quantity || 1))} kcal
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[11px] font-bold text-orange-500">K: {Math.round(nutrients.potassium * (entry.quantity || 1))}</p>
                                                <p className="text-[10px] text-text-muted">Na: {Math.round(nutrients.sodium * (entry.quantity || 1))}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteEntry(entry.id)}
                                                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-400 hover:text-red-600 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add Food Button Row */}
                    <div className="px-4 py-3 bg-slate-50/50 dark:bg-white/[0.02] flex gap-2">
                        <button
                            onClick={() => router.push(`/food-tracker/add?date=${date}&meal=${type}`)}
                            className="flex-1 h-10 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary-dark transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Add Food
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
