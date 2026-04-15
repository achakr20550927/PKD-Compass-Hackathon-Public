'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import DeleteButton from './DeleteButton';
import { interpretObservation } from '@/lib/interpretation';

export default function LabsClientPage({ initialData }: { initialData: any }) {
    const [view, setView] = useState<'labs' | 'symptoms'>('labs');
    const [timeframe, setTimeframe] = useState<'3m' | '6m' | '1y'>('6m');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const { labs, symptoms, egfrLabs, latestEGFR, latestCreatinine, latestBUN, latestUACR, profile } = initialData;

    const filteredLabs = useMemo(() => {
        let result = [...labs];
        if (startDate) result = result.filter(l => new Date(l.timestamp) >= new Date(startDate));
        if (endDate) result = result.filter(l => new Date(l.timestamp) <= new Date(endDate));
        return result;
    }, [labs, startDate, endDate]);

    const filteredSymptoms = useMemo(() => {
        let result = [...(symptoms || [])];
        if (startDate) result = result.filter(s => new Date(s.timestamp) >= new Date(startDate));
        if (endDate) result = result.filter(s => new Date(s.timestamp) <= new Date(endDate));
        return result;
    }, [symptoms, startDate, endDate]);

    const displayEgfrLabs = useMemo(() => {
        if (timeframe === '3m') return egfrLabs.slice(-3);
        if (timeframe === '1y') return [...egfrLabs, ...egfrLabs];
        return egfrLabs;
    }, [timeframe, egfrLabs]);

    const chartPath = useMemo(() => {
        if (displayEgfrLabs.length < 2) return "M0 110 Q 50 100, 100 80 T 200 60 T 300 45 T 400 40";
        const points = displayEgfrLabs.map((l: any, i: number) => ({
            x: (i / (displayEgfrLabs.length - 1)) * 400,
            y: 150 - (l.value / 120) * 150,
        }));
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) path += ` L ${points[i].x} ${points[i].y}`;
        return path;
    }, [displayEgfrLabs]);

    const egfrValue = latestEGFR?.value;
    const getCKDStage = (v: number) => {
        if (!v) return 'Unknown';
        if (v >= 90) return 'Stage 1'; if (v >= 60) return 'Stage 2';
        if (v >= 45) return 'Stage 3a'; if (v >= 30) return 'Stage 3b';
        if (v >= 15) return 'Stage 4'; return 'Stage 5';
    };

    const getInterpretation = (obs: any) => {
        if (!obs) return null;
        const history = labs.filter((l: any) => l.type === obs.type);
        return interpretObservation(obs, history, profile || {});
    };

    const creatInterp = getInterpretation(latestCreatinine);
    const bunInterp = getInterpretation(latestBUN);
    const uacrInterp = getInterpretation(latestUACR);

    const SUMMARY_CARDS = [
        { label: 'Creatinine', value: latestCreatinine?.value, unit: latestCreatinine?.unit || 'mg/dL', status: creatInterp?.label || '--', statusOk: creatInterp?.status === 'NORMAL' },
        { label: 'BUN', value: latestBUN?.value, unit: latestBUN?.unit || 'mg/dL', status: bunInterp?.label || '--', statusOk: bunInterp?.status === 'NORMAL' },
        { label: 'uACR', value: latestUACR?.value, unit: latestUACR?.unit || 'mg/g', status: uacrInterp?.label || '--', statusOk: uacrInterp?.status === 'NORMAL' },
    ];

    return (
        <main className="flex-1 overflow-y-auto pb-32 bg-background-light dark:bg-background-dark min-h-screen">
            {/* Sticky Header */}
            <header className="sticky top-0 z-20 flex items-center glass border-b border-white/40 dark:border-white/5 px-4 py-3 justify-between">
                <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-xl text-text-muted hover:bg-primary/10 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div className="flex flex-col items-center">
                    <h2 className="text-base font-bold text-text-main dark:text-slate-100">Health Logs</h2>
                    <p className="text-[11px] text-primary font-semibold">Track your progress</p>
                </div>
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isFilterOpen || startDate || endDate
                        ? 'bg-primary text-white shadow-glow-primary-sm'
                        : 'text-text-muted hover:bg-primary/10 hover:text-primary'
                        }`}
                >
                    <span className="material-symbols-outlined text-[20px]">{startDate || endDate ? 'filter_list' : 'calendar_today'}</span>
                </button>
            </header>

            <div className="max-w-md mx-auto px-4 pt-5 space-y-4">

                {/* Main View Toggle */}
                <div className="flex h-12 items-center bg-white dark:bg-card-dark rounded-2xl p-1 shadow-card border border-blue-50 dark:border-white/5">
                    {(['labs', 'symptoms'] as const).map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`flex-1 h-full rounded-xl text-sm font-black uppercase tracking-widest transition-all ${view === v
                                ? 'bg-primary text-white shadow-glow-primary-sm'
                                : 'text-text-muted hover:text-primary'
                                }`}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                {view === 'labs' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                        {/* Timeframe Tabs */}
                        <div className="flex h-11 items-center bg-white dark:bg-card-dark rounded-2xl p-1 shadow-card border border-blue-50 dark:border-white/5">
                            {(['3m', '6m', '1y'] as const).map((tf) => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    className={`flex flex-1 h-full items-center justify-center rounded-xl text-sm font-bold transition-all ${timeframe === tf
                                        ? 'bg-primary text-white shadow-glow-primary-sm'
                                        : 'text-text-muted hover:text-primary'
                                        }`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>

                        {/* eGFR Hero Card */}
                        <div className="card-hero relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white" />
                                <div className="absolute -bottom-10 -left-6 w-36 h-36 rounded-full bg-white" />
                            </div>
                            <div className="relative p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Estimated GFR</p>
                                    <div className="px-2.5 py-1 bg-white/20 text-white text-xs font-bold rounded-full">
                                        {getCKDStage(egfrValue)} · {timeframe.toUpperCase()}
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-2 mb-5">
                                    <span className="text-5xl font-black text-white tracking-tight">{egfrValue || '--'}</span>
                                    <span className="text-white/60 text-sm font-medium">mL/min/1.73m²</span>
                                </div>

                                {/* Chart */}
                                <div className="bg-white/10 rounded-2xl p-3">
                                    <div className="relative h-44 w-full">
                                        <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 150">
                                            <defs>
                                                <linearGradient id="labChartGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                                                    <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                                                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                                                </linearGradient>
                                            </defs>
                                            <path d={`${chartPath} V 150 H 0 Z`} fill="url(#labChartGrad)" />
                                            <path d={chartPath} fill="none" stroke="white" strokeLinecap="round" strokeWidth="3" className="transition-all duration-500" />
                                            {displayEgfrLabs.map((l: any, i: number) => {
                                                const x = (i / (displayEgfrLabs.length - 1)) * 400;
                                                const y = 150 - (l.value / 120) * 150;
                                                return (
                                                    <circle key={l.id + i} cx={x} cy={y}
                                                        fill="white" r={i === displayEgfrLabs.length - 1 ? 6 : 4}
                                                        stroke="rgba(255,255,255,0.4)" strokeWidth="2"
                                                    />
                                                );
                                            })}
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Metric Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            {SUMMARY_CARDS.map((c) => (
                                <div key={c.label} className="card p-3.5">
                                    <p className="label mb-1.5">{c.label}</p>
                                    <p className="text-xl font-black text-text-main dark:text-slate-100">{c.value || '--'}</p>
                                    <p className="text-[10px] text-text-muted mb-1">{c.unit}</p>
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${c.statusOk
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                                        }`}>
                                        {c.status}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Recent Results */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-bold text-text-main dark:text-slate-100">Recent Results</h3>
                                <div className="flex items-center gap-3">
                                    {(startDate || endDate) && (
                                        <button
                                            onClick={() => { setStartDate(''); setEndDate(''); }}
                                            className="text-[10px] font-bold text-red-500 uppercase tracking-wider hover:underline"
                                        >
                                            Clear
                                        </button>
                                    )}
                                    <span className="text-xs font-medium text-text-muted">{filteredLabs.length} entries</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {filteredLabs.map((lab: any) => {
                                    const interp = getInterpretation(lab);
                                    const isNormal = interp?.status === 'NORMAL';
                                    const isAttention = interp?.status === 'ATTENTION';
                                    const isDanger = interp?.status === 'DANGER' || interp?.status === 'CRITICAL';

                                    let borderColor = 'border-l-emerald-400';
                                    let bgColor = 'bg-emerald-50 dark:bg-emerald-900/20';
                                    let textColor = 'text-emerald-700';
                                    let valueColor = 'text-emerald-600';

                                    if (isAttention) {
                                        borderColor = 'border-l-amber-400';
                                        bgColor = 'bg-amber-50 dark:bg-amber-900/20';
                                        textColor = 'text-amber-700';
                                        valueColor = 'text-amber-600';
                                    } else if (isDanger) {
                                        borderColor = 'border-l-red-500';
                                        bgColor = 'bg-red-50 dark:bg-red-900/20';
                                        textColor = 'text-red-700';
                                        valueColor = 'text-red-600';
                                    }

                                    return (
                                        <div key={lab.id} className={`card flex items-center justify-between px-4 py-3 border-l-4 ${borderColor}`}>
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="text-sm font-bold text-text-main dark:text-slate-100">{lab.type}</p>
                                                <p className="text-[11px] text-text-muted">{formatDate(lab.timestamp)}</p>
                                                {interp && (
                                                    <p className="text-[10px] text-text-muted mt-1 italic line-clamp-1">{interp.message}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="text-right">
                                                    <p className={`text-base font-black ${valueColor}`}>
                                                        {lab.value} <span className="text-[10px] font-normal text-text-muted">{lab.unit}</span>
                                                    </p>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bgColor} ${textColor}`}>
                                                        {interp?.label || (isNormal ? 'In Range' : 'Attention')}
                                                    </span>
                                                </div>
                                                <DeleteButton id={lab.id} type="labs" />
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredLabs.length === 0 && (
                                    <div className="card px-4 py-12 flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-slate-200 dark:text-slate-700 text-5xl">lab_profile</span>
                                        <p className="text-text-muted text-sm font-medium">No lab results yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left duration-300">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-bold text-text-main dark:text-slate-100">Symptom History</h3>
                            <span className="text-xs font-medium text-text-muted">{filteredSymptoms.length} entries</span>
                        </div>

                        <div className="space-y-3">
                            {filteredSymptoms.map((s: any) => (
                                <div key={s.id} className="card p-5 border-l-4 border-l-primary relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                                    <div className="relative flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-black text-primary uppercase tracking-tight">{s.type}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.severity > 7 ? 'bg-red-50 text-red-600' :
                                                    s.severity > 3 ? 'bg-amber-50 text-amber-600' :
                                                        'bg-emerald-50 text-emerald-600'
                                                    }`}>
                                                    Severity: {s.severity}/10
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-text-muted mb-2 font-medium">{formatDate(s.timestamp)}</p>
                                            {s.details && (
                                                <p className="text-xs text-text-main dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 italic">
                                                    "{s.details}"
                                                </p>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <DeleteButton id={s.id} type="symptoms" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredSymptoms.length === 0 && (
                                <div className="card px-4 py-12 flex flex-col items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-200 dark:text-slate-700 text-5xl">medical_information</span>
                                    <p className="text-text-muted text-sm font-medium">No symptoms logged yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* FAB */}
            <Link
                href={view === 'labs' ? "/labs/add" : "/symptoms/add"}
                className="fixed bottom-28 right-5 w-14 h-14 bg-primary text-white rounded-2xl shadow-glow-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30"
            >
                <span className="material-symbols-outlined text-[28px]">add</span>
            </Link>

            {/* Filter Modal */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-6 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-t-4xl sm:rounded-4xl p-8 shadow-float border-t sm:border border-white/20 dark:border-white/5">
                        <div className="w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-text-main dark:text-slate-100">Filter Records</h2>
                            <button onClick={() => setIsFilterOpen(false)} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-text-muted hover:text-text-main transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <div className="space-y-5">
                            {[
                                { label: 'Start Date', value: startDate, setter: setStartDate },
                                { label: 'End Date', value: endDate, setter: setEndDate },
                            ].map(({ label, value, setter }) => (
                                <div key={label} className="space-y-1.5">
                                    <label className="label px-1 block">{label}</label>
                                    <input
                                        type="date"
                                        value={value}
                                        onChange={(e) => setter(e.target.value)}
                                        className="input w-full px-4"
                                        style={{ height: '52px' }}
                                    />
                                </div>
                            ))}
                            <button onClick={() => setIsFilterOpen(false)} className="btn-primary w-full h-14 text-base font-bold mt-2">
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
