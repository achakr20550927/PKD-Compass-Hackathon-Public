'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NotificationsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchNotifications();
        }
    }, [status, router]);

    const fetchNotifications = async () => {
        try {
            // Fetch real alerts and upcoming meds
            const [alertsRes, medsRes] = await Promise.all([
                fetch('/api/user/alerts'),
                fetch('/api/user/meds/upcoming')
            ]);

            let allNotifications: any[] = [];

            if (alertsRes.ok) {
                const alerts = await alertsRes.json();
                allNotifications = [...allNotifications, ...alerts.map((a: any) => ({
                    id: a.id,
                    type: 'alert',
                    title: 'Health Alert',
                    message: a.message,
                    time: new Date(a.triggeredAt).toLocaleString(),
                    icon: 'warning',
                    color: 'text-amber-500 bg-amber-50'
                }))];
            }

            if (medsRes.ok) {
                const meds = await medsRes.json();
                allNotifications = [...allNotifications, ...meds.map((m: any) => ({
                    id: m.id,
                    type: 'med',
                    title: 'Medication Reminder',
                    message: `Time to take your ${m.name} (${m.dosage})`,
                    time: m.time,
                    icon: 'pill',
                    color: 'text-primary bg-primary/5'
                }))];
            }

            setNotifications(allNotifications);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8faff] dark:bg-background-dark p-6 pb-24 font-lexend">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/dashboard" className="size-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 shadow-sm">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h1 className="text-2xl font-bold">Notifications</h1>
            </header>

            <div className="max-w-lg mx-auto space-y-4">
                {notifications.length > 0 ? (
                    notifications.map((notif) => (
                        <div key={notif.id} className="bg-white dark:bg-slate-900 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex gap-4 items-start transition-all hover:shadow-md">
                            <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.color}`}>
                                <span className="material-symbols-outlined text-[28px]">{notif.icon}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-[#111318] dark:text-white">{notif.title}</h3>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{notif.time}</span>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{notif.message}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 px-8">
                        <div className="bg-slate-100 dark:bg-slate-800 size-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <span className="material-symbols-outlined text-[40px]">notifications_off</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">No new notifications</h3>
                        <p className="text-slate-500 max-w-xs mx-auto">We'll let you know when there's something to report regarding your meds or health.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
