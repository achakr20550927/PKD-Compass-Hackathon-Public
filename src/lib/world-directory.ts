type CountryMeta = {
    country: string;
    continent: string;
};

export type WorldLocation = {
    continent: string;
    country: string;
    state: string | null;
    city: string;
};

declare global {
    // eslint-disable-next-line no-var
    var __worldDirectoryCache: { locations: WorldLocation[]; expiresAt: number } | undefined;
    // eslint-disable-next-line no-var
    var __worldCountryMetaCache: { data: Record<string, CountryMeta>; expiresAt: number } | undefined;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_LOCATION_ROWS = 60000;
const WORLD_CITIES_URL = 'https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json';
const REST_COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=cca2,name,region,subregion';

export async function getWorldLocations(): Promise<WorldLocation[]> {
    const cached = globalThis.__worldDirectoryCache;
    if (cached && cached.expiresAt > Date.now()) {
        return cached.locations;
    }

    const countryMeta = await getCountryMeta();
    const response = await fetch(WORLD_CITIES_URL, { cache: 'force-cache' });
    if (!response.ok) {
        throw new Error(`Failed to load world cities dataset (${response.status})`);
    }

    const rawRows = await response.json() as Array<{
        name?: string;
        country?: string;
        admin1?: string;
    }>;

    const seen = new Set<string>();
    const countsByCountry = new Map<string, number>();
    const countsByCountryState = new Map<string, number>();
    const locations: WorldLocation[] = [];

    for (const row of rawRows) {
        const city = normalizeName(row.name);
        const countryCode = String(row.country ?? '').trim().toUpperCase();
        if (!city || !countryCode) continue;

        const meta = countryMeta[countryCode];
        if (!meta?.country || !meta.continent) continue;

        const country = meta.country;
        const continent = meta.continent;
        const state = normalizeState(row.admin1);
        const dedupeKey = [continent, country, state ?? '', city].join('|').toUpperCase();
        if (seen.has(dedupeKey)) continue;

        const countryCount = countsByCountry.get(country) ?? 0;
        if (countryCount >= 160) continue;

        const stateKey = `${country}|${state ?? 'NONE'}`;
        const stateCount = countsByCountryState.get(stateKey) ?? 0;
        if (stateCount >= 40) continue;

        seen.add(dedupeKey);
        countsByCountry.set(country, countryCount + 1);
        countsByCountryState.set(stateKey, stateCount + 1);
        locations.push({ continent, country, state, city });

        if (locations.length >= MAX_LOCATION_ROWS) break;
    }

    globalThis.__worldDirectoryCache = {
        locations,
        expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return locations;
}

export async function getWorldLocationOptions(filters: {
    continent?: string | null;
    country?: string | null;
    state?: string | null;
    city?: string | null;
    search?: string | null;
}) {
    const all = await getWorldLocations();
    const filtered = filterWorldLocations(all, filters);

    const regions = uniqueSorted(all.map((item) => item.continent));
    const countries = uniqueSorted(
        (filters.continent ? filtered : all)
            .filter((item) => !filters.continent || item.continent === filters.continent)
            .map((item) => item.country)
    );
    const states = uniqueSorted(
        filtered
            .map((item) => item.state)
            .filter((value): value is string => Boolean(value))
    );
    const cities = uniqueSorted(filtered.map((item) => item.city)).slice(0, 20000);

    return { regions, countries, states, cities };
}

export function filterWorldLocations(
    all: WorldLocation[],
    filters: { continent?: string | null; country?: string | null; state?: string | null; city?: string | null; search?: string | null }
) {
    const search = (filters.search ?? '').trim().toUpperCase();
    return all.filter((item) => {
        if (filters.continent && filters.continent !== 'ALL' && item.continent.toUpperCase() !== filters.continent.toUpperCase()) return false;
        if (filters.country && filters.country !== 'ALL' && item.country.toUpperCase() !== filters.country.toUpperCase()) return false;
        if (filters.state && filters.state !== 'ALL' && (item.state ?? '').toUpperCase() !== filters.state.toUpperCase()) return false;
        if (filters.city && filters.city !== 'ALL' && item.city.toUpperCase() !== filters.city.toUpperCase()) return false;
        if (search) {
            const haystack = [item.city, item.state ?? '', item.country, item.continent].join(' ').toUpperCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });
}

export function generateSyntheticDirectoryEntries(
    locations: WorldLocation[],
    options: {
        category?: string | null;
        offset?: number;
        limit?: number;
    } = {}
) {
    const templatesByCategory: Record<string, Array<{ suffix: string; summary: string; services: string[]; cost: string }>> = {
        HOSPITALS: [
            {
                suffix: 'Kidney Center',
                summary: 'Regional nephrology, dialysis, and chronic kidney disease support.',
                services: ['Nephrology', 'Dialysis', 'CKD Care'],
                cost: 'INSURANCE',
            },
            {
                suffix: 'Renal Hospital',
                summary: 'Academic renal care, transplant referrals, and PKD monitoring.',
                services: ['Transplant', 'PKD', 'Specialist Care'],
                cost: 'MIXED',
            },
            {
                suffix: 'Nephrology Institute',
                summary: 'Kidney diagnostics, hypertension management, and specialist follow-up.',
                services: ['Nephrology', 'Hypertension', 'Follow-up Care'],
                cost: 'INSURANCE',
            },
            {
                suffix: 'Dialysis & Renal Clinic',
                summary: 'Outpatient dialysis access, renal monitoring, and chronic care planning.',
                services: ['Dialysis', 'Outpatient Care', 'Renal Monitoring'],
                cost: 'MIXED',
            },
        ],
        SUPPORT_GROUP: [
            {
                suffix: 'Kidney Support Network',
                summary: 'Peer support, patient navigation, and caregiver education.',
                services: ['Support Groups', 'Education', 'Caregiver Support'],
                cost: 'FREE',
            },
            {
                suffix: 'PKD Community Circle',
                summary: 'Community-led PKD support, events, and local patient check-ins.',
                services: ['PKD', 'Events', 'Peer Support'],
                cost: 'FREE',
            },
            {
                suffix: 'Renal Peer Forum',
                summary: 'Local kidney patient discussion groups and family support coordination.',
                services: ['Peer Support', 'Family Support', 'Education'],
                cost: 'FREE',
            },
            {
                suffix: 'Caregiver Kidney Collective',
                summary: 'Support meetings and practical guidance for caregivers and families.',
                services: ['Caregiver Support', 'Meetups', 'Navigation'],
                cost: 'FREE',
            },
        ],
        ADVOCACY: [
            {
                suffix: 'Renal Advocacy Alliance',
                summary: 'Kidney access advocacy, awareness campaigns, and patient rights resources.',
                services: ['Advocacy', 'Policy', 'Navigation'],
                cost: 'FREE',
            },
            {
                suffix: 'Kidney Rights Coalition',
                summary: 'Resource hub for screening access, legislation, and public education.',
                services: ['Awareness', 'Policy', 'Education'],
                cost: 'FREE',
            },
            {
                suffix: 'Patient Access Foundation',
                summary: 'Support for access to kidney specialists, financial navigation, and screening.',
                services: ['Access Support', 'Financial Navigation', 'Advocacy'],
                cost: 'FREE',
            },
            {
                suffix: 'PKD Action Network',
                summary: 'Local awareness campaigns, public policy engagement, and patient outreach.',
                services: ['PKD', 'Awareness', 'Policy'],
                cost: 'FREE',
            },
        ],
    };

    const requested = normalizeCategory(options.category);
    const activeCategories = requested ? [requested] : ['HOSPITALS', 'SUPPORT_GROUP', 'ADVOCACY'];
    const generated: Array<Record<string, any>> = [];

    for (const location of locations) {
        for (const category of activeCategories) {
            const templates = templatesByCategory[category] ?? [];
            for (const template of templates) {
                const slug = [location.country, location.state ?? '', location.city, template.suffix]
                    .join('-')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                generated.push({
                    id: `synthetic:${slug}:${category.toLowerCase()}`,
                    name: `${location.city} ${template.suffix}`,
                    summary: `${template.summary} Localized for ${location.city}, ${location.country}.`,
                    city: location.city,
                    state: location.state,
                    country: location.country,
                    continent: location.continent,
                    phone: null,
                    website: `https://www.google.com/search?q=${encodeURIComponent(`${location.city} ${location.country} kidney ${template.suffix}`)}`,
                    cost: template.cost,
                    labels: JSON.stringify([location.country, location.city, 'DIRECTORY']),
                    services: JSON.stringify(template.services),
                    category: {
                        name: category,
                        label: category === 'HOSPITALS'
                            ? 'Hospitals & Renal Centers'
                            : category === 'ADVOCACY'
                                ? 'Advocacy Organizations'
                                : 'Support Groups'
                    }
                });
            }
        }
    }

    const offset = Math.max(0, options.offset ?? 0);
    const limit = Math.max(1, options.limit ?? generated.length);
    return {
        total: generated.length,
        entries: generated.slice(offset, offset + limit),
    };
}

function normalizeCategory(value?: string | null) {
    if (!value || value === 'ALL TYPES') return null;
    const normalized = value.toUpperCase().replace(/\s+/g, '_');
    if (normalized.includes('HOSPITAL')) return 'HOSPITALS';
    if (normalized.includes('ADVOC')) return 'ADVOCACY';
    if (normalized.includes('SUPPORT')) return 'SUPPORT_GROUP';
    return null;
}

async function getCountryMeta(): Promise<Record<string, CountryMeta>> {
    const cached = globalThis.__worldCountryMetaCache;
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    const response = await fetch(REST_COUNTRIES_URL, { cache: 'force-cache' });
    if (!response.ok) {
        throw new Error(`Failed to load country metadata (${response.status})`);
    }

    const rows = await response.json() as Array<{
        cca2?: string;
        region?: string;
        subregion?: string;
        name?: { common?: string };
    }>;

    const data: Record<string, CountryMeta> = {};
    for (const row of rows) {
        const code = String(row.cca2 ?? '').trim().toUpperCase();
        const country = normalizeName(row.name?.common);
        const continent = normalizeContinent(row.region, row.subregion);
        if (!code || !country || !continent) continue;
        data[code] = { country, continent };
    }

    globalThis.__worldCountryMetaCache = {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
    };
    return data;
}

function normalizeContinent(region?: string, subregion?: string) {
    const value = String(region ?? '').trim().toUpperCase();
    const sub = String(subregion ?? '').trim().toUpperCase();
    if (value === 'AFRICA') return 'AFRICA';
    if (value === 'ASIA') return 'ASIA';
    if (value === 'EUROPE') return 'EUROPE';
    if (value === 'OCEANIA') return 'OCEANIA';
    if (value === 'AMERICAS') {
        return sub.includes('SOUTH') ? 'SOUTH AMERICA' : 'NORTH AMERICA';
    }
    return 'GLOBAL';
}

function normalizeName(value?: string | null) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
}

function normalizeState(value?: string | null) {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;
    if (/^\d+$/.test(normalized)) return null;
    return normalized;
}

function uniqueSorted(values: Array<string | null | undefined>) {
    return Array.from(
        new Set(
            values
                .map((value) => String(value ?? '').trim())
                .filter(Boolean)
        )
    ).sort((a, b) => a.localeCompare(b));
}
