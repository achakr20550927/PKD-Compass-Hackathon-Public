'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const MOODS = [
    { label: 'Excellent', icon: 'sentiment_very_satisfied', color: 'text-success' },
    { label: 'Good', icon: 'sentiment_satisfied', color: 'text-primary' },
    { label: 'Fair', icon: 'sentiment_neutral', color: 'text-amber-500' },
    { label: 'Poor', icon: 'sentiment_dissatisfied', color: 'text-orange-500' },
    { label: 'Dreadful', icon: 'sentiment_very_dissatisfied', color: 'text-danger' }
];

export default function WellnessPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        mood: 'Good',
        weightKg: '',
        steps: '',
        activeMinutes: '',
        sleepHours: '',
        waterIntakeMl: '',
        notes: ''
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchLogs();
        }
    }, [status]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/wellness');
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
                if (data.length > 0) {
                    const today = new Date().toDateString();
                    const latest = data.find((l: any) => new Date(l.date).toDateString() === today);
                    if (latest) {
                        setForm({
                            mood: latest.mood || 'Good',
                            weightKg: latest.weightKg?.toString() || '',
                            steps: latest.steps?.toString() || '',
                            activeMinutes: latest.activeMinutes?.toString() || '',
                            sleepHours: latest.sleepHours?.toString() || '',
                            waterIntakeMl: latest.waterIntakeMl?.toString() || '',
                            notes: latest.notes || ''
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Fetch logs error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/wellness', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                fetchLogs();
                // Show toast or success
            }
        } catch (error) {
            console.error('Save error:', error);
        } finally {
            setSaving(false);
        }
    };

    if (status === 'loading' || (loading && logs.length === 0)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 pb-20">
            <header className="mb-8">
                <h1 className="text-3xl font-display font-bold dark:text-white mb-2">Daily Wellness</h1>
                <p className="text-text-muted">Log your vitals and mood to see how they correlate with your labs.</p>
            </header>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Mood Selection */}
                <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10 shadow-card">
                    <label className="text-sm font-bold text-text-muted uppercase tracking-wider block mb-4">How are you feeling today?</label>
                    <div className="flex justify-between gap-2">
                        {MOODS.map(m => (
                            <button
                                key={m.label}
                                type="button"
                                onClick={() => setForm({ ...form, mood: m.label })}
                                className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${form.mood === m.label
                                        ? 'bg-primary/10 border-2 border-primary'
                                        : 'bg-slate-50 dark:bg-slate-900 border-2 border-transparent grayscale opacity-60'
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-3xl ${m.color}`}>
                                    {m.icon}
                                </span>
                                <span className="text-[10px] font-bold dark:text-white uppercase">{m.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Vitals Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Weight */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10 shadow-card flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold text-text-muted uppercase block">Weight</span>
                            <div className="flex items-end gap-1 mt-1">
                                <input
                                    type="number"
                                    step="0.1"
                                    className="text-3xl font-display font-bold dark:text-white bg-transparent outline-none w-24"
                                    placeholder="0.0"
                                    value={form.weightKg}
                                    onChange={e => setForm({ ...form, weightKg: e.target.value })}
                                />
                                <span className="text-text-muted mb-1 text-sm font-medium">kg</span>
                            </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500">
                            <span className="material-symbols-outlined text-3xl">scale</span>
                        </div>
                    </div>

                    {/* Water */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10 shadow-card flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold text-text-muted uppercase block">Water Intake</span>
                            <div className="flex items-end gap-1 mt-1">
                                <input
                                    type="number"
                                    className="text-3xl font-display font-bold dark:text-white bg-transparent outline-none w-24"
                                    placeholder="0"
                                    value={form.waterIntakeMl}
                                    onChange={e => setForm({ ...form, waterIntakeMl: e.target.value })}
                                />
                                <span className="text-text-muted mb-1 text-sm font-medium">mL</span>
                            </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-500">
                            <span className="material-symbols-outlined text-3xl">water_drop</span>
                        </div>
                    </div>
                </div>

                {/* Activity Section */}
                <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10 shadow-card">
                    <label className="text-sm font-bold text-text-muted uppercase tracking-wider block mb-4">Activity & Sleep</label>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <span className="block text-[10px] text-text-muted uppercase font-bold mb-1">Steps</span>
                            <input
                                type="number"
                                className="w-full text-center text-xl font-bold dark:text-white bg-slate-50 dark:bg-slate-900 rounded-xl py-2"
                                placeholder="0"
                                value={form.steps}
                                onChange={e => setForm({ ...form, steps: e.target.value })}
                            />
                        </div>
                        <div className="text-center">
                            <span className="block text-[10px] text-text-muted uppercase font-bold mb-1">Active Min</span>
                            <input
                                type="number"
                                className="w-full text-center text-xl font-bold dark:text-white bg-slate-50 dark:bg-slate-900 rounded-xl py-2"
                                placeholder="0"
                                value={form.activeMinutes}
                                onChange={e => setForm({ ...form, activeMinutes: e.target.value })}
                            />
                        </div>
                        <div className="text-center">
                            <span className="block text-[10px] text-text-muted uppercase font-bold mb-1">Sleep (Hr)</span>
                            <input
                                type="number"
                                step="0.5"
                                className="w-full text-center text-xl font-bold dark:text-white bg-slate-50 dark:bg-slate-900 rounded-xl py-2"
                                placeholder="0"
                                value={form.sleepHours}
                                onChange={e => setForm({ ...form, sleepHours: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10 shadow-card">
                    <label className="text-sm font-bold text-text-muted uppercase tracking-wider block mb-2">Notes</label>
                    <textarea
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-primary transition-all outline-none dark:text-white resize-none"
                        placeholder="Any symptoms, dietary changes, or energy levels..."
                        rows={3}
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                    />
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-3xl shadow-glow-primary transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {saving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">save</span>
                            Save Daily Log
                        </>
                    )}
                </button>
            </form>

            <div className="mt-12">
                <h3 className="text-xl font-bold dark:text-white mb-4">Recent Wellness Logs</h3>
                <div className="space-y-3">
                    {logs.map(log => (
                        <div key={log.id} className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-white/10 flex justify-between items-center group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${MOODS.find(m => m.label === log.mood)?.color.replace('text-', 'bg-').replace('500', '500/10') || 'bg-slate-100'
                                    }`}>
                                    <span className={`material-symbols-outlined ${MOODS.find(m => m.label === log.mood)?.color || ''}`}>
                                        {MOODS.find(m => m.label === log.mood)?.icon || 'question_mark'}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-bold dark:text-white text-sm">{new Date(log.date).toLocaleDateString()}</h4>
                                    <p className="text-xs text-text-muted">{log.steps || 0} steps • {log.sleepHours || 0}h sleep</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="font-bold dark:text-white text-sm">{log.weightKg || '--'} kg</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
