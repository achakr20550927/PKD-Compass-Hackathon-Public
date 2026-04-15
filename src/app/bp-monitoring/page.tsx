'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';

export default function BPMonitoringPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [summary, setSummary] = useState<any>(null);
    const [readings, setReadings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ day: number; type: 'AM' | 'PM' } | null>(null);

    const [form, setForm] = useState({
        systolic: '',
        diastolic: '',
        pulse: ''
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchData();
        }
    }, [status]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/bp-monitoring');
            const data = await res.json();
            setSummary(data.summary);
            setReadings(data.readings || []);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const startNewWeek = async () => {
        try {
            const res = await fetch('/api/bp-monitoring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'START_WEEK', weekStart: new Date() })
            });
            if (res.ok) fetchData();
        } catch (error) {
            console.error('Start week error:', error);
        }
    };

    const handleLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSlot || !summary) return;

        // Calculate the timestamp based on day and AM/PM
        const date = new Date(summary.weekStart);
        date.setDate(date.getDate() + selectedSlot.day);
        if (selectedSlot.type === 'AM') date.setHours(8, 0, 0, 0);
        else date.setHours(20, 0, 0, 0);

        try {
            const res = await fetch('/api/user/bp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systolic: parseInt(form.systolic),
                    diastolic: parseInt(form.diastolic),
                    pulse: parseInt(form.pulse) || 70,
                    timestamp: date.toISOString(),
                    notes: `Weekly Monitoring Day ${selectedSlot.day + 1} ${selectedSlot.type}`
                })
            });
            if (res.ok) {
                setIsLogModalOpen(false);
                fetchData();
                setForm({ systolic: '', diastolic: '', pulse: '' });
            }
        } catch (error) {
            console.error('Log error:', error);
        }
    };

    const getReading = (day: number, type: 'AM' | 'PM') => {
        if (!summary) return null;
        const targetDate = new Date(summary.weekStart);
        targetDate.setDate(targetDate.getDate() + day);
        const targetDayStr = targetDate.toDateString();

        return readings.find(r => {
            const rDate = new Date(r.timestamp);
            const rDayStr = rDate.toDateString();
            const rHour = rDate.getHours();
            const rType = rHour < 12 ? 'AM' : 'PM';
            return rDayStr === targetDayStr && rType === type;
        });
    };

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="max-w-4xl mx-auto p-4 flex flex-col items-center justify-center min-h-[80vh] text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6">
                    <span className="material-symbols-outlined text-4xl">calendar_view_week</span>
                </div>
                <h1 className="text-3xl font-display font-bold dark:text-white mb-2">Weekly BP Mode</h1>
                <p className="text-text-muted mb-8 max-w-md">
                    Nephrologists recommend a 7-day monitoring period (2x daily) to accurately assess your blood pressure trend.
                </p>
                <button
                    onClick={startNewWeek}
                    className="bg-primary text-white px-8 py-4 rounded-2xl font-bold shadow-glow-primary hover:scale-[1.02] transition-all"
                >
                    Start 7-Day Monitor
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 pb-20">
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-display font-bold dark:text-white mb-2">Weekly Monitor</h1>
                    <p className="text-text-muted">Day {Math.min(7, Math.floor((Date.now() - new Date(summary.weekStart).getTime()) / (24 * 60 * 60 * 1000)) + 1)} of 7</p>
                </div>
                <button
                    onClick={startNewWeek}
                    className="text-text-muted hover:text-primary transition-colors text-sm font-medium"
                >
                    Restart Week
                </button>
            </header>

            <div className="bg-white dark:bg-card-dark rounded-3xl overflow-hidden border border-white/10 shadow-card mb-8">
                <div className="grid grid-cols-8 border-b border-white/10 bg-slate-50 dark:bg-slate-900/50 p-4">
                    <div className="font-bold text-xs text-text-muted uppercase tracking-wider">Time</div>
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="text-center font-bold text-xs text-text-muted uppercase tracking-wider">Day {i + 1}</div>
                    ))}
                </div>

                {/* Morning Row */}
                <div className="grid grid-cols-8 p-4 items-center border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-lg">light_mode</span>
                        <span className="font-bold text-sm dark:text-white">AM</span>
                    </div>
                    {[...Array(7)].map((_, i) => {
                        const reading = getReading(i, 'AM');
                        return (
                            <div key={i} className="flex justify-center">
                                <Slot
                                    reading={reading}
                                    onClick={() => {
                                        setSelectedSlot({ day: i, type: 'AM' });
                                        setIsLogModalOpen(true);
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Evening Row */}
                <div className="grid grid-cols-8 p-4 items-center">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500 text-lg">dark_mode</span>
                        <span className="font-bold text-sm dark:text-white">PM</span>
                    </div>
                    {[...Array(7)].map((_, i) => {
                        const reading = getReading(i, 'PM');
                        return (
                            <div key={i} className="flex justify-center">
                                <Slot
                                    reading={reading}
                                    onClick={() => {
                                        setSelectedSlot({ day: i, type: 'PM' });
                                        setIsLogModalOpen(true);
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10">
                    <span className="text-xs font-bold text-text-muted uppercase block mb-1">Weekly Average</span>
                    <h3 className="text-3xl font-display font-bold dark:text-white">
                        {readings.length > 0
                            ? `${Math.round(readings.reduce((s, r) => s + r.systolic, 0) / readings.length)}/${Math.round(readings.reduce((s, r) => s + r.diastolic, 0) / readings.length)}`
                            : '-- / --'}
                    </h3>
                </div>
                <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10">
                    <span className="text-xs font-bold text-text-muted uppercase block mb-1">Completion</span>
                    <h3 className="text-3xl font-display font-bold dark:text-white">
                        {Math.round((readings.length / 14) * 100)}%
                    </h3>
                </div>
                <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10 flex items-center justify-center">
                    <button
                        disabled={readings.length < 10}
                        className="w-full bg-primary disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-all"
                    >
                        Generate Report
                    </button>
                </div>
            </div>

            {/* Log Modal */}
            <Modal
                isOpen={isLogModalOpen}
                onClose={() => setIsLogModalOpen(false)}
                title={`Log ${selectedSlot?.type} Reading (Day ${selectedSlot ? selectedSlot.day + 1 : ''})`}
            >
                <form onSubmit={handleLog} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">
                            <label className="block text-xs font-bold text-text-muted uppercase mb-2">Systolic</label>
                            <input
                                type="number"
                                required
                                className="w-full bg-transparent text-3xl font-display font-bold dark:text-white outline-none"
                                placeholder="120"
                                value={form.systolic}
                                onChange={e => setForm({ ...form, systolic: e.target.value })}
                            />
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">
                            <label className="block text-xs font-bold text-text-muted uppercase mb-2">Diastolic</label>
                            <input
                                type="number"
                                required
                                className="w-full bg-transparent text-3xl font-display font-bold dark:text-white outline-none"
                                placeholder="80"
                                value={form.diastolic}
                                onChange={e => setForm({ ...form, diastolic: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl">
                        <label className="block text-xs font-bold text-text-muted uppercase mb-2">Pulse Rate (BPM)</label>
                        <input
                            type="number"
                            className="w-full bg-transparent text-xl font-bold dark:text-white outline-none"
                            placeholder="70"
                            value={form.pulse}
                            onChange={e => setForm({ ...form, pulse: e.target.value })}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl shadow-glow-primary transition-all active:scale-[0.98]"
                    >
                        Save Reading
                    </button>
                </form>
            </Modal>
        </div>
    );
}

function Slot({ reading, onClick }: { reading: any; onClick: () => void }) {
    if (reading) {
        return (
            <div
                onClick={onClick}
                className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex flex-col items-center justify-center cursor-pointer hover:bg-primary/20 transition-all border border-primary/20 shadow-sm"
            >
                <span className="text-[10px] font-bold leading-none">{reading.systolic}</span>
                <span className="text-[10px] font-bold leading-none mt-0.5">{reading.diastolic}</span>
            </div>
        );
    }

    return (
        <button
            onClick={onClick}
            className="w-10 h-10 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center text-slate-300 dark:text-slate-700"
        >
            <span className="material-symbols-outlined text-lg">add</span>
        </button>
    );
}
