'use client';

interface SummaryProps {
    totals: {
        calories: number;
        protein: number;
        sodium: number;
        potassium: number;
        phosphorus: number;
        fluid: number;
    };
    target: {
        sodiumMg: number;
        potassiumMg: number;
        phosphorusMg: number;
        proteinG: number;
        fluidMl: number;
    };
    risk: {
        sodium: number;
        potassium: number;
        phosphorus: number;
        protein: number;
        fluid: number;
    };
}

export default function FoodSummary({ totals, target, risk }: SummaryProps) {
    const nutrients = [
        { label: 'Sodium', value: totals.sodium, target: target.sodiumMg, unit: 'mg', key: 'sodium' },
        { label: 'Potassium', value: totals.potassium, target: target.potassiumMg, unit: 'mg', key: 'potassium' },
        { label: 'Phosphorus', value: totals.phosphorus, target: target.phosphorusMg, unit: 'mg', key: 'phosphorus' },
        { label: 'Protein', value: totals.protein, target: target.proteinG, unit: 'g', key: 'protein' },
        { label: 'Fluid', value: totals.fluid, target: target.fluidMl, unit: 'ml', key: 'fluid' },
    ];

    const getBarColor = (pct: number) => {
        if (pct < 70) return 'bg-emerald-500';
        if (pct < 100) return 'bg-amber-400';
        return 'bg-red-500';
    };

    const getTextColor = (pct: number) => {
        if (pct < 70) return 'text-emerald-500';
        if (pct < 100) return 'text-amber-500';
        return 'text-red-500';
    };

    const getStatus = (pct: number) => {
        if (pct < 70) return 'Good';
        if (pct < 100) return 'Moderate';
        return 'High';
    };

    const overallRisk = Math.max(...Object.values(risk));

    return (
        <div className="overflow-hidden rounded-3xl shadow-card-lg">
            {/* Hero Calories Banner */}
            <div className="card-hero px-6 py-5 flex items-center justify-between">
                <div>
                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Today's Calories</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black tracking-tight">{Math.round(totals.calories)}</span>
                        <span className="text-white/60 text-base font-medium">kcal</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-2">PKD Risk</p>
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${overallRisk >= 100 ? 'bg-red-500/30 text-red-100' :
                            overallRisk >= 70 ? 'bg-amber-400/30 text-amber-100' :
                                'bg-emerald-500/30 text-emerald-100'
                        }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {overallRisk >= 100 ? 'High' : overallRisk >= 70 ? 'Moderate' : 'Healthy'}
                    </div>
                </div>
            </div>

            {/* Nutrient Breakdown */}
            <div className="bg-white dark:bg-card-dark px-6 py-5 space-y-4">
                {nutrients.map((n) => {
                    const pct = risk[n.key as keyof typeof risk];
                    const width = Math.min(pct, 100);
                    return (
                        <div key={n.key}>
                            <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-block w-2 h-2 rounded-full ${getBarColor(pct)}`} />
                                    <span className="text-sm font-semibold text-text-main dark:text-slate-200">{n.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-text-muted">
                                        {Math.round(n.value)}<span className="opacity-60">/{n.target}{n.unit}</span>
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-wide ${getTextColor(pct)}`}>
                                        {getStatus(pct)}
                                    </span>
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${getBarColor(pct)}`}
                                    style={{ width: `${width}%` }}
                                />
                            </div>
                            {pct >= 100 && (
                                <p className="text-[10px] text-red-500 font-bold mt-1">
                                    ⚠ Above daily limit — consult your care team.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
