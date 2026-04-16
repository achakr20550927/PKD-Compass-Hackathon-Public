'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import MainLayout from '@/components/MainLayout';

interface Resource {
    id: string;
    name: string;
    summary: string;
    continent: string | null;
    city: string | null;
    state: string | null;
    country: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    services: string | null; // JSON array string
    eligibility: string | null;
    verifiedImpact: string | null;
    labels: string | null; // JSON array string
    cost: string | null;
    category: {
        name: string;
        label: string;
    };
    distance?: number;
}

interface Article {
    id: string;
    title: string;
    summary: string | null;
    category: string | null;
    author: string | null;
    content: string | null;
    links: string | null; // JSON string
    sourceUrl: string | null;
}

type LocationHierarchy = Record<string, Record<string, Record<string, string[]>>>;

interface ResourcesResponse {
    resources?: Resource[];
    articles?: Article[];
    hierarchy?: Record<string, Record<string, string[]>>;
    hierarchyTree?: LocationHierarchy;
}

export default function ResourcesPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [hierarchy, setHierarchy] = useState<LocationHierarchy>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'KNOWLEDGE'>('DIRECTORY');
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

    // Filters
    const [keyword, setKeyword] = useState('');
    const [selectedContinent, setSelectedContinent] = useState('ALL');
    const [selectedCountry, setSelectedCountry] = useState('ALL');
    const [selectedState, setSelectedState] = useState('ALL');
    const [selectedCity, setSelectedCity] = useState('ALL');
    const [selectedCategory, setSelectedCategory] = useState('ALL TYPES');

    // UI State for drill-down
    const [expandedContinent, setExpandedContinent] = useState<string | null>(null);
    const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
    const [expandedState, setExpandedState] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const categories = [
        'ALL TYPES', 'SUPPORT GROUPS', 'ADVOCACY', 'HOSPITALS'
    ];

    useEffect(() => {
        fetchResources();
    }, [selectedContinent, selectedCountry, selectedState, selectedCity, selectedCategory, keyword]);

    async function fetchResources() {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (selectedContinent !== 'ALL') query.set('continent', selectedContinent);
            if (selectedCountry !== 'ALL') query.set('country', selectedCountry);
            if (selectedState !== 'ALL') query.set('state', selectedState);
            if (selectedCity !== 'ALL') query.set('city', selectedCity);
            if (keyword) query.set('search', keyword);

            const res = await fetch(`/api/resources?${query.toString()}`);
            const data: ResourcesResponse = await res.json();

            let filtered = data.resources || [];
            if (selectedCategory !== 'ALL TYPES') {
                const searchCat = selectedCategory;
                filtered = filtered.filter((r: Resource) =>
                    r.category.label.toUpperCase().includes(searchCat.replace('ALL ', '')) ||
                    r.category.name.toUpperCase().includes(searchCat.replace('ALL ', ''))
                );
            }

            setResources(filtered);
            setArticles(data.articles || []);
            if (data.hierarchyTree) setHierarchy(data.hierarchyTree);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }

    const resetFilters = () => {
        setSelectedContinent('ALL');
        setSelectedCountry('ALL');
        setSelectedState('ALL');
        setSelectedCity('ALL');
        setExpandedContinent(null);
        setExpandedCountry(null);
        setExpandedState(null);
    };

    return (
        <MainLayout>
            <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24 lg:flex">

                {/* ── MOBILE HEADER ── */}
                <div className="lg:hidden flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark border-b border-black/5 dark:border-white/5 sticky top-0 z-40">
                    <h1 className="text-xl font-display font-black tracking-tighter text-primary uppercase">
                        Resources<span className="text-text-main dark:text-white">Global</span>
                    </h1>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 rounded-xl bg-primary/10 text-primary"
                    >
                        <span className="material-symbols-outlined">filter_list</span>
                    </button>
                </div>

                {/* ── HIERARCHICAL SIDEBAR ── */}
                <aside className={`
                    fixed inset-y-0 left-0 z-50 w-80 bg-surface-light dark:bg-surface-dark border-r border-black/5 dark:border-white/5 
                    transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xs font-black tracking-widest text-primary uppercase">Global Filter</h2>
                            <button onClick={resetFilters} className="text-[10px] font-black underline uppercase text-text-muted hover:text-primary">Reset</button>
                        </div>

                        {/* Keyword Search */}
                        <div className="mb-8">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">search</span> Search Kidney Terms
                            </label>
                            <input
                                type="text"
                                placeholder="E.g. Hospital, Mayo, UK..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 placeholder:text-text-muted/50"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="mb-8">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">category</span> Focus Area
                            </label>
                            <div className="grid grid-cols-1 gap-1">
                                {categories.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setSelectedCategory(c)}
                                        className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedCategory === c
                                            ? 'bg-primary text-white'
                                            : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hierarchical Location Drill-Down */}
                        <div className="mb-8 flex-1">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-text-muted mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">public</span> World Regions
                            </label>

                            <div className="space-y-4">
                                {Object.keys(hierarchy).sort().map(continent => (
                                    <div key={continent} className="space-y-2">
                                        <button
                                            onClick={() => {
                                                setExpandedContinent(expandedContinent === continent ? null : continent);
                                                setExpandedCountry(null);
                                                setExpandedState(null);
                                                setSelectedContinent(continent);
                                                setSelectedCountry('ALL');
                                                setSelectedState('ALL');
                                                setSelectedCity('ALL');
                                            }}
                                            className={`w-full flex items-center justify-between p-3 rounded-2xl text-sm font-black uppercase tracking-tight transition-all ${selectedContinent === continent ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-black/5 dark:bg-white/5 text-text-main dark:text-white'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-lg">map</span> {continent}
                                            </span>
                                            <span className={`material-symbols-outlined transition-transform duration-300 ${expandedContinent === continent ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>

                                        {expandedContinent === continent && (
                                            <div className="pl-4 space-y-2 animate-fade-up">
                                                {Object.keys(hierarchy[continent]).sort().map(country => (
                                                    <div key={country} className="space-y-1">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedContinent(continent);
                                                                setSelectedCountry(country);
                                                                setSelectedState('ALL');
                                                                setSelectedCity('ALL');
                                                                const countryKey = `${continent}::${country}`;
                                                                setExpandedCountry(expandedCountry === countryKey ? null : countryKey);
                                                                setExpandedState(null);
                                                            }}
                                                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all ${selectedCountry === country ? 'text-primary' : 'text-text-muted'
                                                                }`}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${selectedCountry === country ? 'bg-primary animate-pulse' : 'bg-text-muted/30'}`} />
                                                                {country}
                                                            </span>
                                                            <span className={`material-symbols-outlined text-sm transition-transform ${expandedCountry === `${continent}::${country}` ? 'rotate-180' : ''}`}>expand_more</span>
                                                        </button>

                                                        {expandedCountry === `${continent}::${country}` && Object.keys(hierarchy[continent][country]).length > 0 && (
                                                            <div className="pl-6 grid grid-cols-1 gap-1 py-1 border-l border-black/5 dark:border-white/5 ml-3">
                                                                {Object.keys(hierarchy[continent][country]).sort().map(state => {
                                                                    const stateLabel = state === '__NO_STATE__' ? 'NO STATE / REGION' : state;
                                                                    const stateKey = `${continent}::${country}::${state}`;
                                                                    const cities = hierarchy[continent][country][state];
                                                                    return (
                                                                        <div key={stateKey} className="space-y-1">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedState(state === '__NO_STATE__' ? 'ALL' : state);
                                                                                    setSelectedCity('ALL');
                                                                                    setExpandedState(expandedState === stateKey ? null : stateKey);
                                                                                }}
                                                                                className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedState === (state === '__NO_STATE__' ? 'ALL' : state) && selectedCity === 'ALL'
                                                                                    ? 'bg-primary text-white shadow-sm'
                                                                                    : 'text-text-muted/60 hover:text-primary hover:bg-primary/5'
                                                                                    }`}
                                                                            >
                                                                                {stateLabel}
                                                                            </button>
                                                                            {expandedState === stateKey && cities.length > 0 && (
                                                                                <div className="pl-3 grid grid-cols-1 gap-1 border-l border-black/5 dark:border-white/5 ml-2">
                                                                                    {cities.map(city => (
                                                                                        <button
                                                                                            key={`${stateKey}::${city}`}
                                                                                            onClick={() => {
                                                                                                setSelectedContinent(continent);
                                                                                                setSelectedCountry(country);
                                                                                                setSelectedState(state === '__NO_STATE__' ? 'ALL' : state);
                                                                                                setSelectedCity(city);
                                                                                                setIsSidebarOpen(false);
                                                                                            }}
                                                                                            className={`text-left px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${selectedCity === city
                                                                                                ? 'bg-primary text-white shadow-sm'
                                                                                                : 'text-text-muted/70 hover:text-primary hover:bg-primary/5'
                                                                                                }`}
                                                                                        >
                                                                                            {city}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── MAIN CONTENT ── */}
                <main className="flex-1 lg:p-10 p-4">

                    {/* Header Tabs */}
                    <div className="flex gap-4 mb-8 sticky top-0 z-30 py-2 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
                        <button
                            onClick={() => setActiveTab('DIRECTORY')}
                            className={`px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'DIRECTORY'
                                ? 'bg-primary text-white shadow-glow-primary'
                                : 'bg-surface-light dark:bg-surface-dark border border-black/5 dark:border-white/5 text-text-muted'
                                }`}
                        >
                            Global Directory
                        </button>
                        <button
                            onClick={() => setActiveTab('KNOWLEDGE')}
                            className={`px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'KNOWLEDGE'
                                ? 'bg-primary text-white shadow-glow-primary'
                                : 'bg-surface-light dark:bg-surface-dark border border-black/5 dark:border-white/5 text-text-muted'
                                }`}
                        >
                            Knowledge Library
                        </button>
                    </div>

                    {activeTab === 'DIRECTORY' ? (
                        <div className="max-w-5xl mx-auto">
                            <div className="flex flex-col md:flex-row items-end justify-between mb-10 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live Global Sync: {resources.length} Nodes</span>
                                    </div>
                                    <h1 className="text-4xl lg:text-5xl font-display font-black text-text-main dark:text-white tracking-widest italic uppercase leading-none">
                                        Kidney <span className="text-primary italic">OS</span>
                                    </h1>
                                    <p className="text-text-muted text-sm font-medium mt-2">
                                        Exploration mode: <span className="text-primary font-black uppercase">{selectedContinent} / {selectedCountry} / {selectedState} / {selectedCity}</span>
                                    </p>
                                </div>
                            </div>

                            {loading ? (
                                <div className="grid gap-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-64 rounded-3xl bg-surface-light dark:bg-surface-dark animate-pulse border border-black/5 dark:border-white/5" />
                                    ))}
                                </div>
                            ) : resources.length === 0 ? (
                                <div className="bg-surface-light dark:bg-surface-dark p-20 rounded-[40px] text-center border-2 border-dashed border-text-muted/20">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <span className="material-symbols-outlined text-4xl text-primary animate-bounce">search</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-text-main dark:text-white uppercase">End of Directory reached</h3>
                                    <p className="text-sm text-text-muted mt-2">No nodes found for this localized search. Try zooming out to a continent view.</p>
                                    <button onClick={resetFilters} className="mt-8 px-6 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-dark transition-all">Reset Exploration</button>
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {resources.map(res => (
                                        <ResourceCard key={res.id} resource={res} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-6xl mx-auto ">
                            <div className="grid gap-12 lg:grid-cols-2">
                                <div>
                                    <div className="mb-10">
                                        <h1 className="text-4xl font-display font-black text-text-main dark:text-white uppercase italic tracking-widest mb-4">Central <span className="text-primary">Intelligence</span></h1>
                                        <p className="text-text-muted text-sm leading-relaxed">Global repository of filtered medical protocols and research summaries.</p>
                                    </div>

                                    <div className="space-y-4">
                                        {articles.map(art => (
                                            <div key={art.id} className="bg-surface-light dark:bg-surface-dark p-8 rounded-[32px] border border-black/5 dark:border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                                    <span className="material-symbols-outlined text-6xl">menu_book</span>
                                                </div>
                                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3 block">{art.category?.replace('_', ' ')}</span>
                                                <h3 className="text-xl font-black text-text-main dark:text-white mb-3 group-hover:text-primary transition-colors leading-tight uppercase italic">{art.title}</h3>
                                                <p className="text-sm text-text-muted leading-relaxed mb-6 font-medium">{art.summary}</p>
                                                <button
                                                    onClick={() => setSelectedArticle(art)}
                                                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group-hover:shadow-glow-primary transition-all"
                                                >
                                                    Open Intel <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-2xl font-display font-black text-text-main dark:text-white mb-10 uppercase italic tracking-widest">Immediate <span className="text-primary">Tactical</span></h2>
                                    <div className="bg-gradient-to-br from-red-600 to-rose-700 p-1 rounded-[40px] shadow-2xl shadow-red-500/20">
                                        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-[38px] h-full">
                                            <div className="flex items-center gap-5 mb-8">
                                                <div className="w-16 h-16 rounded-[22px] bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-500/40">
                                                    <span className="material-symbols-outlined text-3xl animate-pulse">emergency</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-text-main dark:text-white uppercase italic">Protocol Zero</h3>
                                                    <p className="text-xs text-red-500 font-black uppercase tracking-widest">Immediate Medical Asset</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <a href="tel:8447534673" className="flex items-center justify-between p-5 bg-black/5 dark:bg-white/5 rounded-2xl group border border-transparent hover:border-red-500/30 transition-all">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none mb-1">USA Support</span>
                                                        <span className="text-sm font-bold text-text-main dark:text-white uppercase tracking-tight">PKD Foundation HOPE</span>
                                                    </div>
                                                    <span className="material-symbols-outlined text-red-500">call</span>
                                                </a>
                                                <a href="tel:988" className="flex items-center justify-between p-5 bg-black/5 dark:bg-white/5 rounded-2xl group border border-transparent hover:border-red-500/30 transition-all">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none mb-1">Global Crisis</span>
                                                        <span className="text-sm font-bold text-text-main dark:text-white uppercase tracking-tight">National 988 Lifeline</span>
                                                    </div>
                                                    <span className="material-symbols-outlined text-red-500">call</span>
                                                </a>
                                            </div>

                                            <div className="mt-12 p-6 rounded-3xl bg-red-500/5 border border-red-500/10 text-center">
                                                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest italic animate-pulse">If life is in immediate danger, dial 911/999/112</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* ── ARTICLE MODAL ── */}
                {selectedArticle && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10">
                        <div
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-fade-in"
                            onClick={() => setSelectedArticle(null)}
                        />
                        <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface-light dark:bg-surface-dark rounded-[40px] border border-white/10 overflow-hidden shadow-2xl flex flex-col animate-zoom-in">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-primary/5">
                                <div>
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 block">{selectedArticle.category?.replace('_', ' ')}</span>
                                    <h2 className="text-2xl lg:text-3xl font-display font-black text-text-main dark:text-white uppercase italic tracking-widest">{selectedArticle.title}</h2>
                                </div>
                                <button
                                    onClick={() => setSelectedArticle(null)}
                                    className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                                <div className="max-w-2xl mx-auto">
                                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-black/5 dark:border-white/5">
                                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black italic">
                                            {selectedArticle.author?.charAt(0) || 'K'}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">Intelligence Officer</p>
                                            <p className="text-sm font-black text-text-main dark:text-white">{selectedArticle.author || 'Kidney OS Intelligence'}</p>
                                        </div>
                                    </div>

                                    <div className="prose prose-invert max-w-none">
                                        <p className="text-lg text-text-main dark:text-slate-200 leading-relaxed whitespace-pre-line font-medium opacity-90">
                                            {selectedArticle.content || selectedArticle.summary || 'No detailed content available for this intel node.'}
                                        </p>
                                    </div>

                                    <div className="mt-16 p-8 rounded-[32px] bg-primary/5 border border-primary/10 flex flex-col items-center text-center">
                                        <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-2">End of Intelligence Brief</h4>
                                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight mb-8">Verified by Kidney OS Global Protocol</p>

                                        <div className="flex flex-col gap-3 w-full max-w-sm">
                                            {selectedArticle.sourceUrl && (
                                                <a
                                                    href={selectedArticle.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-[0.2em] shadow-glow-primary hover:scale-105 active:scale-95 transition-all w-full"
                                                >
                                                    Visit Full Article <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                </a>
                                            )}

                                            {(() => {
                                                try {
                                                    const links = JSON.parse(selectedArticle.links || '[]');
                                                    if (!Array.isArray(links) || links.length === 0) return null;
                                                    return links.map((link: any, idx: number) => (
                                                        <a
                                                            key={idx}
                                                            href={link.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-black/5 dark:bg-white/5 text-text-main dark:text-white text-xs font-black uppercase tracking-[0.2em] border border-black/5 dark:border-white/10 hover:bg-primary hover:text-white transition-all w-full"
                                                        >
                                                            {link.title} <span className="material-symbols-outlined text-sm">link</span>
                                                        </a>
                                                    ));
                                                } catch (e) {
                                                    return null;
                                                }
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}

function ResourceCard({ resource }: { resource: Resource }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const services = JSON.parse(resource.services || '[]');
    const labels = JSON.parse(resource.labels || '[]');

    return (
        <div className={`bg-surface-light dark:bg-surface-dark rounded-[40px] border border-black/5 dark:border-white/5 overflow-hidden transition-all duration-700 hover:shadow-2xl hover:border-primary/20 ${isExpanded ? 'ring-2 ring-primary/50 translate-y--2 shadow-2xl' : ''}`}>
            <div className="p-8 lg:p-12">
                <div className="flex flex-col lg:flex-row gap-12">

                    {/* Content Left */}
                    <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-6">
                            {labels.map((l: string) => (
                                <span key={l} className="px-4 py-1.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    {l}
                                </span>
                            ))}
                            <span className="px-4 py-1.5 rounded-full bg-surface-light dark:bg-black/40 border border-black/5 dark:border-white/10 text-text-muted text-[10px] font-black uppercase tracking-widest">
                                {resource.category.label}
                            </span>
                        </div>

                        <div className="flex items-start justify-between gap-6 mb-4">
                            <div>
                                <h2 className="text-3xl lg:text-4xl font-display font-black text-text-main dark:text-white uppercase italic tracking-widest leading-none mb-3">
                                    {resource.name}
                                </h2>
                                <div className="flex flex-wrap items-center gap-4 text-primary text-[10px] font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">public</span>
                                        {resource.continent}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">flag</span>
                                        {resource.country}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                                        {resource.city && `${resource.city}, `}{resource.state && `${resource.state}`}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ${isExpanded ? 'bg-primary text-white' : 'bg-surface-light dark:bg-black/20 text-primary border border-primary/20'}`}
                            >
                                <span className={`material-symbols-outlined transition-transform duration-500 scale-125 ${isExpanded ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
                            </button>
                        </div>

                        <div className="mt-10">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 flex items-center gap-2">
                                <span className="w-6 h-px bg-primary" /> Mission Overview
                            </h4>
                            <p className="text-sm lg:text-base text-text-muted leading-relaxed font-bold dark:text-slate-300">
                                {resource.summary}
                            </p>
                        </div>

                        {isExpanded && (
                            <div className="mt-12 grid sm:grid-cols-2 gap-12 animate-fade-up">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-5">Patient Eligibility</h4>
                                    <p className="text-sm text-text-muted font-black uppercase tracking-tight leading-relaxed">
                                        {resource.eligibility || 'Universal availability for all patients.'}
                                    </p>
                                </div>
                                <div className="bg-black/5 dark:bg-black/20 p-6 rounded-[32px]">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-5 text-center">Core Assets</h4>
                                    <ul className="space-y-3">
                                        {(services.length > 0 ? services : ['Patient Support', 'Research Funding', 'Educational Programming']).map((s: string) => (
                                            <li key={s} className="flex items-center gap-3 text-xs font-bold text-text-main dark:text-white uppercase tracking-tight">
                                                <span className="material-symbols-outlined text-primary text-sm">bolt</span> {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {isExpanded && resource.verifiedImpact && (
                            <div className="mt-10 p-6 rounded-[32px] bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-5 animate-fade-up" style={{ animationDelay: '100ms' }}>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                                    <span className="material-symbols-outlined text-2xl">verified</span>
                                </div>
                                <div>
                                    <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Impact Validation</h5>
                                    <p className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-tight">{resource.verifiedImpact}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Access Panel Right */}
                    <div className="lg:w-80 lg:shrink-0">
                        <div className="bg-surface-light dark:bg-black/30 p-8 lg:p-10 rounded-[40px] border border-black/5 dark:border-white/10 sticky top-10 shadow-2xl">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted mb-8 text-center">Node Access</h4>

                            <div className="space-y-4">
                                {resource.website && (
                                    <a href={resource.website} target="_blank" className="flex items-center justify-between p-5 bg-surface-light dark:bg-surface-dark rounded-2xl group border border-transparent hover:border-primary/50 transition-all shadow-xl hover:scale-105 active:scale-95">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                <span className="material-symbols-outlined">rocket_launch</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">Secure Link</span>
                                                <span className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Portal</span>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-text-muted/30 group-hover:text-primary transition-colors">arrow_outward</span>
                                    </a>
                                )}

                                {resource.email && (
                                    <a href={`mailto:${resource.email}`} className="flex items-center justify-between p-5 bg-surface-light dark:bg-surface-dark rounded-2xl group border border-transparent hover:border-indigo-500/50 transition-all shadow-xl hover:scale-105 active:scale-95">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
                                                <span className="material-symbols-outlined">alternate_email</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">Direct Comms</span>
                                                <span className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Email</span>
                                            </div>
                                        </div>
                                    </a>
                                )}

                                {resource.phone && (
                                    <a href={`tel:${resource.phone}`} className="flex items-center justify-between p-5 bg-surface-light dark:bg-surface-dark rounded-2xl group border border-transparent hover:border-emerald-500/50 transition-all shadow-xl hover:scale-105 active:scale-95">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                                                <span className="material-symbols-outlined">call</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">Direct Voice</span>
                                                <span className="text-sm font-black text-text-main dark:text-white uppercase tracking-tight">Call Node</span>
                                            </div>
                                        </div>
                                    </a>
                                )}

                                <div className="mt-12 pt-8 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Service Cost</span>
                                    <span className="px-4 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest ring-1 ring-emerald-500/20">{resource.cost || 'FREE ACCESS'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
