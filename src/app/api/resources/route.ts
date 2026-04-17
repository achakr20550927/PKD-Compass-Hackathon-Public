export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAnyUserId } from '@/lib/auth-unified';
import { db } from '@/lib/db';
import { filterWorldLocations, generateSyntheticDirectoryEntries, getWorldLocationOptions, getWorldLocations } from '@/lib/world-directory';

const HIERARCHY_CACHE_TTL_MS = 10 * 60 * 1000;
const ARTICLES_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedValue<T> = {
    value: T;
    expiresAt: number;
};

type LocationHierarchy = Record<string, Record<string, Record<string, string[]>>>;
type LegacyHierarchy = Record<string, Record<string, string[]>>;

declare global {
    // eslint-disable-next-line no-var
    var __resourcesHierarchyCache: CachedValue<any> | undefined;
    // eslint-disable-next-line no-var
    var __resourcesArticlesCache: CachedValue<any> | undefined;
}

export async function GET(req: Request) {
    try {
        const userId = await getAnyUserId(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const continent = searchParams.get('continent');
        const country = searchParams.get('country');
        const state = searchParams.get('state');
        const city = searchParams.get('city');
        const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
        const limit = Math.min(400, Math.max(1, parseInt(searchParams.get('limit') || '120', 10)));

        // Build base resource query
        const where: any = {};
        if (category && category !== 'ALL TYPES') {
            const cat = await db.resourceCategory.findFirst({
                where: { OR: [{ name: category }, { label: category }] }
            });
            if (cat) where.categoryId = cat.id;
        }

        if (continent && continent !== 'ALL') where.continent = continent;
        if (country && country !== 'ALL') where.country = country;
        if (state && state !== 'ALL') where.state = state;
        if (city && city !== 'ALL') where.city = city;

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { summary: { contains: search } },
                { services: { contains: search } },
                { city: { contains: search } },
                { state: { contains: search } },
                { country: { contains: search } },
            ];
        }

        const total = await (db as any).resourceEntry.count({ where });
        const entries = await (db as any).resourceEntry.findMany({
            where,
            include: { category: true },
            orderBy: { name: 'asc' },
            skip: offset,
            take: limit,
        });

        let combinedEntries = entries;
        let combinedTotal = total;

        const worldLocations = await getWorldLocations();
        const syntheticLocations = filterWorldLocations(worldLocations, { continent, country, state, city, search })
            .slice(0, city || state ? 12000 : (search || country ? 6000 : 1200));
        const synthetic = generateSyntheticDirectoryEntries(syntheticLocations, {
            category,
            offset: Math.max(0, offset - total),
            limit: Math.max(0, limit - entries.length),
        });

        if (entries.length < limit && synthetic.entries.length > 0) {
            combinedEntries = [...entries, ...synthetic.entries] as any;
        }
        combinedTotal = total + synthetic.total;

        let formattedHierarchy: LocationHierarchy;
        let legacyHierarchy: LegacyHierarchy;
        const cachedHierarchy = globalThis.__resourcesHierarchyCache;
        if (cachedHierarchy && cachedHierarchy.expiresAt > Date.now()) {
            formattedHierarchy = cachedHierarchy.value.tree;
            legacyHierarchy = cachedHierarchy.value.legacy;
        } else {
            const allResources = await (db as any).resourceEntry.findMany({
                select: { continent: true, country: true, state: true }
            });
            const worldOptions = await getWorldLocationOptions({});

            const hierarchy: Record<string, Record<string, Record<string, Set<string>>>> = {};
            allResources.forEach((r: any) => {
                if (!r.continent || !r.country) return;
                if (!hierarchy[r.continent]) hierarchy[r.continent] = {};
                if (!hierarchy[r.continent][r.country]) hierarchy[r.continent][r.country] = {};
                const stateKey = r.state || "__NO_STATE__";
                if (!hierarchy[r.continent][r.country][stateKey]) hierarchy[r.continent][r.country][stateKey] = new Set();
                if (r.city) hierarchy[r.continent][r.country][stateKey].add(r.city);
            });
            for (const continentName of worldOptions.regions) {
                if (!hierarchy[continentName]) hierarchy[continentName] = {};
            }
            for (const location of worldLocations.slice(0, 30000)) {
                if (!hierarchy[location.continent]) hierarchy[location.continent] = {};
                if (!hierarchy[location.continent][location.country]) hierarchy[location.continent][location.country] = {};
                const stateKey = location.state || "__NO_STATE__";
                if (!hierarchy[location.continent][location.country][stateKey]) hierarchy[location.continent][location.country][stateKey] = new Set();
                hierarchy[location.continent][location.country][stateKey].add(location.city);
            }

            formattedHierarchy = {};
            legacyHierarchy = {};
            Object.keys(hierarchy).forEach(cont => {
                formattedHierarchy[cont] = {};
                legacyHierarchy[cont] = {};
                Object.keys(hierarchy[cont]).forEach(coun => {
                    formattedHierarchy[cont][coun] = {};
                    const legacyStates = new Set<string>();
                    Object.keys(hierarchy[cont][coun]).forEach(stateName => {
                        formattedHierarchy[cont][coun][stateName] = Array.from(hierarchy[cont][coun][stateName]).sort((a, b) => a.localeCompare(b));
                        if (stateName !== "__NO_STATE__") legacyStates.add(stateName);
                    });
                    legacyHierarchy[cont][coun] = Array.from(legacyStates).sort((a, b) => a.localeCompare(b));
                });
            });

            globalThis.__resourcesHierarchyCache = {
                value: { tree: formattedHierarchy, legacy: legacyHierarchy },
                expiresAt: Date.now() + HIERARCHY_CACHE_TTL_MS,
            };
        }

        let articles: any[];
        const cachedArticles = globalThis.__resourcesArticlesCache;
        if (cachedArticles && cachedArticles.expiresAt > Date.now()) {
            articles = cachedArticles.value;
        } else {
            articles = await (db as any).article.findMany({
                orderBy: { createdAt: 'desc' },
                take: 30
            });
            globalThis.__resourcesArticlesCache = {
                value: articles,
                expiresAt: Date.now() + ARTICLES_CACHE_TTL_MS,
            };
        }

        return NextResponse.json({
            resources: combinedEntries,
            articles,
            hierarchy: legacyHierarchy,
            hierarchyTree: formattedHierarchy,
            pagination: {
                offset,
                limit,
                total: combinedTotal,
                hasMore: offset + limit < combinedTotal,
                nextOffset: offset + limit < combinedTotal ? offset + limit : null,
            }
        });
    } catch (error) {
        console.error('Resources API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
