export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hasSeedAccess } from '@/lib/seed-auth';
import { getImportJob, setImportJob } from '@/lib/import-jobs';

type UsdaFood = {
    fdcId?: number;
    description?: string;
    brandOwner?: string;
    brandName?: string;
    foodCategory?: string;
    servingSize?: number;
    servingSizeUnit?: string;
    foodNutrients?: Array<{
        nutrientName?: string;
        value?: number | string;
    }>;
};

const TERM_PACKS: Record<string, string[]> = {
    produce: [
        'apple', 'banana', 'orange', 'berries', 'grapes', 'mango', 'pineapple',
        'broccoli', 'spinach', 'kale', 'carrot', 'onion', 'garlic', 'tomato',
        'pepper', 'cucumber', 'mushroom', 'zucchini', 'lettuce', 'cabbage'
    ],
    proteins: [
        'chicken breast', 'ground beef', 'turkey', 'salmon', 'tuna', 'shrimp',
        'eggs', 'tofu', 'greek yogurt', 'milk', 'cheese', 'beans', 'lentils'
    ],
    grains: [
        'white rice', 'brown rice', 'quinoa', 'oats', 'bread', 'pasta', 'cereal',
        'tortilla', 'bagel', 'crackers'
    ],
    snacks: [
        'granola bar', 'chips', 'popcorn', 'cookies', 'ice cream', 'chocolate',
        'pretzels', 'trail mix', 'protein bar'
    ],
    fastfood: [
        'burger', 'pizza', 'french fries', 'fried chicken', 'taco', 'burrito',
        'sandwich', 'hot dog', 'milkshake', 'soda'
    ],
    beverages: [
        'coffee', 'tea', 'juice', 'smoothie', 'sports drink', 'energy drink',
        'sparkling water', 'cola'
    ],
    global: [
        'biryani', 'fried rice', 'ramen', 'curry', 'dumplings', 'pho', 'sushi',
        'falafel', 'shawarma', 'paella', 'enchiladas', 'lasagna'
    ]
};

TERM_PACKS.all = Array.from(new Set(Object.values(TERM_PACKS).flat()));

