export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAnyUserId } from '@/lib/auth-unified';
import { searchWorldFoodCatalog } from '@/lib/world-food-catalog';

type CachedUsdaSearch = { results: any[]; expiresAt: number };
const USDA_CACHE_TTL_MS = 30 * 60 * 1000;

declare global {
    // eslint-disable-next-line no-var
    var __usdaFoodSearchCache: Record<string, CachedUsdaSearch> | undefined;
}

export async function GET(req: NextRequest) {
    try {
        const userId = await getAnyUserId(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const query = (searchParams.get('q') || '').toLowerCase();
        const category = searchParams.get('category');
        const type = (searchParams.get('type') || 'all').toLowerCase(); // all, foods, recipes, meals
        const withMeta = (searchParams.get('withMeta') || '0') === '1';
        const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
        const limit = Math.min(250, Math.max(10, parseInt(searchParams.get('limit') || '120', 10)));
        const includeRemote = (searchParams.get('includeRemote') || '1') === '1';

        const results: any[] = [];
        const usdaKey = process.env.USDA_API_KEY;

        const hasQuery = query.length > 0;
        const localTake = Math.min(500, hasQuery ? Math.max(limit * 2, 120) : Math.max(limit * 3, 180));

        // 1. Search Foods & Meal Templates (Public/Seed data)
        if (type === 'all' || type === 'foods' || type === 'meals') {
            const foods = await db.foodItem.findMany({
                where: {
                    AND: [
                        category ? { category: { equals: category } } as any : {},
                        hasQuery ? {
                            OR: [
                                { name: { contains: query } },
                                { brand: { contains: query } },
                            ],
                        } : {},
                        type === 'meals' ? { brand: { contains: 'Meal Template' } } : {},
                        type === 'foods' ? { NOT: { brand: { contains: 'Meal Template' } } } : {},
                    ]
                },
                take: localTake,
            });
            results.push(...foods.map(f => ({
                id: f.id,
                name: f.name,
                brand: f.brand,
                category: (f as any).category,
                type: (f.brand === 'Meal Template' || f.brand === 'Meal Template (PKD)') ? 'MEAL' : 'FOOD',
                nutrients: JSON.parse(f.nutrients),
                servingSizes: JSON.parse(f.servingSizes)
            })));
        }

        // 2. Search Recipes (User-specific + Suggested/Global)
        if (type === 'all' || type === 'recipes' || type === 'meals') {
            const recipes = await db.recipe.findMany({
                where: {
                    AND: [
                        {
                            OR: [
                                { userId },
                                { title: { contains: 'Variation' } },
                                { title: { contains: 'Stir-Fry' } },
                                { title: { contains: 'Pasta' } },
                                { title: { contains: 'Bowl' } },
                                { title: { contains: 'Salmon' } },
                                { instructions: { contains: 'Sauté' } },
                            ]
                        },
                        hasQuery ? {
                            OR: [
                                { title: { contains: query } },
                                {
                                    ingredients: {
                                        some: {
                                            ingredient: {
                                                name: { contains: query }
                                            }
                                        }
                                    }
                                }
                            ]
                        } : {}
                    ]
                },
                include: {
                    ingredients: {
                        include: {
                            ingredient: true
                        }
                    }
                },
                take: localTake,
            });

            results.push(...recipes.map(r => {
                // Calculate total nutrients for the whole recipe
                const totals = { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0, fat: 0, carbs: 0 };
                let totalWeightG = 0;

                r.ingredients.forEach(ri => {
                    const ingNutrients = JSON.parse(ri.ingredient.nutrients);
                    // Actual grams = quantity × gramsEquivalent (grams per 1 unit/serving)
                    const actualGrams = (ri.quantity || 1) * (ri.gramsEquivalent || 100);
                    totalWeightG += actualGrams;

                    // Ingredient nutrients are per 100g
                    const ratio = actualGrams / 100;
                    totals.calories += (ingNutrients.calories || 0) * ratio;
                    totals.protein += (ingNutrients.protein || 0) * ratio;
                    totals.sodium += (ingNutrients.sodium || 0) * ratio;
                    totals.potassium += (ingNutrients.potassium || 0) * ratio;
                    totals.phosphorus += (ingNutrients.phosphorus || 0) * ratio;
                    totals.fluid += (ingNutrients.fluid || 0) * ratio;
                    totals.fat += (ingNutrients.fat || 0) * ratio;
                    totals.carbs += (ingNutrients.carbs || 0) * ratio;
                });

                // Per-serving values
                const servings = r.servings || 1;
                const perServing = {
                    calories: Math.round(totals.calories / servings),
                    protein: Math.round((totals.protein / servings) * 10) / 10,
                    sodium: Math.round(totals.sodium / servings),
                    potassium: Math.round(totals.potassium / servings),
                    phosphorus: Math.round(totals.phosphorus / servings),
                    fluid: Math.round((totals.fluid / servings) * 10) / 10,
                    fat: Math.round((totals.fat / servings) * 10) / 10,
                    carbs: Math.round((totals.carbs / servings) * 10) / 10,
                };

                return {
                    id: r.id,
                    name: r.title,
                    type: 'RECIPE',
                    servings: r.servings,
                    nutrients: perServing,
                    // Virtual serving size representing the average weight per serving
                    servingSizes: [{ name: '1 Serving', weightG: Math.round(totalWeightG / servings) }],
                    ingredients: r.ingredients.map(ri => {
                        const name = ri.displayNameOverride || ri.ingredient.name;
                        return `${ri.quantity} ${ri.unit} ${name}`.trim();
                    })
                };
            }));
        }

        // 2b. Generated global catalog recipes and meals so the mobile app can browse a large
        // catalog without waiting for a full manual seed/import cycle.
        if (type === 'all' || type === 'recipes' || type === 'meals') {
            const generated = searchWorldFoodCatalog({
                query,
                type,
                category,
            });
            results.push(...generated);
        }

        // 3. Search Saved Meals (User-specific)
        if (type === 'all' || type === 'meals') {
            const meals = await db.savedMeal.findMany({
                where: {
                    userId,
                    ...(hasQuery ? { title: { contains: query } } : {}),
                },
                include: {
                    items: {
                        include: {
                            foodItem: true,
                            recipe: {
                                include: {
                                    ingredients: {
                                        include: { ingredient: true }
                                    }
                                }
                            }
                        }
                    }
                },
                take: localTake,
            });
            results.push(...meals.map(m => {
                const totals = { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0, fat: 0, carbs: 0 };
                const ingredients: string[] = [];

                for (const item of m.items || []) {
                    if (item.foodItem) {
                        try {
                            const n = JSON.parse((item.foodItem as any).nutrients || '{}');
                            totals.calories += n.calories || 0;
                            totals.protein += n.protein || 0;
                            totals.sodium += n.sodium || 0;
                            totals.potassium += n.potassium || 0;
                            totals.phosphorus += n.phosphorus || 0;
                            totals.fluid += n.fluid || 0;
                            totals.fat += n.fat || 0;
                            totals.carbs += n.carbs || 0;
                        } catch {}
                        ingredients.push((item.foodItem as any).name);
                    } else if (item.recipe) {
                        const recipe = item.recipe as any;
                        ingredients.push(recipe.title);
                        if (recipe.ingredients?.length) {
                            for (const ri of recipe.ingredients) {
                                const name = ri.displayNameOverride || ri.ingredient?.name || 'ingredient';
                                ingredients.push(`${ri.quantity} ${ri.unit} ${name}`.trim());
                            }
                        }
                    }
                }

                return {
                    id: m.id,
                    name: m.title,
                    type: 'MEAL',
                    nutrients: totals,
                    servingSizes: [{ name: '1 Serving', weightG: 300 }],
                    ingredients
                };
            }));
        }

        // 4. Handle "Recent" if requested
        if (type === 'recent') {
            // Find latest diary entries for this user
            const recentEntries = await db.diaryEntry.findMany({
                where: {
                    day: { userId }
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    foodItem: true,
                    recipe: true
                }
            });

            // Deduplicate by name/id
            const seen = new Set();
            const recentResults = [];
            for (const entry of recentEntries) {
                const item = entry.foodItem || entry.recipe;
                if (!item) continue;
                const key = `${entry.itemType}_${item.id}`;
                if (seen.has(key)) continue;
                seen.add(key);

                recentResults.push({
                    id: item.id,
                    name: entry.itemType === 'FOOD' ? (item as any).name : (item as any).title,
                    type: entry.itemType,
                    nutrients: entry.nutrientsSnapshot ? JSON.parse(entry.nutrientsSnapshot) : null
                });
            }
            return NextResponse.json(recentResults);
        }

        // 5. USDA FoodData Central enrichment (English-only, verified nutrient source)
        if (includeRemote && usdaKey && (type === 'all' || type === 'foods' || type === 'meals')) {
            if (query.length >= 2) {
                const usdaResults = await searchUsdaFoods(query, usdaKey, localTake, Math.floor(offset / Math.max(1, limit)) + 1);
                results.push(...usdaResults);
            } else if (!query && category) {
                // Category browse with empty query: use category as a fallback query to populate results.
                const usdaResults = await searchUsdaFoods(category, usdaKey, localTake, 1);
                results.push(...usdaResults);
            }
        }

        const deduped = dedupeResults(results);
        const paged = deduped.slice(offset, offset + limit);
        if (!withMeta) {
            return NextResponse.json(paged);
        }
        return NextResponse.json({
            results: paged,
            pagination: {
                offset,
                limit,
                total: deduped.length,
                hasMore: offset + limit < deduped.length,
                nextOffset: offset + limit < deduped.length ? offset + limit : null,
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function searchUsdaFoods(query: string, apiKey: string, pageSize: number, pageNumber = 1) {
    try {
        const cacheKey = `${query.toLowerCase()}::${pageSize}::${pageNumber}`;
        const cacheBag = (globalThis.__usdaFoodSearchCache ??= {});
        const cacheHit = cacheBag[cacheKey];
        if (cacheHit && cacheHit.expiresAt > Date.now()) {
            return cacheHit.results;
        }

        const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('query', query);
        url.searchParams.set('pageSize', String(pageSize));
        url.searchParams.set('pageNumber', String(pageNumber));
        url.searchParams.set('requireAllWords', 'false');

        const res = await fetch(url.toString(), { cache: 'no-store' });
        if (!res.ok) return [];
        const data = await res.json();
        const foods = Array.isArray(data?.foods) ? data.foods : [];

        const normalized = foods
            .filter((f: any) => isEnglishString(f?.description || ''))
            .map((f: any) => {
                const nutrients = mapUsdaNutrients(f?.foodNutrients || []);
                const servingSize = f?.servingSize;
                const servingUnit = f?.servingSizeUnit;
                const servingSizes = servingSize && servingUnit
                    ? [{ name: `${servingSize}${servingUnit.toLowerCase()}`, weightG: normalizeUsdaServing(servingSize, servingUnit) }]
                    : [{ name: '100g', weightG: 100 }];

                return {
                    id: `usda_${f.fdcId}`,
                    name: f.description || 'USDA Item',
                    brand: f.brandName || 'USDA',
                    category: f.foodCategory || 'Foods',
                    type: 'FOOD',
                    nutrients,
                    servingSizes,
                    ingredients: f?.ingredients ? String(f.ingredients).split(/,|;/).map((t: string) => t.trim()).filter(Boolean).slice(0, 24) : undefined
                };
            });

        cacheBag[cacheKey] = {
            results: normalized,
            expiresAt: Date.now() + USDA_CACHE_TTL_MS,
        };

        // Persist subset to local DB for fast follow-up loads and offline-ish browsing.
        await Promise.all(normalized.slice(0, 80).map((item: any) =>
            db.foodItem.upsert({
                where: { barcode: `usda_${String(item.id).replace(/^usda_/, '')}` },
                update: {
                    name: item.name,
                    brand: item.brand,
                    category: item.category,
                    nutrients: JSON.stringify(item.nutrients),
                    servingSizes: JSON.stringify(item.servingSizes),
                    source: 'USDA',
                },
                create: {
                    name: item.name,
                    brand: item.brand,
                    category: item.category,
                    barcode: `usda_${String(item.id).replace(/^usda_/, '')}`,
                    nutrients: JSON.stringify(item.nutrients),
                    servingSizes: JSON.stringify(item.servingSizes),
                    source: 'USDA',
                }
            }).catch(() => null)
        ));

        return normalized;
    } catch {
        return [];
    }
}

function dedupeResults(items: any[]) {
    const seen = new Set<string>();
    const output: any[] = [];
    for (const item of items) {
        const key = `${item.type || 'FOOD'}::${item.id || item.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(item);
    }
    return output;
}

function mapUsdaNutrients(items: any[]) {
    const map: Record<string, number> = {};
    for (const n of items) {
        const name = String(n.nutrientName || '').toLowerCase();
        const value = typeof n.value === 'number' ? n.value : parseFloat(n.value);
        if (!Number.isFinite(value)) continue;
        map[name] = value;
    }

    const calories = map['energy'] || map['energy (kcal)'] || map['energy (kj)'] ? (map['energy (kcal)'] || map['energy'] || 0) : 0;
    const protein = map['protein'] || 0;
    const sodium = map['sodium'] || map['sodium, na'] || 0;
    const potassium = map['potassium'] || map['potassium, k'] || 0;
    const phosphorus = map['phosphorus'] || map['phosphorus, p'] || 0;
    const water = map['water'] || 0;
    const fat = map['total lipid (fat)'] || map['fat'] || 0;
    const carbs = map['carbohydrate, by difference'] || map['carbohydrate'] || 0;

    return {
        calories,
        protein,
        sodium,
        potassium,
        phosphorus,
        fluid: water,
        fat,
        carbs
    };
}

function normalizeUsdaServing(size: number, unit: string) {
    const u = unit.toLowerCase();
    if (u.includes('g')) return size;
    if (u.includes('ml')) return size;
    if (u.includes('oz')) return size * 28.3495;
    if (u.includes('lb')) return size * 453.592;
    return size;
}

function isEnglishString(value: string) {
    return value.split('').every((c) => c.charCodeAt(0) <= 127);
}
