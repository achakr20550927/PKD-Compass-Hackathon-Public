import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DeleteButton from '@/components/DeleteButton';
import MedsClient from '@/components/MedsClient';
import { startOfDay, endOfDay } from 'date-fns';

export default async function MedsPage() {
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.user?.id) redirect('/login');
    const userId = session.user.id as string;

    const meds = await db.medication.findMany({
        where: { userId, isActive: true },
        include: {
            logs: {
                where: {
                    scheduledAt: {
                        gte: startOfDay(new Date()),
                        lte: endOfDay(new Date()),
                    }
                }
            }
        }
    });

    const tolvaptan = meds.find((m: any) => m.isTolvaptan);
    const takenToday = meds.filter((m: any) => m.logs.some((l: any) => l.status === 'TAKEN')).length;

    return (
        <main className="flex-1 overflow-y-auto pb-32 bg-background-light dark:bg-background-dark min-h-screen">

            {/* Header */}
            <header className="sticky top-0 z-20 flex items-center glass border-b border-white/40 dark:border-white/5 px-4 py-3 justify-between">
                <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-xl text-text-muted hover:bg-primary/10 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div className="flex flex-col items-center">
                    <h2 className="text-base font-bold text-text-main dark:text-slate-100">Medications</h2>
                    <p className="text-[11px] text-primary font-semibold">Daily Adherence</p>
                </div>
                <div className="w-9 h-9" />
            </header>

            <div className="max-w-md mx-auto px-4 pt-5 pb-5 space-y-5">

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="card p-4">
                        <p className="label mb-1">Taken Today</p>
                        <p className="text-3xl font-black text-text-main dark:text-slate-100">{takenToday}/{meds.length}</p>
                        <p className={`text-xs font-bold mt-0.5 ${takenToday === meds.length && meds.length > 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {takenToday === meds.length && meds.length > 0 ? 'All Completed' : 'Pending Doses'}
                        </p>
                    </div>
                    <div className="card p-4">
                        <p className="label mb-1">Consistency</p>
                        <p className="text-3xl font-black text-text-main dark:text-slate-100">100%</p>
                        <p className="text-xs text-text-muted font-medium mt-0.5">Last 7 days</p>
                    </div>
                </div>

                {/* Medication List */}
                <MedsClient meds={meds} />

                {/* Tolvaptan Alert */}
                {tolvaptan && (
                    <div className="overflow-hidden rounded-3xl border border-violet-100 dark:border-violet-900/30 shadow-card">
                        <div style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)' }} className="px-5 pt-5 pb-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="inline-block text-[10px] font-bold text-violet-200 uppercase tracking-widest bg-white/15 px-2.5 py-1 rounded-full mb-2">
                                        Special Monitoring
                                    </span>
                                    <h4 className="font-black text-white text-lg leading-tight">{tolvaptan.name}</h4>
                                    <p className="text-violet-200 text-sm mt-0.5">{tolvaptan.dosage} · {tolvaptan.frequency}</p>
                                </div>
                                <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-[22px] fill-1">medication</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-card-dark px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-amber-600 text-[18px] fill-1">warning</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-text-main dark:text-slate-100">Liver Function Test Required</p>
                                    <p className="text-xs text-text-muted mt-0.5">REMS monitoring lab due in <strong className="text-amber-600">12 days</strong></p>
                                </div>
                                <Link href="/labs/add" className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FAB */}
            <Link href="/meds/add" className="fixed bottom-28 right-5 w-14 h-14 bg-primary text-white rounded-2xl shadow-glow-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-[28px]">add</span>
            </Link>
        </main>
    );
}