export async function GET(req: Request) {
    try {
        if (!hasSeedAccess(req, "SEED_SECRET")) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const usdaKey = process.env.USDA_API_KEY;
        if (!usdaKey) {
            return NextResponse.json({ error: 'USDA_API_KEY is not configured' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const reset = (searchParams.get('reset') || '0') === '1';
        const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get('pageSize') || '25', 10)));
        const pagesPerTerm = Math.min(8, Math.max(1, parseInt(searchParams.get('pagesPerTerm') || '2', 10)));
        let termOffset = Math.max(0, parseInt(searchParams.get('termOffset') || '0', 10));
        const termLimit = Math.min(20, Math.max(1, parseInt(searchParams.get('termLimit') || '5', 10)));
        const persistIngredients = (searchParams.get('persistIngredients') || '1') === '1';
        const packName = (searchParams.get('termPack') || 'produce').toLowerCase();
        const jobKey = (searchParams.get('jobKey') || `food-usda:${packName}`).trim();
        const termsOverride = (searchParams.get('terms') || '').trim();

        let terms = termsOverride
            ? termsOverride.split(',').map((term) => term.trim()).filter(Boolean)
            : (TERM_PACKS[packName] || TERM_PACKS.produce);

        terms = Array.from(new Set(terms));
        const existingJob = !reset ? await getImportJob(jobKey) : null;
        if (!searchParams.has('termOffset') && existingJob?.cursor?.nextTermOffset != null) {
            termOffset = Math.max(0, Number(existingJob.cursor.nextTermOffset) || 0);
        }
        const pagedTerms = terms.slice(termOffset, termOffset + termLimit);

        if (reset) {
            await db.foodItem.deleteMany({
                where: {
                    source: { startsWith: 'USDA_BULK' }
                }
            });
            if (persistIngredients) {
                await db.ingredient.deleteMany({
                    where: {
                        source: { startsWith: 'USDA_BULK' }
                    }
                });
            }
        }

        let fetched = 0;
        let created = 0;
        let updated = 0;
        let ingredientCreated = 0;
        const sample: string[] = [];

        await setImportJob(jobKey, {
            kind: 'USDA_FOOD_BULK',
            status: 'RUNNING',
            cursor: { termOffset, termLimit, nextTermOffset: termOffset },
            metrics: { fetched: 0, created: 0, updated: 0, ingredientCreated: 0, totalTerms: terms.length },
            message: `Starting USDA food import for pack "${packName}".`
        });

        for (const term of pagedTerms) {
            for (let pageNumber = 1; pageNumber <= pagesPerTerm; pageNumber++) {
                const foods = await searchUsdaFoods(term, usdaKey, pageSize, pageNumber);

                for (const food of foods) {
                    fetched += 1;
                    const normalized = normalizeUsdaFood(food, term);
                    if (!normalized) continue;

                    const exists = await db.foodItem.findUnique({
                        where: { barcode: normalized.barcode }
                    });

                    await db.foodItem.upsert({
                        where: { barcode: normalized.barcode },
                        update: normalized.foodItem,
                        create: normalized.foodItem
                    });

                    if (exists) updated += 1;
                    else created += 1;

                    if (persistIngredients) {
                        const existingIngredient = await db.ingredient.findFirst({
                            where: {
                                name: normalized.ingredient.name,
                                source: normalized.ingredient.source
                            }
                        });

                        if (!existingIngredient) {
                            await db.ingredient.create({ data: normalized.ingredient });
                            ingredientCreated += 1;
                        }
                    }

                    if (sample.length < 25) {
                        sample.push(normalized.foodItem.name);
                    }
                }
            }
        }

        const nextTermOffset = termOffset + termLimit < terms.length ? termOffset + termLimit : null;

        await setImportJob(jobKey, {
            kind: 'USDA_FOOD_BULK',
            status: nextTermOffset == null ? 'COMPLETED' : 'RUNNING',
            cursor: { termOffset, termLimit, nextTermOffset },
            metrics: { fetched, created, updated, ingredientCreated, totalTerms: terms.length },
            message: nextTermOffset == null ? 'USDA food import complete.' : 'USDA food import batch complete.'
        });

        return NextResponse.json({
            ok: true,
            jobKey,
            pack: packName,
            termsProcessed: pagedTerms,
            termOffset,
            termLimit,
            nextTermOffset,
            totalTerms: terms.length,
            pageSize,
            pagesPerTerm,
            fetched,
            created,
            updated,
            ingredientCreated,
            sample
        });
    } catch (error) {
        console.error('USDA bulk seed error:', error);
        const { searchParams } = new URL(req.url);
        const jobKey = (searchParams.get('jobKey') || `food-usda:${(searchParams.get('termPack') || 'produce').toLowerCase()}`).trim();
        await setImportJob(jobKey, {
            kind: 'USDA_FOOD_BULK',
            status: 'FAILED',
            cursor: {},
            metrics: {},
            message: error instanceof Error ? error.message : 'Unknown USDA food import error'
        }).catch(() => {});
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function searchUsdaFoods(query: string, apiKey: string, pageSize: number, pageNumber: number): Promise<UsdaFood[]> {
    const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('query', query);
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('pageNumber', String(pageNumber));
    url.searchParams.set('requireAllWords', 'false');

    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`USDA request failed for "${query}" page ${pageNumber}: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data?.foods) ? data.foods : [];
}

function normalizeUsdaFood(food: UsdaFood, fallbackQuery: string) {
    const description = String(food.description || '').trim();
    if (!description || !isMostlyEnglish(description) || !food.fdcId) {
        return null;
    }

    const nutrients = mapUsdaNutrients(food.foodNutrients || []);
    const brand = String(food.brandOwner || food.brandName || 'Generic').trim();
    const category = mapCategory(String(food.foodCategory || fallbackQuery || 'Foods'));
    const servingSize = Number(food.servingSize || 0);
    const servingUnit = String(food.servingSizeUnit || '').trim();
    const normalizedServing = normalizeUsdaServing(servingSize, servingUnit);
    const servingSizes = normalizedServing > 0
        ? [
            { name: `${servingSize}${servingUnit.toLowerCase()}`, weightG: normalizedServing },
            { name: '100g', weightG: 100 }
        ]
        : [{ name: '100g', weightG: 100 }];

    const barcode = `usda_${food.fdcId}`;
    const source = `USDA_BULK:${fallbackQuery}`;

    return {
        barcode,
        foodItem: {
            name: description,
            brand,
            barcode,
            nutrients: JSON.stringify(nutrients),
            servingSizes: JSON.stringify(servingSizes),
            source,
            category
        },
        ingredient: {
            name: description,
            nutrients: JSON.stringify(nutrients),
            servingSizes: JSON.stringify(servingSizes),
            source,
            category
        }
    };
}

function mapUsdaNutrients(items: Array<{ nutrientName?: string; value?: number | string }>) {
    const map: Record<string, number> = {};
    for (const nutrient of items) {
        const key = String(nutrient.nutrientName || '').toLowerCase();
        const parsed = typeof nutrient.value === 'number' ? nutrient.value : parseFloat(String(nutrient.value ?? ''));
        if (!key || !Number.isFinite(parsed)) continue;
        map[key] = parsed;
    }

    return {
        calories: round(map['energy'] || map['energy (kcal)'] || 0),
        protein: round(map['protein'] || 0),
        sodium: round(map['sodium'] || map['sodium, na'] || 0),
        potassium: round(map['potassium'] || map['potassium, k'] || 0),
        phosphorus: round(map['phosphorus'] || map['phosphorus, p'] || 0),
        fluid: round(map['water'] || 0),
        fat: round(map['total lipid (fat)'] || map['fat'] || 0),
        carbs: round(map['carbohydrate, by difference'] || map['carbohydrate'] || 0)
    };
}

function normalizeUsdaServing(size: number, unit: string) {
    if (!Number.isFinite(size) || size <= 0) return 0;
    const normalized = unit.toLowerCase();
    if (normalized.includes('g')) return size;
    if (normalized.includes('ml')) return size;
    if (normalized.includes('oz')) return size * 28.3495;
    if (normalized.includes('lb')) return size * 453.592;
    return size;
}

function mapCategory(value: string) {
    const normalized = value.toLowerCase();
    if (normalized.includes('fruit')) return 'Fruits';
    if (normalized.includes('vegetable')) return 'Vegetables';
    if (normalized.includes('beef') || normalized.includes('pork') || normalized.includes('chicken') || normalized.includes('turkey')) return 'Meats & Proteins';
    if (normalized.includes('seafood') || normalized.includes('fish') || normalized.includes('shellfish')) return 'Fish & Seafood';
    if (normalized.includes('dairy') || normalized.includes('cheese') || normalized.includes('milk') || normalized.includes('egg')) return 'Dairy & Alternatives';
    if (normalized.includes('grain') || normalized.includes('rice') || normalized.includes('pasta') || normalized.includes('bread') || normalized.includes('cereal')) return 'Grains & Carbs';
    if (normalized.includes('snack') || normalized.includes('dessert') || normalized.includes('candy')) return 'Snacks & Packaged Basics';
    if (normalized.includes('fast') || normalized.includes('restaurant')) return 'Fast Food & Restaurant';
    if (normalized.includes('beverage') || normalized.includes('drink')) return 'Beverages';
    return 'Foods';
}

function isMostlyEnglish(value: string) {
    const asciiish = value
        .split('')
        .filter((char) => /[A-Za-z0-9 ,.'()\\/%+-]/.test(char))
        .length;
    return asciiish >= Math.max(3, Math.floor(value.length * 0.8));
}

function round(value: number) {
    return Math.round(value * 100) / 100;
}
