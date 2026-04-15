import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import HelpButton from '@/components/HelpButton';
import MarkerCarousel from '@/components/MarkerCarousel';
import EGFRInfo from '@/components/EGFRInfo';
import UACRInfo from '@/components/UACRInfo';
import { interpretObservation } from '@/lib/interpretation';

async function getDashboardData(userId: string) {
    const labs = await db.observation.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 30
    });

    const profile = await db.profile.findUnique({ where: { userId } });

    const latestEGFR = labs.find((l: any) => l.type === 'EGFR');
    const egfrHistory = labs.filter((l: any) => l.type === 'EGFR').reverse();
    const latestUACR = labs.find((l: any) => l.type === 'UACR');
    const otherLabs = labs.filter((l: any) => ['POTASSIUM', 'SODIUM', 'PHOSPHORUS', 'BUN'].includes(l.type)).slice(0, 5);

    const interpretedLabs = labs.map(l => {
        const history = labs.filter(hl => hl.type === l.type);
        return {
            ...l,
            interpretation: interpretObservation(l, history, profile || {})
        };
    });

    const attentionCount = interpretedLabs.filter(l =>
        l.interpretation.status === 'ATTENTION' ||
        l.interpretation.status === 'DANGER' ||
        l.interpretation.status === 'CRITICAL'
    ).length;

    const uacrInterp = latestUACR ? interpretObservation(latestUACR, labs.filter(l => l.type === 'UACR'), profile || {}) : null;

    return { latestEGFR, egfrHistory, latestUACR, otherLabs, attentionCount, uacrInterp, profile, labs };
}

