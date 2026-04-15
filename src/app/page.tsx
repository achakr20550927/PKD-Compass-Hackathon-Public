'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import HelpButton from '@/components/HelpButton';

const FEATURE_TILES = [
    { icon: 'science', label: 'Lab Tracking', color: 'text-blue-400', bg: 'bg-blue-500/20', href: '/labs', delay: '0ms' },
    { icon: 'favorite', label: 'Heart Monitor', color: 'text-rose-400', bg: 'bg-rose-500/20', href: '/bp-monitoring', delay: '150ms' },
    { icon: 'monitoring', label: 'eGFR Trends', color: 'text-emerald-400', bg: 'bg-emerald-500/20', href: '/dashboard', delay: '100ms' },
    { icon: 'restaurant', label: 'Food Tracker', color: 'text-amber-400', bg: 'bg-amber-500/20', href: '/food-tracker', delay: '250ms' },
    { icon: 'pill', label: 'Medications', color: 'text-violet-400', bg: 'bg-violet-500/20', href: '/meds', delay: '50ms' },
    { icon: 'description', label: 'Documents', color: 'text-cyan-400', bg: 'bg-cyan-500/20', href: '/documents', delay: '200ms' },
    { icon: 'info', label: 'Info Hub', color: 'text-indigo-400', bg: 'bg-indigo-500/20', href: '/resources', delay: '300ms' },
    { icon: 'calendar_month', label: 'Organizer', color: 'text-orange-400', bg: 'bg-orange-500/20', href: '/care-organizer', delay: '350ms' },
];

const STATS = [
    { value: '6', label: 'CKD Stages Tracked' },
    { value: '∞', label: 'Lab Data Points' },
    { value: '24/7', label: 'Health Insights' },
];

export default function OnboardingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const handleDashboardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        router.push('/dashboard');
        setTimeout(() => {
            if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
                window.location.assign('/dashboard');
            }
        }, 250);
    };

    return (
        <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center px-6 pt-10 pb-32 relative overflow-hidden font-sans">

            {/* Background orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/30 blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-violet-600/20 blur-[100px]" />
                <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-indigo-500/20 blur-[100px]" />
            </div>

            {/* Help Button */}
            <div className="absolute top-6 right-6 z-10">
                <HelpButton />
            </div>

            {/* Hero Icon Grid */}
            <div className="relative grid grid-cols-3 gap-3 mb-10 w-full max-w-[260px]">
                {FEATURE_TILES.map((tile) => (
                    <Link
                        key={tile.label}
                        href={tile.href}
                        className={`aspect-square ${tile.bg} rounded-2xl flex flex-col items-center justify-center gap-1 border border-white/10 animate-float hover:scale-105 transition-transform active:scale-95`}
                        style={{ animationDelay: tile.delay }}
                    >
                        <span className={`material-symbols-outlined ${tile.color} text-[28px] fill-1`}>{tile.icon}</span>
                        <span className="text-[8px] font-bold text-white/50 uppercase tracking-wide leading-tight text-center px-1">{tile.label}</span>
                    </Link>
                ))}
            </div>

            {/* Text Content */}
            <div className="relative text-center max-w-sm animate-fade-up" style={{ animationDelay: '100ms' }}>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-full mb-4 border border-primary/30">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-primary text-xs font-bold uppercase tracking-widest">PKD Compass</span>
                </div>

                <h1 className="text-3xl font-black text-white tracking-tight leading-tight mb-3">
                    Take Control of Your{' '}
                    <span className="text-gradient">Kidney Health</span>
                </h1>
                <p className="text-slate-400 text-base leading-relaxed mb-8 font-medium">
                    Monitor eGFR, manage Tolvaptan therapy, track nutrition, and stay ahead of your PKD journey.
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    {STATS.map((stat) => (
                        <div key={stat.label} className="bg-white/5 rounded-2xl p-3 border border-white/10">
                            <p className="text-xl font-black text-white">{stat.value}</p>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* CTAs */}
                <div className="space-y-3 w-full">
                    <Link
                        href="/dashboard"
                        onClick={handleDashboardClick}
                        className="btn-primary w-full h-14 text-base font-bold hover:scale-[1.02] active:scale-95"
                    >
                        <span>Go to Dashboard</span>
                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </Link>

                    <div className="flex items-center justify-center gap-6 py-2 opacity-50">
                        {[['verified_user', 'Secure Data'], ['lock_person', 'Private Account'], ['encrypted', 'Protected Access']].map(([icon, text]) => (
                            <div key={icon} className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-white text-[14px] fill-1">{icon}</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
