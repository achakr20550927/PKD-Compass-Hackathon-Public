'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchResults from '@/components/food/SearchResults';
import FoodDetailModal from '@/components/food/FoodDetailModal';

const CATEGORIES = [
    { id: 'Fruits', icon: 'nutrition' },
    { id: 'Vegetables', icon: 'eco' },
    { id: 'Grains & Carbs', icon: 'breakfast_dining' },
    { id: 'Meats & Proteins', icon: 'kebab_dining' },
    { id: 'Dairy & Alternatives', icon: 'water_drop' },
];

export default function AddFoodClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const date = searchParams.get('date');
    const mealType = searchParams.get('meal') || 'BREAKFAST';

    const [query, setQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('All'); // All, Foods, Recipes, Meals, Recent
    const [results, setResults] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const performSearch = async (q: string, tab: string, catId: string | null = null) => {
        if (!q && !catId && tab !== 'Recent') {
            setResults([]);
            // Fetch suggestions based on active tab
            setLoading(true);
            const type = tab === 'All' ? 'all' : tab.toLowerCase();
            try {
                const res = await fetch(`/api/food/search?q=&type=${type}`);
                const data = await res.json();
                setSuggestions(data.slice(0, 30));
            } catch (err) {
                console.error('Fetch suggestions failed:', err);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
            return;
        }

        setSuggestions([]);
        setLoading(true);
        const type = tab === 'All' ? 'all' : tab.toLowerCase();
        try {
            const catParam = catId ? `&category=${encodeURIComponent(catId)}` : '';
            const res = await fetch(`/api/food/search?q=${encodeURIComponent(q)}&type=${type}${catParam}`);
            const data = await res.json();
            setResults(data);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query, activeTab, selectedCategory);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, activeTab, selectedCategory]);

    return (
        <div className="max-w-md mx-auto px-4 pt-6 pb-24 min-h-screen bg-background-light dark:bg-background-dark">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 hover:bg-primary/5 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-primary">arrow_back</span>
                </button>
                <h1 className="text-xl font-black text-primary uppercase tracking-tight">Add Food</h1>
            </div>

            {/* Search Input */}
            <div className="relative mb-6">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/30">search</span>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search foods, recipes, or meals..."
                    className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white dark:bg-card-dark border border-primary/5 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold text-primary shadow-sm"
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                {['All', 'Foods', 'Recipes', 'Meals', 'Recent'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab
                            ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                            : 'bg-white dark:bg-card-dark text-primary/40 hover:text-primary border border-primary/5'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Browse by Category */}
            {!query && (
                <div className="mb-8 overflow-hidden">
                    <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-4 px-2">Browse Categories</p>
                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    if (selectedCategory === cat.id) {
                                        setSelectedCategory(null);
                                    } else {
                                        setSelectedCategory(cat.id);
                                    }
                                }}
                                className="flex-shrink-0 flex flex-col items-center gap-2 group"
                            >
                                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all shadow-sm group-hover:bg-primary group-hover:text-white group-active:scale-95 ${selectedCategory === cat.id
                                    ? 'bg-primary text-white border-primary shadow-primary/20 scale-105'
                                    : 'bg-white dark:bg-card-dark border-primary/5 text-primary'
                                    }`}>
                                    <span className="material-symbols-outlined">{cat.icon}</span>
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-tighter max-w-[60px] text-center ${selectedCategory === cat.id ? 'text-primary' : 'text-primary/60'}`}>
                                    {cat.id}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : results.length > 0 ? (
                    <SearchResults results={results} onSelect={setSelectedItem} />
                ) : suggestions.length > 0 ? (
                    <div>
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <span className="material-symbols-outlined text-sm text-primary/40">auto_awesome</span>
                            <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-widest">Suggestions</h3>
                        </div>
                        <SearchResults results={suggestions} onSelect={setSelectedItem} />
                    </div>
                ) : query && !loading ? (
                    <div className="text-center py-12">
                        <p className="text-sm text-primary/30 italic">No matches found for "{query}"</p>
                    </div>
                ) : (
                    <div className="text-center py-12 opacity-60">
                        <span className="material-symbols-outlined text-6xl text-primary/10 mb-4">
                            {activeTab === 'Recipes' ? 'restaurant_menu' : 'restaurant_menu'}
                        </span>
                        <p className="text-xs font-bold text-primary/40 uppercase tracking-widest">
                            {activeTab === 'Recipes' ? 'Add your first recipe' : 'Search for something to eat'}
                        </p>
                    </div>
                )}

                {/* Create Recipe Call to Action - Redesigned for Premium Look */}
                {!loading && (
                    <div className="mt-12 mb-8 p-8 bg-gradient-to-br from-primary/5 to-transparent rounded-[2rem] border border-primary/10 text-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                        <div className="relative z-10">
                            <span className="material-symbols-outlined text-primary/20 text-4xl mb-3">auto_awesome</span>
                            <p className="text-sm font-black text-primary uppercase tracking-tight mb-2">Can't find it?</p>
                            <p className="text-[10px] text-primary/50 font-medium leading-relaxed mb-6 max-w-[200px] mx-auto">
                                Create a custom dish or recipe tailored to your PKD needs.
                            </p>
                            <button
                                onClick={() => router.push(`/food-tracker/recipes/new?date=${date}&meal=${mealType}`)}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-xl">add_box</span> Build Custom Recipe
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <FoodDetailModal
                    item={selectedItem}
                    mealType={mealType}
                    date={date || ''}
                    onClose={() => setSelectedItem(null)}
                    onAdded={() => router.push(`/food-tracker?date=${date}`)}
                />
            )}

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-light dark:from-background-dark pointer-events-none">
                <div className="max-w-md mx-auto flex gap-3 pointer-events-auto">
                    <button
                        onClick={() => router.push('/food-tracker/recipes/new')}
                        className="flex-1 py-4 bg-white dark:bg-card-dark rounded-3xl border border-primary/10 text-[10px] font-black text-primary/60 hover:bg-primary/5 transition-all shadow-sm uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">recipe</span> Create Recipe
                    </button>
                    <button className="flex-1 py-4 bg-white dark:bg-card-dark rounded-3xl border border-primary/10 text-[10px] font-black text-primary/60 hover:bg-primary/5 transition-all shadow-sm uppercase tracking-widest flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm">barcode_scanner</span> Scan Barcode
                    </button>
                </div>
            </div>
        </div>
    );
}
