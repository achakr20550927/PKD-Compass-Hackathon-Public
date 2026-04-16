'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type FormData = {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    // Clinical fields
    dob: string;
    sexAtBirth: string;
    weightKg: string;
    heightCm: string;
    hasDiabetes: boolean;
    hasHypertension: boolean;
};

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        firstName: '', lastName: '', phone: '', email: '',
        dob: '', sexAtBirth: '', weightKg: '', heightCm: '',
        hasDiabetes: false, hasHypertension: false,
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
        else if (status === 'authenticated') fetchProfile();
    }, [status, router]);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/user/me');
            if (res.ok) {
                const data = await res.json();
                const p = data.profile;
                setFormData({
                    firstName: p?.firstName || data.name?.split(' ')[0] || '',
                    lastName: p?.lastName || data.name?.split(' ').slice(1).join(' ') || '',
                    phone: p?.phone || '',
                    email: data.email || '',
                    dob: p?.dob ? new Date(p.dob).toISOString().split('T')[0] : '',
                    sexAtBirth: p?.sexAtBirth || '',
                    weightKg: p?.weightKg != null ? String(p.weightKg) : '',
                    heightCm: p?.heightCm != null ? String(p.heightCm) : '',
                    hasDiabetes: p?.hasDiabetes || false,
                    hasHypertension: p?.hasHypertension || false,
                });
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone,
                    dob: formData.dob || null,
                    sexAtBirth: formData.sexAtBirth || null,
                    weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
                    heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
                    hasDiabetes: formData.hasDiabetes,
                    hasHypertension: formData.hasHypertension,
                }),
            });
            if (res.ok) setMessage({ type: 'success', text: 'Profile updated successfully!' });
            else setMessage({ type: 'error', text: 'Failed to update profile.' });
        } catch {
            setMessage({ type: 'error', text: 'An error occurred.' });
        } finally {
            setSaving(false);
        }
    };

    const set = (field: keyof FormData, value: any) =>
        setFormData(prev => ({ ...prev, [field]: value }));

    const inputClass = 'w-full h-14 px-5 rounded-2xl border-2 border-[#f1f4f9] dark:border-slate-700 bg-[#f8faff] dark:bg-slate-800/50 text-[#111318] dark:text-white focus:border-primary outline-none transition-all font-medium';
    const labelClass = 'block text-sm font-bold text-slate-700 dark:text-slate-300 px-1 mb-2';

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
        </div>
    );

    // BMI calculation preview
    const bmi = formData.weightKg && formData.heightCm
        ? (parseFloat(formData.weightKg) / ((parseFloat(formData.heightCm) / 100) ** 2)).toFixed(1)
        : null;

    return (
        <div className="min-h-screen bg-[#f8faff] dark:bg-background-dark p-6 pb-24 font-lexend">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/dashboard" className="size-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 shadow-sm">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h1 className="text-2xl font-bold">Account Info</h1>
            </header>

            <div className="max-w-lg mx-auto space-y-4">
                {message.text && (
                    <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        <span className="material-symbols-outlined text-base">
                            {message.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* ── Basic Info ──────────────────────── */}
                    <div className="bg-white dark:bg-slate-900 rounded-[28px] p-7 shadow-sm border border-slate-100 dark:border-slate-800">
                        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                            Basic Information
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>First Name</label>
                                    <input type="text" value={formData.firstName} onChange={e => set('firstName', e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Last Name</label>
                                    <input type="text" value={formData.lastName} onChange={e => set('lastName', e.target.value)} className={inputClass} />
                                </div>
                            </div>
                            <div className="opacity-60">
                                <label className={labelClass}>Email (Immutable)</label>
                                <input type="email" value={formData.email} readOnly className="w-full h-14 px-5 rounded-2xl border-2 border-[#f1f4f9] dark:border-slate-700 bg-[#f1f4f9] dark:bg-slate-800 text-slate-500 outline-none cursor-not-allowed font-medium" />
                            </div>
                            <div>
                                <label className={labelClass}>Phone (Optional)</label>
                                <input type="tel" value={formData.phone} onChange={e => set('phone', e.target.value)} className={inputClass} placeholder="Add phone number" />
                            </div>
                        </div>
                    </div>

                    {/* ── Clinical Profile ─────────────────── */}
                    <div className="bg-white dark:bg-slate-900 rounded-[28px] p-7 shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">biotech</span>
                                    Clinical Profile
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-7">Used to personalize your lab interpretations</p>
                            </div>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">Required for labs</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Date of Birth <span className="text-primary">*</span></label>
                                <input type="date" value={formData.dob} onChange={e => set('dob', e.target.value)} className={inputClass} required />
                            </div>

                            <div>
                                <label className={labelClass}>Sex at Birth <span className="text-primary">*</span></label>
                                <div className="flex gap-3">
                                    {[{ v: 'MALE', label: 'Male' }, { v: 'FEMALE', label: 'Female' }].map(opt => (
                                        <button
                                            key={opt.v}
                                            type="button"
                                            onClick={() => set('sexAtBirth', opt.v)}
                                            className={`flex-1 h-14 rounded-2xl font-bold text-sm transition-all border-2 ${formData.sexAtBirth === opt.v
                                                ? 'bg-primary text-white border-primary shadow-sm'
                                                : 'border-[#f1f4f9] dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-[#f8faff] dark:bg-slate-800/50 hover:border-primary/40'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5 px-1">Required for creatinine and eGFR calculation</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Weight (kg)</label>
                                    <input
                                        type="number" step="0.1" min="20" max="300"
                                        value={formData.weightKg}
                                        onChange={e => set('weightKg', e.target.value)}
                                        className={inputClass}
                                        placeholder="e.g. 72"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Height (cm)</label>
                                    <input
                                        type="number" step="1" min="100" max="250"
                                        value={formData.heightCm}
                                        onChange={e => set('heightCm', e.target.value)}
                                        className={inputClass}
                                        placeholder="e.g. 170"
                                    />
                                </div>
                            </div>
                            {bmi && (
                                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                    <span className="material-symbols-outlined text-blue-500 text-[18px]">monitor_weight</span>
                                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">BMI: {bmi}</p>
                                    <p className="text-xs text-blue-500">
                                        {parseFloat(bmi) < 18.5 ? '(Underweight)' : parseFloat(bmi) < 25 ? '(Normal)' : parseFloat(bmi) < 30 ? '(Overweight)' : '(Obese)'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Comorbidities ──────────────────── */}
                    <div className="bg-white dark:bg-slate-900 rounded-[28px] p-7 shadow-sm border border-slate-100 dark:border-slate-800">
                        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]">medical_information</span>
                            Health Conditions
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Select all that apply. Used to personalize BP and lab targets.</p>
                        <div className="space-y-3">
                            {[
                                { key: 'hasDiabetes', label: 'Diabetes (Type 1 or Type 2)', icon: 'glucose' },
                                { key: 'hasHypertension', label: 'Hypertension (High Blood Pressure)', icon: 'ecg_heart' },
                            ].map(item => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => set(item.key as keyof FormData, !formData[item.key as keyof FormData])}
                                    className={`w-full flex items-center gap-4 h-16 px-5 rounded-2xl border-2 transition-all text-left ${(formData[item.key as keyof FormData] as boolean)
                                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                        : 'border-[#f1f4f9] dark:border-slate-700 bg-[#f8faff] dark:bg-slate-800/50 hover:border-primary/30'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-[22px] ${(formData[item.key as keyof FormData] as boolean) ? 'text-primary' : 'text-slate-400'}`}>
                                        {item.icon}
                                    </span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex-1">{item.label}</span>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${(formData[item.key as keyof FormData] as boolean)
                                        ? 'bg-primary border-primary'
                                        : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                        {(formData[item.key as keyof FormData] as boolean) && (
                                            <span className="material-symbols-outlined text-white text-[14px]">check</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Save ──────────────────────────── */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                            <>
                                <span>Save Changes</span>
                                <span className="material-symbols-outlined">save</span>
                            </>
                        )}
                    </button>

                    {/* Disclaimer */}
                    <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 px-4 leading-relaxed">
                        Your health data is encrypted and used only to personalize your PKD Compass experience. For educational purposes only — always consult your clinician.
                    </p>
                </form>
            </div>
        </div>
    );
}
