'use client';

interface SearchResultsProps {
    results: any[];
    onSelect: (item: any) => void;
}

export default function SearchResults({ results, onSelect }: SearchResultsProps) {
    return (
        <div className="space-y-3">
            {results.map((item) => (
                <div
                    key={`${item.type}_${item.id}`}
                    onClick={() => onSelect(item)}
                    className="bg-white dark:bg-card-dark p-4 rounded-2xl shadow-sm border border-primary/5 hover:border-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-[18px]">
                                    {item.type === 'FOOD' ? 'restaurant' : item.type === 'RECIPE' ? 'menu_book' : 'restaurant_menu'}
                                </span>
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-primary/80 group-hover:text-primary transition-colors">{item.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                                        {item.type === 'FOOD' ? (item.brand || 'Generic') : item.type}
                                    </p>
                                    {item.category && (
                                        <>
                                            <span className="w-1 h-1 rounded-full bg-primary/20"></span>
                                            <p className="px-2 py-0.5 rounded-full bg-primary/5 text-[8px] font-black text-primary/60 uppercase tracking-tighter">
                                                {item.category}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {item.nutrients && (
                            <div className="text-right">
                                <p className="text-xs font-black text-primary">{Math.round(item.nutrients.calories)} kcal</p>
                                <p className="text-[9px] font-bold text-primary/40">per 100g</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
