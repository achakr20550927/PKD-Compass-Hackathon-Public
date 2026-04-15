'use client';

import { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import FoodSummary from '@/components/food/FoodSummary';
import MealSection from '@/components/food/MealSection';
import { useRouter } from 'next/navigation';

export default function FoodTrackerPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [diaryData, setDiaryData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchDiary = async (date: Date) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/diary/${format(date, 'yyyy-MM-dd')}`);
            setDiaryData(await res.json());
        } catch (err) { console.error('Failed to fetch diary:', err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDiary(selectedDate); }, [selectedDate]);

    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

    if (loading && !diaryData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-glow-primary animate-pulse">
                    <span className="material-symbols-outlined text-white text-[28px] fill-1">restaurant</span>
                </div>
                <p className="text-text-muted text-sm font-medium">Loading your diary...</p>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto pb-32 bg-background-light dark:bg-background-dark min-h-screen">

            {/* Sticky Header */}
            <header className="sticky top-0 z-20 glass border-b border-white/40 dark:border-white/5 px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-black text-text-main dark:text-slate-100">Food Diary</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push('/food-tracker/checked')}
                            className="flex items-center gap-1 text-[11px] font-bold text-text-muted hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/5"
                        >
                            <span className="material-symbols-outlined text-[16px]">fact_check</span>
                            Checked
                        </button>
                        <button
                            onClick={() => router.push('/food-tracker/settings')}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-text-muted hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">settings</span>
                        </button>
                    </div>
                </div>

                {/* Date Navigator */}
                <div className="flex items-center bg-white dark:bg-card-dark rounded-2xl shadow-card border border-blue-50 dark:border-white/5 overflow-hidden">
                    <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="flex-none w-11 flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/5 transition-colors h-12">
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <div className="flex-1 text-center">
                        <p className="text-sm font-bold text-text-main dark:text-slate-100">{format(selectedDate, 'EEEE, MMM d')}</p>
                        {!isToday && (
                            <button onClick={() => setSelectedDate(new Date())} className="text-[10px] font-bold text-primary hover:underline">
                                Jump to Today
                            </button>
                        )}
                        {isToday && <p className="text-[10px] text-primary font-semibold">Today</p>}
                    </div>
                    <button
                        onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                        disabled={isToday}
                        className="flex-none w-11 flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/5 transition-colors h-12 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            </header>

            <div className="px-4 pt-4 space-y-4">
                {/* Daily Summary */}
                {diaryData && (
                    <FoodSummary totals={diaryData.totals} target={diaryData.target} risk={diaryData.risk} />
                )}

                {/* Meal Sections */}
                <div className="space-y-3">
                    {['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS', 'OTHER'].map((mealType) => (
                        <MealSection
                            key={mealType}
                            type={mealType}
                            data={diaryData?.meals?.[mealType]}
                            date={format(selectedDate, 'yyyy-MM-dd')}
                            onRefresh={() => fetchDiary(selectedDate)}
                        />
                    ))}
                </div>
            </div>

            {/* FAB */}
            <button
                onClick={() => router.push(`/food-tracker/add?date=${format(selectedDate, 'yyyy-MM-dd')}`)}
                className="fixed bottom-28 right-5 w-14 h-14 bg-primary text-white rounded-2xl shadow-glow-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
            >
                <span className="material-symbols-outlined text-[28px]">add</span>
            </button>
        </div>
    );
}