function getCKDStage(egfr: number | undefined): { stage: string; color: string; bg: string } {
    if (!egfr) return { stage: 'Unknown', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' };
    if (egfr >= 90) return { stage: 'Stage 1', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' };
    if (egfr >= 60) return { stage: 'Stage 2', color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/30' };
    if (egfr >= 45) return { stage: 'Stage 3a', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' };
    if (egfr >= 30) return { stage: 'Stage 3b', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30' };
    if (egfr >= 15) return { stage: 'Stage 4', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30' };
    if (egfr >= 15) return { stage: 'Stage 4', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30' };
    return { stage: 'Stage 5', color: 'text-rose-700', bg: 'bg-rose-50 dark:bg-rose-900/30' };
}

const LAB_COLORS: Record<string, string> = {
    POTASSIUM: 'from-orange-400 to-amber-500',
    SODIUM: 'from-blue-400 to-cyan-500',
    PHOSPHORUS: 'from-purple-400 to-violet-500',
    BUN: 'from-rose-400 to-pink-500',
};

const QUICK_ACTIONS = [
    { href: '/labs/add', icon: 'add_chart', label: 'Add Lab', gradient: 'from-blue-500 to-indigo-600' },
    { href: '/bp-monitoring', icon: 'favorite', label: 'Log BP', gradient: 'from-rose-500 to-pink-600' },
    { href: '/meds', icon: 'pill', label: 'Medications', gradient: 'from-emerald-500 to-teal-600' },
    { href: '/food-tracker', icon: 'restaurant', label: 'Food Log', gradient: 'from-amber-500 to-orange-600' },
    { href: '/symptoms/add', icon: 'personal_injury', label: 'Symptoms', gradient: 'from-violet-500 to-purple-600' },
    { href: '/documents', icon: 'description', label: 'Vault', gradient: 'from-gray-600 to-slate-700' },
];

export default async function Dashboard() {
    const session = await getServerSession(authOptions as any) as any;
    let userId = session?.user?.id as string | undefined;
    const sessionEmail = session?.user?.email as string | undefined;

    if (!userId && sessionEmail) {
        const fallbackUser = await db.user.findUnique({
            where: { email: sessionEmail },
            select: { id: true }
        });
        userId = fallbackUser?.id;
    }

    if (!userId) redirect('/login');

    const { latestEGFR, egfrHistory, latestUACR, otherLabs, attentionCount, uacrInterp, profile, labs } = await getDashboardData(userId);

    const uacrHistory = labs
        .filter((l: any) => l.type === 'UACR')
        .map(l => ({ value: l.value, timestamp: l.timestamp }))
        .reverse();

    const user: any = await db.user.findUnique({
        where: { id: userId },
        select: { gender: true, name: true } as any
    });

    const profileIcon = user?.gender === 'FEMALE' ? 'woman_2' : user?.gender === 'MALE' ? 'man_2' : 'account_circle';
    const firstName = user?.name?.split(' ')[0] || 'there';
    const ckd = getCKDStage(latestEGFR?.value);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <main className="bg-background-light dark:bg-background-dark min-h-screen">

            {/* ── Top Bar ── */}
            <header className="flex items-center justify-between px-5 py-3.5 glass border-b border-white/40 dark:border-white/5">
                <Link href="/profile" className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-glow-primary-sm">
                        <span className="material-symbols-outlined text-white text-[22px] fill-1">{profileIcon}</span>
                    </div>
                    <div>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest leading-none mb-0.5">Patient Portal</p>
                        <p className="text-sm font-bold text-text-main dark:text-slate-100 leading-none">{user?.name || 'Alex Johnson'}</p>
                    </div>
                </Link>
                <div className="flex items-center gap-1">
                    {/* <HelpButton /> */}
                    <Link href="/notifications" className="w-9 h-9 flex items-center justify-center rounded-xl text-text-muted hover:bg-primary/10 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[22px]">notifications</span>
                    </Link>
                    <Link href="/settings" className="w-9 h-9 flex items-center justify-center rounded-xl text-text-muted hover:bg-primary/10 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[22px]">settings</span>
                    </Link>
                </div>
            </header>

            <div className="max-w-md mx-auto px-4">

                {/* ── Greeting ── */}
                <div className="pt-6 pb-4">
                    <p className="text-text-muted text-sm font-medium">{greeting},</p>
                    <h1 className="text-2xl font-black text-text-main dark:text-slate-100 tracking-tight">{firstName} 👋</h1>
                </div>

                {/* ── UACR Alert (if elevated) ── */}
                {uacrInterp && uacrInterp.status !== 'NORMAL' && (
                    <Link
                        href="/education"
                        className={`block mb-4 p-4 rounded-2xl flex gap-3 items-start ${uacrInterp.status === 'CRITICAL' ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200'} border hover:bg-opacity-80 transition-all active:scale-[0.98] cursor-pointer`}
                    >
                        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${uacrInterp.status === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-500'}`}>
                            <span className="material-symbols-outlined text-white text-[18px] fill-1">report_problem</span>
                        </div>
                        <div className="flex-1">
                            <p className={`text-sm font-bold ${uacrInterp.status === 'CRITICAL' ? 'text-red-900 dark:text-red-200' : 'text-amber-900 dark:text-amber-200'}`}>{uacrInterp.label}</p>
                            <p className={`text-xs mt-0.5 ${uacrInterp.status === 'CRITICAL' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>{uacrInterp.message}</p>
                            <div className="inline-flex items-center gap-1 text-xs font-bold mt-1.5 hover:underline decoration-1 underline-offset-2">
                                Learn more <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </div>
                        </div>
                    </Link>
                )}

                {/* ── Lab Attention Alert ── */}
                {attentionCount > 0 && (
                    <Link
                        href="/labs/review"
                        className="block mb-6 p-5 rounded-3xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-all active:scale-[0.98] cursor-pointer shadow-sm relative z-10"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 shrink-0 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
                                    <span className="material-symbols-outlined text-white text-[20px] fill-1">warning</span>
                                </div>
                                <div>
                                    <p className="text-sm font-black text-red-900 dark:text-red-100">
                                        {attentionCount} {attentionCount === 1 ? 'result needs' : 'results need'} review
                                    </p>
                                    <p className="text-xs text-red-600/80 dark:text-red-300/80 font-medium">Critical lab updates available</p>
                                </div>
                            </div>
                            <div className="shrink-0 px-4 py-2 bg-red-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-600/20">
                                Review
                            </div>
                        </div>
                    </Link>
                )}

                {/* ── Health Trends Carousel ── */}
                <section className="mb-4">
                    <div className="card-hero relative overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white" />
                            <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white" />
                        </div>
                        <div className="relative p-5">
                            <MarkerCarousel
                                labs={labs}
                                egfrHistory={egfrHistory}
                                uacrHistory={uacrHistory}
                            />
                        </div>
                    </div>
                </section>
                {/* ── uACR Card ── */}
                <section className="mb-4">
                    <div className="card p-5 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                            <p className="text-text-muted text-xs font-bold uppercase tracking-widest">uACR (Proteinuria)</p>
                            <UACRInfo />
                        </div>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-4xl font-black text-text-main dark:text-slate-100 tracking-tight">{latestUACR?.value || '--'}</span>
                            <span className="text-text-muted text-sm font-medium">mg/g</span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-2.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: latestUACR ? `${Math.min((latestUACR.value / 300) * 100, 100)}%` : '0%',
                                    background: uacrInterp?.status === 'CRITICAL'
                                        ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                                        : uacrInterp?.status === 'DANGER'
                                            ? 'linear-gradient(90deg, #10B981, #F59E0B)'
                                            : 'linear-gradient(90deg, #10B981, #34D399)',
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${uacrInterp?.status === 'CRITICAL' ? 'text-red-500' :
                                uacrInterp?.status === 'DANGER' ? 'text-amber-500' :
                                    'text-emerald-600'
                                }`}>
                                {uacrInterp?.label || 'Normal Range'}
                            </span>
                            <span className="text-[10px] text-text-muted">Target: &lt;30 mg/g</span>
                        </div>
                    </div>
                </section>

                {/* ── Other Labs Strip ── */}
                {otherLabs.length > 0 && (
                    <section className="mb-4">
                        <p className="label mb-3 px-1">Recent Labs</p>
                        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                            {otherLabs.map((lab: any) => {
                                const interp = interpretObservation(lab, labs.filter((l: any) => l.type === lab.type), profile || {});
                                const gradient = LAB_COLORS[lab.type] || 'from-slate-400 to-slate-500';
                                return (
                                    <div key={lab.id} className="shrink-0 w-28 card p-3.5">
                                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-2`}>
                                            <span className="material-symbols-outlined text-white text-[14px] fill-1">science</span>
                                        </div>
                                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wide">{lab.type}</p>
                                        <p className="text-xl font-black text-text-main dark:text-slate-100 mt-0.5">{lab.value}</p>
                                        <p className="text-[10px] text-text-muted">{lab.unit}</p>
                                        {interp.status !== 'NORMAL' && (
                                            <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${interp.status === 'CRITICAL' || interp.status === 'DANGER'
                                                ? 'text-red-600 bg-red-50 dark:bg-red-900/20'
                                                : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                                                }`}>
                                                {interp.label.split(' ')[0]}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ── Quick Actions ── */}
                <section className="mb-4">
                    <p className="label mb-3 px-1">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-3">
                        {QUICK_ACTIONS.map((action) => (
                            <a
                                key={action.href}
                                href={action.href}
                                className="card p-4 flex items-center gap-3 hover:shadow-card-lg hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
                            >
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                                    <span className="material-symbols-outlined text-white text-[20px] fill-1">{action.icon}</span>
                                </div>
                                <span className="text-sm font-bold text-text-main dark:text-slate-100 leading-tight">{action.label}</span>
                            </a>
                        ))}
                    </div>
                </section>

            </div>
        </main>
    );
}
