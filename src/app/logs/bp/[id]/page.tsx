'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditBPLog() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = String(params?.id ?? '');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        systolic: '',
        diastolic: '',
        heartRate: '',
        note: ''
    });

    useEffect(() => {
        if (!id) return;
        fetchLog();
    }, [id]);

    const fetchLog = async () => {
        try {
            const res = await fetch(`/api/bp?id=${id}`);
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    systolic: data.systolic || '',
                    diastolic: data.diastolic || '',
                    heartRate: data.heartRate || '',
                    note: data.note || ''
                });
            }
        } catch (err) {
            console.error('Failed to fetch log:', err);
            alert('Failed to load log');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch(`/api/bp?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systolic: parseInt(formData.systolic),
                    diastolic: parseInt(formData.diastolic),
                    heartRate: formData.heartRate ? parseInt(formData.heartRate) : null,
                    note: formData.note
                })
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/logs');
                    router.refresh();
                }, 1500);
            } else {
                alert('Failed to save changes');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this entry?')) return;

        try {
            const res = await fetch(`/api/bp?id=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                router.push('/logs');
                router.refresh();
            } else {
                alert('Failed to delete entry');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to delete entry');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
            </div>
        );
    }

    return (
        <main className="flex-1 overflow-y-auto pb-24 bg-white dark:bg-background-dark min-h-screen font-lexend">
            <header className="sticky top-0 z-10 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 border-b border-primary/10 justify-between">
                <Link href="/logs" className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-primary/10">
                    <span className="material-symbols-outlined text-3xl">arrow_back</span>
                </Link>
                <div className="flex flex-col items-center text-center">
                    <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-tight">Edit BP Log</h2>
                </div>
                <div className="size-10"></div>
            </header>

            {success && (
                <div className="mx-4 mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl flex gap-3 items-start shadow-sm">
                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 shrink-0">check_circle</span>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Changes Saved!</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="px-4 py-8 space-y-6 max-w-md mx-auto">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[#616f89] px-1">Systolic</label>
                        <input
                            type="number"
                            required
                            value={formData.systolic}
                            onChange={(e) => setFormData(p => ({ ...p, systolic: e.target.value }))}
                            className="w-full h-14 text-center text-xl font-bold rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white transition-colors"
                            placeholder="120"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[#616f89] px-1">Diastolic</label>
                        <input
                            type="number"
                            required
                            value={formData.diastolic}
                            onChange={(e) => setFormData(p => ({ ...p, diastolic: e.target.value }))}
                            className="w-full h-14 text-center text-xl font-bold rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white transition-colors"
                            placeholder="80"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#616f89] px-1">Heart Rate (Optional)</label>
                    <input
                        type="number"
                        value={formData.heartRate}
                        onChange={(e) => setFormData(p => ({ ...p, heartRate: e.target.value }))}
                        className="w-full h-14 text-center text-xl font-bold rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white transition-colors"
                        placeholder="72"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#616f89] px-1">Notes (Optional)</label>
                    <textarea
                        value={formData.note}
                        onChange={(e) => setFormData(p => ({ ...p, note: e.target.value }))}
                        className="w-full h-24 p-3 rounded-xl border-2 border-primary/10 focus:border-primary focus:ring-0 bg-background-light dark:bg-slate-800 dark:text-white transition-colors resize-none"
                        placeholder="Any notes about this reading..."
                    />
                </div>

                <div className="space-y-3 pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined">save</span>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined">delete</span>
                        Delete Entry
                    </button>
                </div>
            </form>
        </main>
    );
}
