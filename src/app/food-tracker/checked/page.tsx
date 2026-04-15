'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';

export default function CheckedFoodsPage() {
    const router = useRouter();
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/checked-foods')
            .then(res => res.json())
            .then(data => {
                setEntries(data);
                setLoading(false);
            });
    }, []);

    // Group by date
    const grouped = entries.reduce((acc: any, entry: any) => {
        const date = entry.day.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(entry);
        return acc;
    }, {});

    return (
        <div className="max-w-md mx-auto px-4 pt-6 pb-24 min-h-screen bg-background-light dark:bg-background-dark">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="p-2 hover:bg-primary/5 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-primary">arrow_back</span>
                </button>
                <h1 className="text-xl font-black text-primary uppercase tracking-tight">Checked Foods</h1>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-12 opacity-60">
                    <span className="material-symbols-outlined text-6xl text-primary/10 mb-4">fact_check</span>
                    <p className="text-xs font-bold text-primary/40 uppercase tracking-widest">No checked items yet</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.keys(grouped).map((dateStr) => (
                        <div key={dateStr}>
                            <h2 className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-4 ml-2">
                                {format(parseISO(dateStr), 'EEEE, MMM d')}
                            </h2>
                            <div className="space-y-4">
                                {grouped[dateStr].map((entry: any) => {
                                    const item = entry.foodItem || entry.recipe;
                                    const name = entry.itemType === 'FOOD' ? item.name : item.title;
                                    return (
                                        <div
                                            key={entry.id}
                                            className="bg-white dark:bg-card-dark p-5 rounded-3xl shadow-sm border border-primary/5 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                                                    <span className="material-symbols-outlined">
                                                        {entry.itemType === 'FOOD' ? 'restaurant' : 'recipe'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-primary/80">{name}</h4>
                                                    <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                                                        {format(parseISO(entry.createdAt), 'h:mm a')} • {entry.mealType}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-green-500">check_circle</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
