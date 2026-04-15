'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MEDICATIONS_DB } from '@/lib/medications';

export default function MedsAddPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        dosage: '',
        frequency: 'DAILY',
        time: '08:00',
        isTolvaptan: false
    });

    // Request permissions on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            Notification.requestPermission();
        }
    }, []);

    const sendTestNotification = async () => {
        // 1. Try Native Mobile Bridge
        if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
            (window as any).ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SCHEDULE_NOTIFICATION',
                title: 'Test Notification',
                body: 'Your notification system is working!',
                seconds: 5
            }));
            alert('Test notification sent to mobile device. It should appear in 5 seconds.');
            return;
        }

        // 2. Fallback to Browser Notifications
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission !== 'granted') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    alert('Browser notification permission was denied.');
                    return;
                }
            }

            alert('Test notification scheduled in browser. Keep this tab open! It should appear in 5 seconds.');

            window.dispatchEvent(new CustomEvent('SCHEDULE_WEB_NOTIFICATION', {
                detail: {
                    title: 'Test Notification',
                    body: 'Your browser notification system is working!',
                    delay: 5000
                }
            }));
        } else {
            alert('This browser does not support desktop notifications.');
        }
    };

    const filteredMeds = useMemo(() => {
        if (!searchQuery) return [];
        return MEDICATIONS_DB.filter(m =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.brand.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/meds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    startDate: new Date()
                })
            });

            if (res.ok) {
                // --- Notification Scheduling Logic ---
                const schedule = async (name: string, dose: string, timeStr: string, freq: string) => {
                    const [hours, minutes] = timeStr.split(':').map(Number);

                    // 1. Bridge to Expo for Native Notifications
                    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
                        try {
                            (window as any).ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'SCHEDULE_NOTIFICATION',
                                title: `Time for ${name}`,
                                body: `Dosage: ${dose}. Please confirm once taken.`,
                                hour: hours,
                                minute: minutes,
                                repeats: true
                            }));
                        } catch (e) {
                            console.error('Native bridge error:', e);
                        }
                    }

                    // 2. Browser Notifications (Web)
                    if (typeof window !== 'undefined' && 'Notification' in window) {
                        if (Notification.permission === 'granted') {
                            // Immediate confirmation
                            new Notification('Reminder Set', {
                                body: `${name} (${dose}) scheduled for ${timeStr}`,
                                icon: '/favicon.ico'
                            });

                            // Future scheduling (Web Fallback)
                            const [h, m] = timeStr.split(':').map(Number);
                            const now = new Date();
                            const scheduled = new Date();
                            scheduled.setHours(h, m, 0, 0);

                            // If time has already passed today, schedule for tomorrow
                            if (scheduled <= now) {
                                scheduled.setDate(scheduled.getDate() + 1);
                            }

                            const delay = scheduled.getTime() - now.getTime();
                            console.log(`Scheduling web notification in ${delay}ms for ${timeStr}`);

                            window.dispatchEvent(new CustomEvent('SCHEDULE_WEB_NOTIFICATION', {
                                detail: {
                                    title: `Time for ${name}`,
                                    body: `Dosage: ${dose}. Please take your medication.`,
                                    delay: delay
                                }
                            }));
                        }
                    }
                };

                // Schedule the primary time
                await schedule(formData.name, formData.dosage, formData.time, formData.frequency);

                // Handle additional times for higher frequencies
                if (formData.frequency === 'BID') {
                    const [h, m] = formData.time.split(':').map(Number);
                    const secondTime = `${(h + 12) % 24}:${m.toString().padStart(2, '0')}`;
                    await schedule(formData.name, formData.dosage, secondTime, formData.frequency);
                } else if (formData.frequency === 'TID') {
                    const [h, m] = formData.time.split(':').map(Number);
                    const secondTime = `${(h + 8) % 24}:${m.toString().padStart(2, '0')}`;
                    const thirdTime = `${(h + 16) % 24}:${m.toString().padStart(2, '0')}`;
                    await schedule(formData.name, formData.dosage, secondTime, formData.frequency);
                    await schedule(formData.name, formData.dosage, thirdTime, formData.frequency);
                }

                router.push('/meds');
                router.refresh();
            } else {
                alert('Failed to save medication');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const selectMed = (med: typeof MEDICATIONS_DB[0]) => {
        setFormData(p => ({ ...p, name: med.name, isTolvaptan: med.name === 'Tolvaptan' }));
        setSearchQuery(med.name);
        setShowDropdown(false);
    };

    return (
        <main className="flex-1 overflow-y-auto pb-24 bg-white dark:bg-background-dark min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 border-b border-primary/10 justify-between">
                <button onClick={() => router.back()} className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-3xl">arrow_back</span>
                </button>
                <div className="flex flex-col items-center text-center">
                    <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-tight">Add Medication</h2>
                    <p className="text-xs text-primary font-medium">New Prescription</p>
                </div>
                <div className="size-10"></div>
            </header>

            <form onSubmit={handleSubmit} className="px-4 py-8 space-y-8 max-w-md mx-auto">
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary">medication</span>
                        <h3 className="text-xl font-bold tracking-tight">Drug Details</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 relative">
                            <label className="text-sm font-medium text-[#616f89] px-1">Drug Name / Search</label>
                            <input
                                type="text"
                                required
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowDropdown(true);
                                    setFormData(p => ({ ...p, name: e.target.value }));
                                }}
                                onFocus={() => setShowDropdown(true)}
                                className="w-full h-14 px-4 rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white font-semibold transition-all"
                                placeholder="Search e.g. Lisinopril..."
                            />
                            {showDropdown && filteredMeds.length > 0 && (
                                <div className="absolute top-24 left-0 right-0 z-20 bg-white dark:bg-slate-800 border-2 border-primary/10 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                    {filteredMeds.map(med => (
                                        <button
                                            key={med.name}
                                            type="button"
                                            onClick={() => selectMed(med)}
                                            className="w-full text-left p-4 hover:bg-primary/5 border-b border-primary/5 last:border-0"
                                        >
                                            <p className="font-bold text-sm">{med.name} <span className="text-xs font-normal text-slate-400">({med.brand})</span></p>
                                            <p className="text-[10px] text-primary">{med.class}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-[#616f89] px-1">Dosage</label>
                            <input
                                type="text"
                                required
                                value={formData.dosage}
                                onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                                className="w-full h-14 px-4 rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white font-semibold transition-all"
                                placeholder="e.g. 20mg"
                            />
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[#616f89] px-1">Frequency</label>
                        <select
                            value={formData.frequency}
                            onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                            className="w-full h-14 px-4 rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white font-semibold transition-all appearance-none"
                        >
                            <option value="DAILY">Daily</option>
                            <option value="BID">Twice Daily</option>
                            <option value="TID">Three times</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[#616f89] px-1">Time</label>
                        <input
                            type="time"
                            required
                            value={formData.time}
                            onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                            className="w-full h-14 px-4 rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white font-semibold transition-all"
                        />
                    </div>
                </section>

                <section>
                    <div
                        onClick={() => setFormData(p => ({ ...p, isTolvaptan: !p.isTolvaptan }))}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${formData.isTolvaptan ? 'border-primary bg-primary/5' : 'border-primary/10 bg-white dark:bg-slate-900'}`}
                    >
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">Tolvaptan / Jynarque</span>
                            <span className="text-[10px] text-[#616f89]">Enables special liver monitoring reminders</span>
                        </div>
                        <span className={`material-symbols-outlined ${formData.isTolvaptan ? 'text-primary' : 'text-slate-300'}`}>
                            {formData.isTolvaptan ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                    </div>
                </section>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 mt-10"
                >
                    <span className="material-symbols-outlined">notifications_active</span>
                    {loading ? 'Saving...' : 'Set Reminder'}
                </button>

                <button
                    type="button"
                    onClick={sendTestNotification}
                    className="w-full bg-white dark:bg-slate-900 text-primary border-2 border-primary/20 hover:bg-primary/5 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 mt-4"
                >
                    <span className="material-symbols-outlined">bug_report</span>
                    Test Device Notification (5s)
                </button>
            </form>
        </main>
    );
}
