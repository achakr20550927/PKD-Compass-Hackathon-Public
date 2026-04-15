'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const FEATURE_CONSENTS = [
    {
        key: 'BLOOD_PRESSURE',
        title: 'Blood Pressure Tracking',
        description: 'Stores readings, trends, reminders, and report data. Informational only.'
    },
    {
        key: 'LABS_AND_SYMPTOMS',
        title: 'Labs & Symptoms',
        description: 'Stores lab values, symptom entries, uploads, charts, and interpretation support.'
    },
    {
        key: 'MEDICATIONS',
        title: 'Medications',
        description: 'Stores medication names, schedules, dosage data, reminders, and adherence history.'
    },
    {
        key: 'CARE_ORGANIZER',
        title: 'Care Organizer',
        description: 'Stores appointments, tasks, notes, provider details, and reminder timelines.'
    },
    {
        key: 'DOCUMENT_UPLOAD',
        title: 'Document Vault',
        description: 'Allows cloud storage and retrieval of uploaded PDF and image records.'
    },
    {
        key: 'DOCUMENT_AI_ANALYSIS',
        title: 'AI Document Analysis',
        description: 'Optional consumer-facing summaries generated from uploaded records.'
    },
    {
        key: 'REPORT_EXPORTS',
        title: 'Reports & Exports',
        description: 'Allows generation and sharing of sensitive health summaries and files.'
    },
];

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [joinedDate, setJoinedDate] = useState('');
    const [consents, setConsents] = useState<Record<string, boolean>>({});
    const [consentSaving, setConsentSaving] = useState<string | null>(null);
    const [consentError, setConsentError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchSettings();
        }
    }, [status, router]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/user/me');
            if (res.ok) {
                const data = await res.json();
                setNotificationsEnabled(data.notificationsEnabled);
                setConsents(data.consents || {});
                setJoinedDate(new Date(data.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }));
            }
            const consentRes = await fetch('/api/user/consents');
            if (consentRes.ok) {
                const consentData = await consentRes.json();
                setConsents(consentData.statuses || {});
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleNotifications = async () => {
        const newValue = !notificationsEnabled;
        setNotificationsEnabled(newValue);

        try {
            await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationsEnabled: newValue }),
            });
        } catch (error) {
            console.error('Failed to update notifications:', error);
            // Revert on error
            setNotificationsEnabled(!newValue);
        }
    };

    const toggleFeatureConsent = async (type: string) => {
        setConsentError('');
        setConsentSaving(type);
        try {
            const res = await fetch('/api/user/consents', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, status: !consents[type] }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || 'Failed to update consent');
            setConsents(data.statuses || {});
        } catch (error: any) {
            setConsentError(error?.message || 'Failed to update consent');
        } finally {
            setConsentSaving(null);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8faff] dark:bg-background-dark px-4 py-6 pb-24 font-lexend">
            <header className="max-w-md mx-auto flex items-center gap-4 mb-8">
                <Link href="/dashboard" className="size-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 shadow-sm">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h1 className="text-2xl font-bold">Settings</h1>
            </header>

            <div className="max-w-md mx-auto space-y-4">
                {/* Account Section */}
                <div className="bg-white dark:bg-slate-900 rounded-[32px] p-2 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="p-6">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-2">Preferences</h2>

                        <div className="flex items-center justify-between p-4 bg-[#f8faff] dark:bg-slate-800/50 rounded-2xl mb-4">
                            <div className="flex items-center gap-4">
                                <div className="size-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">notifications_active</span>
                                </div>
                                <span className="font-bold">Notifications</span>
                            </div>
                            <button
                                onClick={toggleNotifications}
                                className={`w-14 h-8 rounded-full p-1 transition-colors relative ${notificationsEnabled ? 'bg-primary' : 'bg-slate-300'}`}
                            >
                                <div className={`size-6 bg-white rounded-full transition-transform shadow-sm transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="bg-white dark:bg-slate-900 rounded-[32px] p-2 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="p-6">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-2">Info & Terms</h2>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="size-11 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                                        <span className="material-symbols-outlined">calendar_today</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Date Joined</p>
                                        <p className="font-bold">{joinedDate}</p>
                                    </div>
                                </div>
                            </div>

                            <Link href="/terms" className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="size-11 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                                        <span className="material-symbols-outlined">description</span>
                                    </div>
                                    <span className="font-bold">Terms of Use</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                            </Link>

                            <Link href="/privacy" className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="size-11 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                                        <span className="material-symbols-outlined">shield</span>
                                    </div>
                                    <span className="font-bold">Privacy Policy</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[32px] p-2 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="p-6">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-2">Feature Terms & Consents</h2>
                        <div className="space-y-3">
                            {FEATURE_CONSENTS.map((feature) => (
                                <div key={feature.key} className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#f8faff] dark:bg-slate-800/50">
                                    <div>
                                        <p className="font-bold">{feature.title}</p>
                                        <p className="text-sm text-text-muted">{feature.description}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleFeatureConsent(feature.key)}
                                        disabled={consentSaving === feature.key}
                                        className={`min-w-[96px] rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                                            consents[feature.key]
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-primary text-white hover:bg-primary-dark'
                                        } ${consentSaving === feature.key ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {consentSaving === feature.key ? 'Saving...' : consents[feature.key] ? 'Accepted' : 'Accept'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        {consentError && <p className="mt-3 text-sm text-red-500">{consentError}</p>}
                    </div>
                </div>

                {/* Logout Section */}
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full p-6 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 rounded-[32px] transition-all flex items-center justify-center gap-3 font-bold border border-red-100 dark:border-red-900/20 shadow-sm"
                >
                    <span className="material-symbols-outlined">logout</span>
                    Sign Out
                </button>
            </div>
        </div>
    );
}
