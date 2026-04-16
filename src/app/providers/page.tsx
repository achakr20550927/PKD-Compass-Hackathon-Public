'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

type Specialty = '' | 'NEPHROLOGIST' | 'DIALYSIS_CENTER' | 'TRANSPLANT';
type RadiusMiles = 25 | 50 | 100;

interface Provider {
    id: string;
    name: string;
    specialty: string;
    address: string;
    city?: string;
    state?: string;
    country: string;
    phone?: string;
    website?: string;
    distanceMiles?: number;
}

const SPECIALTY_LABELS: Record<string, string> = {
    NEPHROLOGIST: 'Nephrologist',
    DIALYSIS_CENTER: 'Dialysis Center',
    TRANSPLANT: 'Transplant Center',
};

const SPECIALTY_ICONS: Record<string, string> = {
    NEPHROLOGIST: 'stethoscope',
    DIALYSIS_CENTER: 'water_drop',
    TRANSPLANT: 'favorite',
};

const SPECIALTY_COLORS: Record<string, string> = {
    NEPHROLOGIST: 'from-blue-500 to-indigo-600',
    DIALYSIS_CENTER: 'from-teal-500 to-cyan-600',
    TRANSPLANT: 'from-rose-500 to-pink-600',
};

export default function ProvidersPage() {
    const [location, setLocation] = useState('');
    const [radius, setRadius] = useState<RadiusMiles>(25);
    const [specialty, setSpecialty] = useState<Specialty>('');
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [locationLabel, setLocationLabel] = useState('');
    const [error, setError] = useState('');

    const search = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            let lat: number | null = null;
            let lng: number | null = null;

            if (location.trim()) {
                const geoRes = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
                    { headers: { 'User-Agent': 'PKDCompass/1.0', 'Accept-Language': 'en' } }
                );
                const geoData = await geoRes.json();
                if (geoData && geoData.length > 0) {
                    lat = parseFloat(geoData[0].lat);
                    lng = parseFloat(geoData[0].lon);
                    setLocationLabel(geoData[0].display_name.split(',').slice(0, 3).join(', '));
                } else {
                    setError('Location not found. Try a ZIP code, city name, or country.');
                    setLoading(false);
                    return;
                }
            }

            const params = new URLSearchParams();
            if (lat !== null && lng !== null) {
                params.set('lat', String(lat));
                params.set('lng', String(lng));
                params.set('radius', String(radius));
            }
            if (specialty) params.set('specialty', specialty);

            const res = await fetch(`/api/providers?${params}`);
            const data = await res.json();
            setProviders(data.providers || []);
            setSearched(true);
        } catch {
            setError('Failed to search providers. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [location, radius, specialty]);

    return (
        <main className="flex-1 overflow-y-auto pb-32 bg-background-light dark:bg-background-dark min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-20 flex items-center glass border-b border-white/40 dark:border-white/5 px-4 py-3 justify-between">
                <Link href="/resources" className="w-9 h-9 flex items-center justify-center rounded-xl text-text-muted hover:bg-primary/10 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div className="flex flex-col items-center">
                    <h2 className="text-base font-bold text-text-main dark:text-slate-100">Find Care</h2>
                    <p className="text-[11px] text-primary font-semibold">Nephrologists & Dialysis</p>
                </div>
                <div className="w-9 h-9" />
            </header>

            <div className="max-w-md mx-auto px-4 pt-5 space-y-4">

                {/* Disclaimer */}
                <div className="flex gap-2.5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30">
                    <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0">info</span>
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        <span className="font-bold">Always verify provider details before visiting.</span> Information may change. Contact the provider directly to confirm availability, insurance, and hours.
                    </p>
                </div>

                {/* Search card */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-text-main dark:text-slate-100 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">location_searching</span>
                        Search by Location
                    </h3>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && search()}
                            placeholder="ZIP, city, or country worldwide"
                            className="flex-1 h-12 px-4 rounded-xl border-2 border-[#f1f4f9] dark:border-slate-700 bg-[#f8faff] dark:bg-slate-800/50 text-sm text-text-main dark:text-white focus:border-primary outline-none transition-all"
                        />
                        <button
                            onClick={search}
                            disabled={loading}
                            className="h-12 w-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary/90 transition-all active:scale-95"
                        >
                            {loading
                                ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                : <span className="material-symbols-outlined text-[18px]">search</span>
                            }
                        </button>
                    </div>

                    {/* Radius */}
                    <div className="flex gap-2 items-center">
                        <span className="text-xs font-bold text-text-muted">Within:</span>
                        {([25, 50, 100] as RadiusMiles[]).map(r => (
                            <button
                                key={r}
                                onClick={() => setRadius(r)}
                                className={`h-8 px-3 rounded-full text-xs font-bold transition-all ${radius === r ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-text-muted hover:text-primary'}`}
                            >
                                {r} mi
                            </button>
                        ))}
                    </div>

                    {/* Specialty filter */}
                    <div>
                        <p className="text-xs font-bold text-text-muted mb-2">Filter by Type:</p>
                        <div className="flex flex-wrap gap-2">
                            {([
                                { v: '' as Specialty, label: 'All Types', icon: 'stethoscope' },
                                { v: 'NEPHROLOGIST', label: 'Nephrologist', icon: 'stethoscope' },
                                { v: 'DIALYSIS_CENTER', label: 'Dialysis', icon: 'water_drop' },
                                { v: 'TRANSPLANT', label: 'Transplant', icon: 'favorite' },
                            ] as { v: Specialty; label: string; icon: string }[]).map(s => (
                                <button
                                    key={s.v}
                                    onClick={() => setSpecialty(s.v)}
                                    className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold transition-all border ${specialty === s.v
                                        ? 'bg-primary text-white border-primary'
                                        : 'border-slate-200 dark:border-slate-700 text-text-muted hover:border-primary hover:text-primary'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[14px]">{s.icon}</span>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-sm font-medium text-red-600 dark:text-red-300 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                        {error}
                    </div>
                )}

                {/* Location label */}
                {locationLabel && searched && (
                    <div className="flex items-center gap-2 px-2">
                        <span className="material-symbols-outlined text-primary text-[16px]">place</span>
                        <p className="text-xs text-text-muted">
                            Showing providers within <span className="font-bold">{radius} miles</span> of{' '}
                            <span className="font-bold text-text-main dark:text-slate-200">{locationLabel}</span>
                        </p>
                    </div>
                )}

                {/* Results */}
                {searched && (
                    <div className="space-y-3 pb-4">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-sm font-bold text-text-main dark:text-slate-200">
                                {providers.length} Provider{providers.length !== 1 ? 's' : ''} Found
                            </p>
                        </div>

                        {providers.length === 0 ? (
                            <div className="card px-4 py-12 flex flex-col items-center gap-2">
                                <span className="material-symbols-outlined text-slate-200 dark:text-slate-700 text-5xl">stethoscope</span>
                                <p className="text-text-muted text-sm font-medium">No providers found in this area</p>
                                <p className="text-xs text-text-muted text-center">Try increasing the radius or changing your location. New providers are added regularly.</p>
                            </div>
                        ) : (
                            providers.map(p => (
                                <div key={p.id} className="card p-5">
                                    <div className="flex items-start gap-4 mb-3">
                                        <div className={`shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${SPECIALTY_COLORS[p.specialty] || 'from-slate-400 to-slate-500'} flex items-center justify-center`}>
                                            <span className="material-symbols-outlined text-white text-[22px] fill-1">
                                                {SPECIALTY_ICONS[p.specialty] || 'stethoscope'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-text-main dark:text-slate-100 leading-snug">{p.name}</h4>
                                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 mt-1">
                                                {SPECIALTY_LABELS[p.specialty] || p.specialty}
                                            </span>
                                        </div>
                                        {p.distanceMiles != null && (
                                            <div className="shrink-0 text-right">
                                                <p className="text-lg font-black text-primary">{p.distanceMiles}</p>
                                                <p className="text-[10px] text-text-muted">miles</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 mb-4">
                                        <div className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-slate-400 text-[16px] mt-0.5">location_on</span>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {p.address}
                                                {p.city && <><br />{p.city}{p.state ? `, ${p.state}` : ''}, {p.country}</>}
                                            </p>
                                        </div>
                                        {p.phone && (
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-slate-400 text-[16px]">call</span>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{p.phone}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        {p.phone && (
                                            <a
                                                href={`tel:${p.phone.replace(/[\s()-]/g, '')}`}
                                                className="flex-1 h-10 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">call</span>
                                                Call
                                            </a>
                                        )}
                                        {p.website && (
                                            <a
                                                href={p.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 h-10 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                                Website
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Footer disclaimer */}
                        {providers.length > 0 && (
                            <div className="flex gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0">info</span>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                                    Verify provider details before visiting. This directory is for informational purposes only. PKD Compass does not guarantee accuracy of provider contact information.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
