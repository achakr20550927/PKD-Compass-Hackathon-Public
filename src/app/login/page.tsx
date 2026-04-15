'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

export default function LoginPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') router.push('/');
    }, [status, router]);

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePassword = (pw: string) => /^(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/.test(pw);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!validateEmail(email)) { setError('Please enter a valid email address.'); return; }

        if (mode === 'signup') {
            const domain = email.split('@')[1]?.toLowerCase();
            const validDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
            if (!validDomains.includes(domain)) {
                setError('Please use a common email provider (Gmail, Yahoo, Hotmail, etc.)');
                return;
            }
            if (!validatePassword(password)) {
                setError('Password must be 8+ characters and include at least one special character.');
                return;
            }
            if (!gender) { setError('Please select your gender.'); return; }
        }

        setLoading(true);

        if (mode === 'login') {
            const res = await signIn('credentials', { email, password, redirect: false });
            if (res?.error) { setError('Invalid email or password.'); setLoading(false); }
            else { router.push('/'); setTimeout(() => { if (window.location.pathname === '/login') window.location.href = '/'; }, 1000); }
        } else {
            // Simplified Signup: Single Step
            try {
                const signupRes = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, name, gender })
                });
                const data = await signupRes.json();
                if (!signupRes.ok) { setError(data.error || 'Signup failed'); setLoading(false); return; }

                const res = await signIn('credentials', { email, password, redirect: false });
                if (res?.error) { setError('Signup successful, but login failed. Please login manually.'); setLoading(false); }
                else { router.push('/'); setTimeout(() => { if (window.location.pathname === '/login') window.location.href = '/'; }, 1000); }
            } catch (err) { setError('An error occurred during signup.'); setLoading(false); }
        }
    };


    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-5 relative overflow-hidden">
            {/* Background glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-primary/20 blur-[120px]" />
                <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-[120px]" />
            </div>

            <div className="relative w-full max-w-[420px] animate-scale-in">
                {/* Card */}
                <div className="bg-white dark:bg-surface-dark rounded-4xl shadow-float border border-blue-50 dark:border-white/5 overflow-hidden">

                    {/* Header */}
                    <div className="pt-10 pb-6 px-8 text-center">
                        <div className="relative inline-flex mb-5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-glow-primary">
                                <span className="material-symbols-outlined text-white text-[32px] fill-1">medical_services</span>
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-surface-dark flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[10px] fill-1">check</span>
                            </div>
                        </div>
                        <h1 className="text-2xl font-black text-text-main dark:text-slate-100 tracking-tight">PKD Compass</h1>
                        <p className="text-text-muted text-sm font-medium mt-1">Navigating Kidney Health Together</p>
                    </div>

                    {/* Segmented Toggle */}
                    <div className="px-8 mb-6">
                        <div className="flex h-12 items-center bg-blue-50/50 dark:bg-white/5 rounded-2xl p-1 mb-8">
                            {(['login', 'signup'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => {
                                        setMode(m);
                                        setError('');
                                    }}
                                    className={`flex-1 h-full rounded-xl text-sm font-black uppercase tracking-widest transition-all ${mode === m
                                        ? 'bg-white dark:bg-card-dark text-primary shadow-sm'
                                        : 'text-text-muted hover:text-primary'
                                        }`}
                                >
                                    {m === 'login' ? 'Sign In' : 'Sign Up'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Form */}
                    <div className="px-8 pb-8">
                        {error && (
                            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
                                <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleAuth}>
                            {mode === 'signup' && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="label px-1 block">Full Name</label>
                                        <input
                                            className="input w-full h-13 px-4"
                                            style={{ height: '52px' }}
                                            placeholder="Enter your name"
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="label px-1 block">Gender</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(['MALE', 'FEMALE'] as const).map((g) => (
                                                <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => setGender(g)}
                                                    className={`h-13 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${gender === g
                                                        ? 'border-primary bg-primary/5 text-primary'
                                                        : 'border-blue-50 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-text-muted'
                                                        }`}
                                                    style={{ height: '52px' }}
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">{g === 'MALE' ? 'man' : 'woman'}</span>
                                                    {g === 'MALE' ? 'Male' : 'Female'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="space-y-1.5">
                                <label className="label px-1 block">Email Address</label>
                                <input
                                    className="input w-full px-4"
                                    style={{ height: '52px' }}
                                    placeholder="name@example.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center px-1">
                                    <label className="label">Password</label>
                                    {mode === 'login' && <a className="text-xs font-bold text-primary hover:underline" href="#">Forgot?</a>}
                                </div>
                                <div className="relative">
                                    <input
                                        className="input w-full px-4 pr-12"
                                        style={{ height: '52px' }}
                                        placeholder="Enter your password"
                                        type={showPw ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[22px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full h-14 mt-2 text-base font-bold"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>
                                            {mode === 'login' ? 'Sign In' : 'Create Account'}
                                        </span>
                                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                    </>
                                )}
                            </button>

                        </form>
                    </div>

                    {/* Disclaimer */}
                    <div className="px-8 py-5 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5">
                        <div className="flex gap-3 items-start">
                            <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">info</span>
                            <p className="text-[11px] leading-relaxed text-text-muted font-medium">
                                <strong className="text-text-main dark:text-slate-300">Disclaimer:</strong> PKD Compass is for educational purposes only. Always consult a qualified health provider.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
