'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import SparkLine from '@/components/SparkLine';

export default function ImagingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        type: 'MRI',
        date: '',
        facility: '',
        notes: '',
        tkv: '',
        leftLength: '',
        rightLength: ''
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchEvents();
        }
    }, [status]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/imaging');
            if (res.ok) setEvents(await res.json());
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const metrics = [];
        if (form.tkv) metrics.push({ metricName: 'TKV', value: form.tkv, unit: 'mL' });
        if (form.leftLength) metrics.push({ metricName: 'LEFT_LENGTH', value: form.leftLength, unit: 'cm' });
        if (form.rightLength) metrics.push({ metricName: 'RIGHT_LENGTH', value: form.rightLength, unit: 'cm' });

        try {
            const res = await fetch('/api/imaging', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, metrics })
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchEvents();
                setForm({ type: 'MRI', date: '', facility: '', notes: '', tkv: '', leftLength: '', rightLength: '' });
            }
        } catch (error) {
            console.error('Save error:', error);
        }
    };

    // Prepare chart data
    const tkvData = events
        .filter(e => e.metrics.some((m: any) => m.metricName === 'TKV'))
        .map(e => ({
            value: e.metrics.find((m: any) => m.metricName === 'TKV').value,
            timestamp: new Date(e.date)
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const lengthData = events
        .filter(e => e.metrics.some((m: any) => m.metricName === 'LEFT_LENGTH'))
        .map(e => ({
            value: e.metrics.find((m: any) => m.metricName === 'LEFT_LENGTH').value,
            timestamp: new Date(e.date)
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 pb-20">
            <header className="mb-8">
                <h1 className="text-3xl font-display font-bold text-text-main dark:text-white mb-2">Imaging & TKV</h1>
                <p className="text-text-muted">Track kidney volume and size progression.</p>
            </header>

            {/* Analytics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10 shadow-card">
                    <SparkLine
                        data={tkvData}
                        label="Total Kidney Volume"
                        unit="mL"
                        color="#4F80FF"
                    />
                </div>
                <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10 shadow-card">
                    <SparkLine
                        data={lengthData}
                        label="Kidney Length (Left)"
                        unit="cm"
                        color="#10B981"
                    />
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold dark:text-white">Imaging History</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
                >
                    <span className="material-symbols-outlined">add</span>
                    Record Imaging
                </button>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
                {events.length === 0 ? (
                    <div className="p-12 text-center bg-white dark:bg-card-dark rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">image_search</span>
                        <p className="text-slate-500">No imaging records found.</p>
                    </div>
                ) : (
                    events.map(event => (
                        <ImagingCard key={event.id} event={event} />
                    ))
                )}
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Record Imaging Event"
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-1">Modality</label>
                            <select
                                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                                value={form.type}
                                onChange={e => setForm({ ...form, type: e.target.value })}
                            >
                                <option>MRI</option>
                                <option>Ultrasound</option>
                                <option>CT Scan</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-1">Date</label>
                            <input
                                type="date"
                                required
                                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Facility Name</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                            placeholder="e.g., General Hospital"
                            value={form.facility}
                            onChange={e => setForm({ ...form, facility: e.target.value })}
                        />
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                        <h4 className="font-bold text-sm mb-3">Key Metrics</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">TKV (mL)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white text-sm"
                                    value={form.tkv}
                                    onChange={e => setForm({ ...form, tkv: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Left (cm)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white text-sm"
                                    value={form.leftLength}
                                    onChange={e => setForm({ ...form, leftLength: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Right (cm)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white text-sm"
                                    value={form.rightLength}
                                    onChange={e => setForm({ ...form, rightLength: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-muted mb-1">Notes</label>
                        <textarea
                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:text-white"
                            placeholder="Liver cysts, complexity, etc..."
                            rows={3}
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-2xl shadow-glow-primary transition-all active:scale-[0.98]"
                    >
                        Save Imaging Record
                    </button>
                </form>
            </Modal>
        </div>
    );
}

function ImagingCard({ event }: { event: any }) {
    const tkv = event.metrics.find((m: any) => m.metricName === 'TKV');
    const left = event.metrics.find((m: any) => m.metricName === 'LEFT_LENGTH');
    const right = event.metrics.find((m: any) => m.metricName === 'RIGHT_LENGTH');

    return (
        <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-white/10 shadow-card animate-fade-up">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-primary">visibility</span>
                        <h3 className="font-bold dark:text-white">{event.type}</h3>
                    </div>
                    <p className="text-xs text-text-muted">
                        {new Date(event.date).toLocaleDateString()} • {event.facility || 'Unknown Facility'}
                    </p>
                </div>
                <button className="text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">more_vert</span>
                </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {tkv && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-center">
                        <span className="block text-[8px] font-bold text-text-muted uppercase">TKV</span>
                        <span className="font-bold dark:text-white">{tkv.value}</span>
                        <span className="text-[8px] text-text-muted ml-0.5">mL</span>
                    </div>
                )}
                {left && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-center">
                        <span className="block text-[8px] font-bold text-text-muted uppercase">Left</span>
                        <span className="font-bold dark:text-white">{left.value}</span>
                        <span className="text-[8px] text-text-muted ml-0.5">cm</span>
                    </div>
                )}
                {right && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl text-center">
                        <span className="block text-[8px] font-bold text-text-muted uppercase">Right</span>
                        <span className="font-bold dark:text-white">{right.value}</span>
                        <span className="text-[8px] text-text-muted ml-0.5">cm</span>
                    </div>
                )}
            </div>

            {event.notes && (
                <p className="mt-3 text-xs text-text-muted italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                    "{event.notes}"
                </p>
            )}
        </div>
    );
}
