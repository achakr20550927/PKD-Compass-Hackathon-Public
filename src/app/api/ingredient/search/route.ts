export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAnyUserId } from '@/lib/auth-unified';

export async function GET(req: NextRequest) {
    try {
        const userId = await getAnyUserId(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const query = (searchParams.get('q') || '').trim();
        const usdaKey = process.env.USDA_API_KEY;

        if (!query) return NextResponse.json([]);

        const normalizedQuery = normalizeIngredientQuery(query);
        const searchNeedle = normalizedQuery.searchText;

        // Robust search logic
        // 1. Try case-insensitive partial match first
        let ingredients = await db.ingredient.findMany({
            where: {
                OR: [
                    { name: { contains: searchNeedle } },
                    { name: { contains: query } }
                ]
            },
            take: 60,
        });

        // 2. If weak results, try keyword-based search
        if (ingredients.length < 12) {
            const keywords = normalizedQuery.keywords.filter(k => k.length > 1);
            if (keywords.length > 0) {
                const keywordMatches = await db.ingredient.findMany({
                    where: {
                        OR: keywords.map(k => ({ name: { contains: k } }))
                    },
                    take: 60
                });

                // Merge and deduplicate
                const existingIds = new Set(ingredients.map(i => i.id));
                const newMatches = keywordMatches.filter(i => !existingIds.has(i.id));
                ingredients = [...ingredients, ...newMatches];
            }
        }

        const rankedLocal = ingredients
            .map((ingredient) => ({
                ingredient,
                score: scoreIngredientMatch(normalizedQuery, ingredient.name, (ingredient as any).category ?? '')
            }))
            .sort((a, b) => b.score - a.score || a.ingredient.name.length - b.ingredient.name.length)
            .slice(0, 20);

        const results = rankedLocal.map(({ ingredient: i }) => ({
            id: i.id,
            name: i.name,
            category: (i as any).category ?? null,
            nutrients: JSON.parse(i.nutrients),
            servingSizes: JSON.parse(i.servingSizes)
        }));

        let combined = results;
        if (usdaKey) {
            const usdaIngredients = await searchUsdaIngredients(searchNeedle, usdaKey, 60);
            combined = mergeUniqueIngredients(results, usdaIngredients, normalizedQuery);
        }

        return NextResponse.json(combined);
    } catch (error) {
        console.error('Ingredient search error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function searchUsdaIngredients(query: string, apiKey: string, pageSize: number) {
    try {
        const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('query', query);
        url.searchParams.set('pageSize', String(pageSize));
        url.searchParams.set('pageNumber', '1');
        url.searchParams.set('requireAllWords', 'false');

        const res = await fetch(url.toString(), { cache: 'no-store' });
        if (!res.ok) return [];
        const data = await res.json();
        const foods = Array.isArray(data?.foods) ? data.foods : [];

        return foods
            .filter((f: any) => isEnglishString(f?.description || ''))
            .map((f: any) => {
                const nutrients = mapUsdaNutrients(f?.foodNutrients || []);
                const servingSize = f?.servingSize;
                const servingUnit = f?.servingSizeUnit;
                const servingSizes = servingSize && servingUnit
                    ? [{ name: `${servingSize}${servingUnit.toLowerCase()}`, weightG: normalizeUsdaServing(servingSize, servingUnit) }]
                    : [{ name: '100g', weightG: 100 }];

                return {
                    id: `usda_ing_${f.fdcId}`,
                    name: f.description || 'USDA Ingredient',
                    category: f.foodCategory || 'Foods',
                    nutrients,
                    servingSizes
                };
            });
    } catch {
        return [];
    }
}

function mergeUniqueIngredients(primary: any[], secondary: any[], queryInfo: ReturnType<typeof normalizeIngredientQuery>) {
    const seen = new Set(primary.map((p) => p.name.toLowerCase()));
    const merged = [...primary];
    const rankedSecondary = secondary
        .map((item) => ({
            item,
            score: scoreIngredientMatch(queryInfo, item.name, item.category || '')
        }))
        .sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length)
        .map((entry) => entry.item);

    for (const item of rankedSecondary) {
        const key = String(item.name || '').toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
    }
    return merged.slice(0, 24);
}

function mapUsdaNutrients(items: any[]) {
    const map: Record<string, number> = {};
    for (const n of items) {
        const name = String(n.nutrientName || '').toLowerCase();
        const value = typeof n.value === 'number' ? n.value : parseFloat(n.value);
        if (!Number.isFinite(value)) continue;
        map[name] = value;
    }

    const calories = map['energy'] || map['energy (kcal)'] || 0;
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

function normalizeIngredientQuery(input: string) {
    const lower = input.toLowerCase();
    const tokens = lower
        .replace(/[(),]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    const stopwords = new Set([
        'cup', 'cups', 'tbsp', 'tsp', 'teaspoon', 'teaspoons', 'tablespoon', 'tablespoons',
        'gram', 'grams', 'g', 'kg', 'ml', 'l', 'oz', 'lb', 'lbs', 'pound', 'pounds',
        'piece', 'pieces', 'whole', 'medium', 'large', 'small', 'fresh', 'frozen', 'raw',
        'cooked', 'do', 'not', 'thaw', 'plus', 'divided', 'into', 'as', 'needed', 'more',
        'to', 'taste', 'and'
    ]);

    const aliases: Record<string, string> = {
        cloves: 'clove',
        scallions: 'scallion',
        onions: 'onion',
        carrots: 'carrot',
        eggs: 'egg',
        peas: 'pea',
        tomatoes: 'tomato'
    };

    const normalizedTokens = tokens
        .filter((token) => !/^[\d./]+$/.test(token))
        .map((token) => aliases[token] || token)
        .filter((token) => !stopwords.has(token));

    const searchTokens = normalizedTokens.length > 0 ? normalizedTokens : tokens.filter((token) => !/^[\d./]+$/.test(token));
    return {
        original: input,
        searchText: searchTokens.join(' ').trim(),
        keywords: searchTokens,
        flags: {
            wantsGarlic: searchTokens.includes('garlic'),
            wantsScallion: searchTokens.includes('scallion') || searchTokens.includes('green') && searchTokens.includes('onion'),
            wantsPea: searchTokens.includes('pea'),
            wantsCarrot: searchTokens.includes('carrot'),
            wantsEgg: searchTokens.includes('egg'),
            wantsOil: searchTokens.includes('oil'),
            wantsSauce: searchTokens.includes('sauce'),
            wantsGround: lower.includes('ground'),
            wantsSpice: lower.includes('spice') || lower.includes('powder'),
            wantsFrozen: lower.includes('frozen')
        }
    };
}

function scoreIngredientMatch(
    queryInfo: ReturnType<typeof normalizeIngredientQuery>,
    candidateName: string,
    category: string
) {
    const candidate = candidateName.toLowerCase();
    const categoryLower = (category || '').toLowerCase();
    let score = 0;

    if (candidate === queryInfo.searchText) score += 150;
    if (candidate.startsWith(queryInfo.searchText)) score += 70;
    if (candidate.includes(queryInfo.searchText)) score += 35;

    for (const keyword of queryInfo.keywords) {
        if (candidate.includes(keyword)) score += 18;
    }

    if (queryInfo.flags.wantsGarlic && candidate.includes('garlic')) score += 40;
    if (queryInfo.flags.wantsScallion && (candidate.includes('scallion') || candidate.includes('green onion') || candidate.includes('spring onion'))) score += 45;
    if (queryInfo.flags.wantsPea && candidate.includes('pea')) score += 20;
    if (queryInfo.flags.wantsCarrot && candidate.includes('carrot')) score += 20;
    if (queryInfo.flags.wantsEgg && candidate.includes('egg')) score += 25;
    if (queryInfo.flags.wantsOil && candidate.includes('oil')) score += 15;
    if (queryInfo.flags.wantsSauce && candidate.includes('sauce')) score += 15;

    if (!queryInfo.flags.wantsGround && candidate.includes('ground')) score -= 20;
    if (!queryInfo.flags.wantsSpice && (categoryLower.includes('spice') || categoryLower.includes('herb') || candidate.includes('powder'))) score -= 30;
    if (queryInfo.flags.wantsGarlic && candidate.includes('cloves, ground')) score -= 90;
    if (queryInfo.flags.wantsPea && candidate.includes('wasabi')) score -= 80;
    if (queryInfo.flags.wantsScallion && candidate.includes('noodle')) score -= 90;
    if (queryInfo.flags.wantsEgg && (candidate.includes('madeleine') || candidate.includes('cookie') || candidate.includes('cake'))) score -= 100;
    if (queryInfo.flags.wantsFrozen && !candidate.includes('frozen') && candidate.includes('snack')) score -= 30;

    score -= Math.min(candidate.length, 120) * 0.08;
    return score;
}
