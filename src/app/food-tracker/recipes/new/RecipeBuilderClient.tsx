'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { scaleNutrients, getGramsForQuantity } from '@/lib/nutrition';

export default function RecipeBuilderClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const date = searchParams.get('date');
    const mealType = searchParams.get('meal');

    const [step, setStep] = useState(1);
    const [title, setTitle] = useState('');
    const [servings, setServings] = useState(1);
    const [servingsConsumed, setServingsConsumed] = useState(1);
    const [rawIngredients, setRawIngredients] = useState('');
    const [parsedIngredients, setParsedIngredients] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saveAndLog, setSaveAndLog] = useState(false);
    const [isSearching, setIsSearching] = useState<{ active: boolean, index: number }>({ active: false, index: -1 });
    const [manualQuery, setManualQuery] = useState('');
    const [manualResults, setManualResults] = useState<any[]>([]);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [addQuery, setAddQuery] = useState('');
    const [addResults, setAddResults] = useState<any[]>([]);

    const parseLines = async () => {
        setLoading(true);
        const text = rawIngredients;

        // Smart Heuristic Analysis (Mimcking AI)
        // 1. Split into lines and filter for lines that look like ingredients
        const lines = text.split('\n')
            .map(l => l.trim())
            .filter(l => {
                if (!l || l.length < 2) return false;

                // CRITICAL: Filter out obviously non-ingredient lines (blog noise, headers, tips)
                // We exclude lines that look like blog sections or storage advice
                const noise = /preheat|oven|degrees|minutes|serve|instruction|method|step|enjoy|whisk|combine|place|tip|swap|storage|match|found|verify|recipe|match|fried rice|wok|spatula|make|storage|more|match|storage|helpful|swap|blog|check|visit/i;

                // If it's a long sentence and hits a noise word, it's definitely noise
                if (noise.test(l) && l.split(' ').length > 2) return false;

                // Keep if it has a quantity (1/2, 2.5, 10, ONE, TWO, 3/4th)
                const hasQty = /^[0-9./]+(st|nd|rd|th)?\s/i.test(l) || /^(one|two|three|four|five|six|seven|eight|nine|ten)\s+/i.test(l);
                // Keep if it has a specific volume/weight unit
                const hasUnit = /\b(cup|cups|tbsp|tsp|gram|grams|g|ml|oz|lb|piece|pieces|clove|cloves|pinch|whole|lb|lbs|ounce|ounces|bottle|can|package|pkg|slice|slices|tablespoon|teaspoon)\b/i.test(l);

                // Stricter check: Must either have a quantity/unit, or be very short and NOT a header
                if (hasQty || hasUnit) return true;

                // If it's a known section title pattern, ignore it
                if (/ingredients|tips|storage|swaps|related|more\s+recipes|how\s+to|matches/i.test(l)) return false;

                // If it's a long sentence without qty/unit, it's noise
                if (l.split(' ').length > 4) return false;

                // Catch short isolated ingredient names (e.g. "Salt", "Pepper") 
                // but avoid common recipe title words if they appear alone
                const commonRecipeTitleWords = /fried rice|chicken|beef|shrimp|pork|pasta|salad|soup/i;
                if (commonRecipeTitleWords.test(l) && !hasUnit) return false;

                return l.length < 30;
            });

        // Expand compound "and" ingredients into multiple lines before parsing
        const expandedLines: string[] = [];
        for (const line of lines) {
            // If line has "peas and carrots"-style compounds after qty/unit, split for better matching
            // But keep lines like "salt and pepper" together
            const compoundMatch = line.match(/^([0-9\s./]+(?:st|nd|rd|th)?|\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\b)?\s*(cup|cups|tbsp|tsp|gram|grams|g|ml|oz|lb|piece|pieces|clove|cloves|pinch|whole|lb|lbs|ounce|ounces|bottle|can|package|pkg|slice|slices|tablespoon|tablespoons|teaspoon|teaspoons)?\s*(.+)\s+and\s+(.+)$/i);
            if (compoundMatch && !/salt and pepper|oil and vinegar|butter and flour/i.test(line)) {
                const qty = compoundMatch[1] || '';
                const unit = compoundMatch[2] || '';
                const item1 = compoundMatch[3].trim();
                const item2 = compoundMatch[4].trim();
                expandedLines.push(`${qty} ${unit} ${item1}`.trim());
                expandedLines.push(`${qty} ${unit} ${item2}`.trim());
            } else {
                expandedLines.push(line);
            }
        }

        const parsed = expandedLines.map(line => {
            let cleanLine = line.replace(/^[•\-\d.]+\s*/, '').trim();

            // Strip noise: parentheses, 'or X' alternatives, comma suffixes, filler words
            cleanLine = cleanLine
                .replace(/\(.*?\)/g, '')                                          // (do not thaw)
                .replace(/\bor\s+[\w\s]+$/i, '')                                   // "soy sauce or tamari" -> "soy sauce"
                .replace(/,\s*(divided|topped|plus more|as needed|preferably|see recipe notes).*$/i, '')
                .replace(/\b(plus|divided|divided into|plus more|as needed|preferably|see recipe notes|cold cooked|kosher|toasted|ground|frozen)\b/gi, '')
                .replace(/\b(medium|large|small|fresh|dried|raw|cooked|whole|boneless|skinless)\b/gi, '')
                .trim();

            const match = cleanLine.match(/^(?:([\d\s./]+)|(one|two|three|four|five|six|seven|eight|nine|ten))\s*(cup|cups|tbsp|tsp|gram|grams|g|ml|oz|lb|piece|pieces|clove|cloves|pinch|whole|lb|lbs|ounce|ounces|bottle|can|package|pkg|slice|slices|tablespoon|tablespoons|teaspoon|teaspoons)?\s*(.*)$/i);

            if (match) {
                let qty = (match[1] || match[2] || '').trim().replace(/(st|nd|rd|th)$/i, '');
                const wordMap: any = { 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10' };
                if (wordMap[qty.toLowerCase()]) qty = wordMap[qty.toLowerCase()];

                qty = parseQuantityString(qty).toString();

                // Clean name: take first part before 'and' if it looks like a compound ingredient
                let name = (match[4] || '').replace(/,\s*.*$/, '').trim();
                // Reduce compound like "peas and carrots" to first keyword for matching
                // (user can use 'Pick' to fix if needed)
                return { raw: line, quantity: qty || '1', unit: match[3] || 'serving', name, status: 'PENDING' };
            }
            return { raw: line, name: cleanLine, quantity: '1', unit: 'serving', status: 'PENDING' };
        }).filter(item => item.name.length > 1);

        // Try to match with DB (limit to first 15 for performance)
        const processed = await Promise.all(parsed.slice(0, 20).map(async (ing) => {
            try {
                const res = await fetch(`/api/ingredient/search?q=${encodeURIComponent(ing.name)}`);
                const matches = await res.json();
                if (matches.length > 0) {
                    return { ...ing, match: matches[0], status: 'MATCHED' };
                }
                return { ...ing, status: 'NO_MATCH' };
            } catch {
                return { ...ing, status: 'ERROR' };
            }
        }));

        setParsedIngredients(processed);
        setStep(2);
        setLoading(false);
    };

    const handleManualSearch = async (q: string) => {
        setManualQuery(q);
        if (q.length < 2) {
            setManualResults([]);
            return;
        }
        try {
            const res = await fetch(`/api/ingredient/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            setManualResults(data);
        } catch (err) {
            console.error('Manual search failed:', err);
        }
    };

    const selectManualMatch = (ingIndex: number, match: any) => {
        const newParsed = [...parsedIngredients];
        newParsed[ingIndex] = {
            ...newParsed[ingIndex],
            match,
            status: 'MATCHED'
        };
        setParsedIngredients(newParsed);
        setIsSearching({ active: false, index: -1 });
        setManualQuery('');
        setManualResults([]);
    };

    const handleAddSearch = async (q: string) => {
        setAddQuery(q);
        if (q.length < 2) { setAddResults([]); return; }
        try {
            const res = await fetch(`/api/ingredient/search?q=${encodeURIComponent(q)}`);
            setAddResults(await res.json());
        } catch { setAddResults([]); }
    };

    const addIngredientFromSearch = (match: any) => {
        setParsedIngredients(prev => [...prev, {
            raw: match.name,
            name: match.name,
            quantity: '1',
            unit: 'serving',
            match,
            status: 'MATCHED'
        }]);
        setIsAddingNew(false);
        setAddQuery('');
        setAddResults([]);
    };

    const handleSaveRecipe = async (logToDiary: boolean = false) => {
        setLoading(true);
        try {
            // Only include ingredients that have a matched database entry
            const matchedIngredients = parsedIngredients.filter(p => p.match?.id);

            if (matchedIngredients.length === 0) {
                alert('Please match at least one ingredient before saving.');
                setLoading(false);
                return;
            }

            // Pre-calculate nutrients for the recipe (for diary snapshot)
            const totals = { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0, fat: 0, carbs: 0 };
            matchedIngredients.forEach(p => {
                const scaled = scaleNutrients(
                    p.match.nutrients || {},
                    parseFloat(p.quantity) || 1,
                    p.unit || 'serving',
                    p.match.servingSizes
                );

                totals.calories += scaled.calories || 0;
                totals.protein += scaled.protein || 0;
                totals.sodium += scaled.sodium || 0;
                totals.potassium += scaled.potassium || 0;
                totals.phosphorus += scaled.phosphorus || 0;
                totals.fluid += scaled.fluid || 0;
                totals.fat += (scaled.fat || 0);
                totals.carbs += (scaled.carbs || 0);
            });
            const srv = Math.max(parseFloat(String(servings)) || 1, 1);
            const perServing = {
                calories: Math.round(totals.calories / srv),
                protein: Math.round((totals.protein / srv) * 10) / 10,
                sodium: Math.round(totals.sodium / srv),
                potassium: Math.round(totals.potassium / srv),
                phosphorus: Math.round(totals.phosphorus / srv),
                fluid: Math.round((totals.fluid / srv) * 10) / 10,
                fat: Math.round((totals.fat / srv) * 10) / 10,
                carbs: Math.round((totals.carbs / srv) * 10) / 10,
            };

            const res = await fetch('/api/recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    servings,
                    ingredients: matchedIngredients.map(p => ({
                        ingredientId: p.match!.id,
                        quantity: parseFloat(p.quantity) || 1,
                        unit: p.unit || 'serving',
                        // Calculate grams for exactly 1 unit of this ingredient to store as baseline
                        gramsEquivalent: getGramsForQuantity(1, p.unit || 'serving', p.match!.servingSizes),
                        displayNameOverride: p.name
                    }))
                })
            });

            if (res.ok) {
                const recipe = await res.json();

                if (logToDiary && date && mealType) {
                    await fetch(`/api/diary/${date}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mealType,
                            itemType: 'RECIPE',
                            recipeId: recipe.id,
                            quantity: servingsConsumed,
                            unit: 'serving',
                            nutrientsSnapshot: perServing
                        })
                    });
                }

                router.push(`/food-tracker?date=${date || ''}`);
            } else {
                const errJson = await res.json().catch(() => ({}));
                alert(`Failed to save recipe: ${errJson.error || res.statusText}`);
            }
        } catch (err) {
            console.error('Save failed:', err);
            alert('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto px-4 pt-6 pb-24 min-h-screen bg-background-light dark:bg-background-dark">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="p-2 hover:bg-primary/5 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-primary">arrow_back</span>
                </button>
                <h1 className="text-xl font-black text-primary uppercase tracking-tight">Recipe Builder</h1>
            </div>

            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                    <div className="bg-white dark:bg-card-dark p-6 rounded-3xl shadow-sm border border-primary/5">
                        <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-2 block">Recipe Name</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Mom's Special Pasta"
                            className="w-full p-4 rounded-2xl bg-primary/5 border border-primary/10 text-sm font-bold text-primary outline-none focus:border-primary/50 transition-all"
                        />

                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-2 block">Recipe Yield</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        value={servings}
                                        onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                                        className="w-full p-4 rounded-2xl bg-primary/5 border border-primary/10 text-sm font-bold text-primary outline-none"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary/20 uppercase">Servings</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-2 block">Portion Consumed</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0.25"
                                        step="0.25"
                                        value={servingsConsumed}
                                        onChange={(e) => setServingsConsumed(parseFloat(e.target.value) || 1)}
                                        className="w-full p-4 rounded-2xl bg-primary/5 border border-primary/10 text-sm font-bold text-primary outline-none"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary/20 uppercase">Servings</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-card-dark p-6 rounded-3xl shadow-sm border border-primary/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                        <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-2 block relative z-10">Paste Ingredients or Recipe Article</label>
                        <p className="text-[10px] text-primary/30 mb-4 italic relative z-10 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                            Smart Analysis will filter out instructions and extract ingredients.
                        </p>
                        <textarea
                            rows={10}
                            value={rawIngredients}
                            onChange={(e) => setRawIngredients(e.target.value)}
                            placeholder="Example: 1 cup chopped apples, 2 tbsp honey, or just paste the whole blog post..."
                            className="w-full p-4 rounded-2xl bg-primary/5 border border-primary/10 text-sm font-bold text-primary outline-none focus:border-primary/50 transition-all resize-none relative z-10"
                        />
                    </div>

                    <button
                        onClick={parseLines}
                        disabled={!title || !rawIngredients || loading}
                        className="w-full py-5 rounded-3xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-3 group"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-b-white"></div>
                                <span>Analyzing with Magic...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">magic_button</span>
                                <span>Perform Smart AI Analysis</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                    <div className="bg-white dark:bg-card-dark p-6 rounded-3xl shadow-sm border border-primary/5">
                        <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-4">Review Matches</h3>
                        <div className="space-y-4">
                            {parsedIngredients.map((ing, idx) => (
                                <div key={idx} className="p-4 rounded-2xl border border-primary/5 bg-primary/[0.02]">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-xs font-bold text-primary/80">{ing.raw}</p>
                                        {ing.status === 'MATCHED' ? (
                                            <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-yellow-500 text-sm">help</span>
                                        )}
                                    </div>

                                    {ing.status === 'MATCHED' ? (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-widest">
                                                <span>Matched to: {ing.match.name}</span>
                                            </div>
                                            <button
                                                onClick={() => setIsSearching({ active: true, index: idx })}
                                                className="text-[10px] font-black text-primary/40 hover:text-primary transition-colors underline"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">
                                                No exact match found. Please verify.
                                            </div>
                                            <button
                                                onClick={() => setIsSearching({ active: true, index: idx })}
                                                className="px-3 py-1 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest"
                                            >
                                                Pick
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add Ingredient Button */}
                        <button
                            onClick={() => setIsAddingNew(true)}
                            className="mt-4 w-full py-3 rounded-2xl border-2 border-dashed border-primary/20 text-[10px] font-black text-primary/40 hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Add Ingredient
                        </button>
                    </div>


                    {/* Manual Search Modal Overlay */}
                    {isSearching.active && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="bg-white dark:bg-card-dark w-full max-w-sm rounded-[2rem] shadow-2xl border border-primary/10 overflow-hidden flex flex-col max-h-[80vh]">
                                <div className="p-6 border-b border-primary/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-black text-primary uppercase tracking-widest">Find Ingredient</h3>
                                        <button onClick={() => setIsSearching({ active: false, index: -1 })} className="p-2 bg-primary/5 rounded-full">
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                    <input
                                        autoFocus
                                        value={manualQuery}
                                        onChange={(e) => handleManualSearch(e.target.value)}
                                        placeholder="Search for an ingredient..."
                                        className="w-full p-4 rounded-2xl bg-primary/5 border border-primary/10 text-sm font-bold text-primary outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {manualResults.length > 0 ? (
                                        manualResults.map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => selectManualMatch(isSearching.index, result)}
                                                className="w-full p-4 rounded-xl hover:bg-primary/5 text-left transition-colors flex items-center justify-between group"
                                            >
                                                <div>
                                                    <p className="text-sm font-bold text-primary">{result.name}</p>
                                                    <p className="text-[10px] text-primary/40 uppercase font-black">{result.category}</p>
                                                </div>
                                                <span className="material-symbols-outlined text-primary/20 group-hover:text-primary transition-all">add_circle</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-primary/30 text-xs font-bold">
                                            {manualQuery.length < 2 ? 'Start typing to search...' : 'No ingredients found.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add Ingredient Modal */}
                    {isAddingNew && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="bg-white dark:bg-card-dark w-full max-w-sm rounded-[2rem] shadow-2xl border border-primary/10 overflow-hidden flex flex-col max-h-[80vh]">
                                <div className="p-6 border-b border-primary/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-black text-primary uppercase tracking-widest">Add Ingredient</h3>
                                        <button onClick={() => { setIsAddingNew(false); setAddQuery(''); setAddResults([]); }} className="p-2 bg-primary/5 rounded-full">
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                    <input
                                        autoFocus
                                        value={addQuery}
                                        onChange={(e) => handleAddSearch(e.target.value)}
                                        placeholder="Search for an ingredient to add..."
                                        className="w-full p-4 rounded-2xl bg-primary/5 border border-primary/10 text-sm font-bold text-primary outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {addResults.length > 0 ? (
                                        addResults.map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => addIngredientFromSearch(result)}
                                                className="w-full p-4 rounded-xl hover:bg-primary/5 text-left transition-colors flex items-center justify-between group"
                                            >
                                                <div>
                                                    <p className="text-sm font-bold text-primary">{result.name}</p>
                                                    <p className="text-[10px] text-primary/40 uppercase font-black">{result.category}</p>
                                                </div>
                                                <span className="material-symbols-outlined text-primary/20 group-hover:text-primary transition-all">add_circle</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-primary/30 text-xs font-bold">
                                            {addQuery.length < 2 ? 'Start typing to search...' : 'No ingredients found.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-4 rounded-3xl border border-primary/10 text-[10px] font-black text-primary/60 hover:bg-primary/5 transition-all uppercase tracking-widest"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => handleSaveRecipe(false)}
                            disabled={loading}
                            className="flex-1 py-4 rounded-3xl border border-primary text-primary font-black uppercase tracking-widest hover:bg-primary/5 transition-all"
                        >
                            {loading && !saveAndLog ? 'Saving...' : 'Save Only'}
                        </button>
                        <button
                            onClick={() => { setSaveAndLog(true); handleSaveRecipe(true); }}
                            disabled={loading}
                            className="flex-[2] py-4 rounded-3xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                        >
                            {loading && saveAndLog ? 'Logging...' : 'Save & Log'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function parseQuantityString(raw: string) {
    const value = raw.trim();
    if (!value) return 1;

    if (/^\d+\s+\d+\/\d+$/.test(value)) {
        const [whole, fraction] = value.split(/\s+/);
        const [num, den] = fraction.split('/').map(Number);
        if (den) return Number(whole) + num / den;
    }

    if (/^\d+\/\d+$/.test(value)) {
        const [num, den] = value.split('/').map(Number);
        if (den) return num / den;
    }

    const parsed = parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
