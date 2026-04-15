import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LogsPage() {
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.user?.id) redirect('/login');
    const userId = session.user.id as string;

    const [bpLogs, symptomLogs] = await Promise.all([
        db.bloodPressureLog.findMany({ where: { userId }, orderBy: { timestamp: 'desc' }, take: 20 }),
        db.symptomLog.findMany({ where: { userId }, orderBy: { timestamp: 'desc' }, take: 20 }),
    ]);

    // Combine and sort
    const combined = [
        ...bpLogs.map((b: any) => ({ ...b, kind: 'BP' })),
        ...symptomLogs.map((s: any) => ({ ...s, kind: 'SX' })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const bpCount = bpLogs.length;
    const sxCount = symptomLogs.length;
    const avgSystolic = bpLogs.length > 0 ? Math.round(bpLogs.reduce((s: number, b: any) => s + b.systolic, 0) / bpLogs.length) : null;
    const avgDiastolic = bpLogs.length > 0 ? Math.round(bpLogs.reduce((s: number, b: any) => s + b.diastolic, 0) / bpLogs.length) : null;

    return (
        <main className="flex-1 overflow-y-auto pb-32 bg-background-light dark:bg-background-dark min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-20 flex items-center glass border-b border-white/40 dark:border-white/5 px-4 py-3 justify-between">
                <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-xl text-text-muted hover:bg-primary/10 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div className="text-center">
                    <h2 className="text-base font-bold text-text-main dark:text-slate-100">Health Logs</h2>
                    <p className="text-[11px] text-text-muted font-medium">{combined.length} entries</p>
                </div>
                <Link href="/log" className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                </Link>
            </header>

            <div className="max-w-md mx-auto px-4 pt-5 space-y-4">

                {/* BP Summary Card */}
                {avgSystolic && (
                    <div className="card-hero px-5 py-4 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white" />
                        </div>
                        <div className="relative flex items-start justify-between">
                            <div>
                                <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Average Blood Pressure</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-white tracking-tight">{avgSystolic}</span>
                                    <span className="text-white/60 text-lg font-bold">/</span>
                                    <span className="text-2xl font-black text-white">{avgDiastolic}</span>
                                    <span className="text-white/50 text-sm font-medium ml-1">mmHg</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-right">
                                <div className="bg-white/15 rounded-xl px-3 py-2">
                                    <p className="text-white/60 text-[10px] font-bold">BP Logs</p>
                                    <p className="text-white font-black text-xl">{bpCount}</p>
                                </div>
                                <div className="bg-white/15 rounded-xl px-3 py-2">
                                    <p className="text-white/60 text-[10px] font-bold">Symptoms</p>
                                    <p className="text-white font-black text-xl">{sxCount}</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative mt-3">
                            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${avgSystolic > 140 ? 'bg-red-400/30 text-red-100' :
                                avgSystolic > 120 ? 'bg-amber-400/30 text-amber-100' :
                                    'bg-emerald-400/30 text-emerald-100'
                                }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {avgSystolic > 140 ? 'Hypertension' : avgSystolic > 120 ? 'Elevated' : 'Normal Range'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Log Entries */}
                <div className="space-y-2.5">
                    {combined.map((entry: any) => {
                        const isBP = entry.kind === 'BP';
                        const href = isBP ? `/logs/${entry.id}` : `/logs/symptom/${entry.id}`;
                        const isHighBP = isBP && entry.systolic > 140;

                        return (
                            <Link
                                key={`${entry.kind}-${entry.id}`}
                                href={href}
                                className={`card flex items-center gap-3 px-4 py-3.5 hover:shadow-card-lg hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] ${isHighBP ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-emerald-400'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isBP
                                    ? isHighBP ? 'bg-gradient-to-br from-red-400 to-rose-500' : 'bg-gradient-to-br from-rose-400 to-pink-500'
                                    : 'bg-gradient-to-br from-violet-400 to-purple-500'
                                    } shadow-sm`}>
                                    <span className="material-symbols-outlined text-white text-[18px] fill-1">
                                        {isBP ? 'favorite' : 'checklist'}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    {isBP ? (
                                        <>
                                            <p className="text-sm font-bold text-text-main dark:text-slate-100">Blood Pressure</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className={`text-sm font-black ${isHighBP ? 'text-red-500' : 'text-text-main dark:text-slate-100'}`}>
                                                    {entry.systolic}/{entry.diastolic}
                                                    <span className="text-[10px] font-normal text-text-muted ml-1">mmHg</span>
                                                </p>
                                                {entry.heartRate && <span className="text-[11px] text-text-muted">· {entry.heartRate}bpm</span>}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm font-bold text-text-main dark:text-slate-100">
                                                {entry.type === 'DAILY_LOG' ? 'Daily Symptoms' : entry.type}
                                            </p>
                                            {entry.details && (
                                                <p className="text-xs text-text-muted mt-0.5 truncate">{entry.details}</p>
                                            )}
                                        </>
                                    )}
                                    <p className="text-[10px] text-text-muted mt-1">{formatDate(entry.timestamp)}</p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {isBP && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isHighBP ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                                            }`}>
                                            {isHighBP ? 'High' : 'Normal'}
                                        </span>
                                    )}
                                    <span className="material-symbols-outlined text-slate-200 dark:text-slate-700 text-[20px]">chevron_right</span>
                                </div>
                            </Link>
                        );
                    })}

                    {combined.length === 0 && (
                        <div className="card px-4 py-14 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl">history</span>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-text-main dark:text-slate-200">No logs yet</p>
                                <p className="text-xs text-text-muted mt-1">Start tracking your symptoms and blood pressure</p>
                            </div>
                            <Link href="/log" className="btn-primary px-5 h-10 text-sm font-bold">
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Log Today's Entry
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
