'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import EGFRChart from '@/components/EGFRChart';

export default function CaregiverDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { patientId } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated' && patientId) {
            fetchData();
        }
    }, [status, patientId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/caregiver/dashboard/${patientId}`);
            if (res.ok) {
                setData(await res.json());
            } else {
                setError('Unauthorized access or patient not found.');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setError('Internal server error');
        } finally {
            setLoading(false);
        }
    };

    if (loading || status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="max-w-4xl mx-auto p-8 text-center">
                <span className="material-symbols-outlined text-5xl text-danger mb-4">gpp_bad</span>
                <h1 className="text-2xl font-bold dark:text-white mb-2">Access Restricted</h1>
                <p className="text-text-muted">{error}</p>
            </div>
        );
    }

    const { patient, labs, bp, meds } = data;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 pb-20">
            <div className="flex items-center gap-2 mb-8">
                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Caregiver View (Read-Only)</span>
            </div>

            <header className="mb-12 border-b border-slate-200 dark:border-slate-800 pb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-display font-bold dark:text-white mb-2">{patient.name}</h1>
                    <p className="text-text-muted">{patient.email}</p>
                </div>
                <div className="text-right">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-primary font-bold text-sm bg-primary/5 px-4 py-2 rounded-xl transition-all"
                    >
                        Back to My Portal
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-12">
                    {/* Labs Section */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <span className="material-symbols-outlined text-emerald-500">biotech</span>
                            <h2 className="text-2xl font-bold dark:text-white">Recent Labs</h2>
                        </div>
                        <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10 shadow-card mb-4">
                            <h3 className="text-xs font-bold text-text-muted uppercase mb-4 tracking-widest">eGFR Trend</h3>
                            <div className="h-[250px]">
                                <EGFRChart
                                    egfrData={labs.filter((l: any) => l.type === 'EGFR').map((l: any) => ({
                                        value: l.value,
                                        timestamp: new Date(l.timestamp)
                                    })).reverse()}
                                />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-card-dark rounded-3xl border border-white/10 shadow-card overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50">
                                    <tr>
                                        <th className="p-4 text-[10px] font-bold text-text-muted uppercase">Date</th>
                                        <th className="p-4 text-[10px] font-bold text-text-muted uppercase">Test</th>
                                        <th className="p-4 text-[10px) font-bold text-text-muted uppercase">Result</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                    {labs.slice(0, 5).map((l: any) => (
                                        <tr key={l.id}>
                                            <td className="p-4 dark:text-slate-400">{new Date(l.timestamp).toLocaleDateString()}</td>
                                            <td className="p-4 font-bold dark:text-white">{l.type}</td>
                                            <td className="p-4 font-bold text-primary">{l.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Blood Pressure */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <span className="material-symbols-outlined text-rose-500">monitor_heart</span>
                            <h2 className="text-2xl font-bold dark:text-white">Vitals</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {bp.slice(0, 4).map((b: any) => (
                                <div key={b.id} className="bg-white dark:bg-card-dark p-5 rounded-3xl border border-white/10 shadow-card flex justify-between items-center">
                                    <div className="text-xs font-medium text-text-muted">{new Date(b.timestamp).toLocaleDateString()}</div>
                                    <div className="text-xl font-display font-bold dark:text-white">{b.systolic}/{b.diastolic}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    {/* Medications */}
                    <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-white/10 shadow-card">
                        <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">pill</span>
                            Medications
                        </h3>
                        {meds.length === 0 ? (
                            <p className="text-sm text-text-muted italic">No medications listed.</p>
                        ) : (
                            <div className="space-y-3">
                                {meds.map((m: any) => (
                                    <div key={m.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                                        <p className="text-sm font-bold dark:text-white">{m.name}</p>
                                        <p className="text-[10px] text-text-muted mt-0.5">{m.dosage} • {m.frequency}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Audit Notice */}
                    <div className="bg-slate-900 p-6 rounded-3xl text-white">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-amber-500">privacy_tip</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Compliance Audit</span>
                        </div>
                        <p className="text-xs opacity-80 leading-relaxed italic">
                            All access to clinical data is audited. Every time you view this dashboard, an entry is created in the patient's secure audit log with your name and IP address.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
