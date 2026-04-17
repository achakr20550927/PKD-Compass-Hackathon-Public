export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hasSeedAccess } from '@/lib/seed-auth';
import { getImportJob, setImportJob } from '@/lib/import-jobs';

const CATEGORIES = [
    { name: 'SUPPORT_GROUP', label: 'Support Groups' },
    { name: 'ADVOCACY', label: 'Advocacy Organizations' },
    { name: 'HOSPITALS', label: 'Hospitals & Renal Centers' },
];

const GEO_PACKS: Record<string, Record<string, Record<string, string[]>>> = {
    north_america: {
        USA: {
            California: ['Los Angeles', 'San Diego', 'San Francisco', 'Sacramento', 'San Jose'],
            Texas: ['Houston', 'Dallas', 'Austin', 'San Antonio'],
            Florida: ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
            NewYork: ['New York', 'Buffalo', 'Rochester'],
        },
        Canada: {
            Ontario: ['Toronto', 'Ottawa', 'Hamilton'],
            Quebec: ['Montreal', 'Quebec City'],
            BritishColumbia: ['Vancouver', 'Victoria'],
        },
        Mexico: {
            CDMX: ['Mexico City'],
            Jalisco: ['Guadalajara'],
            NuevoLeon: ['Monterrey'],
        }
    },
    europe: {
        UK: {
            England: ['London', 'Manchester', 'Birmingham'],
            Scotland: ['Glasgow', 'Edinburgh'],
        },
        Germany: {
            Berlin: ['Berlin'],
            Bavaria: ['Munich'],
            Hamburg: ['Hamburg'],
        },
        France: {
            IleDeFrance: ['Paris'],
            Rhone: ['Lyon'],
            Provence: ['Marseille'],
        },
        Italy: {
            Lazio: ['Rome'],
            Lombardy: ['Milan'],
            Tuscany: ['Florence'],
        },
        Spain: {
            Madrid: ['Madrid'],
            Catalonia: ['Barcelona'],
            Andalusia: ['Seville'],
        }
    },
    asia: {
        India: {
            Maharashtra: ['Mumbai', 'Pune'],
            Karnataka: ['Bengaluru'],
            Delhi: ['New Delhi'],
            TamilNadu: ['Chennai'],
            Telangana: ['Hyderabad']
        },
        Japan: {
            Tokyo: ['Tokyo'],
            Osaka: ['Osaka'],
            Kanagawa: ['Yokohama']
        },
        Singapore: {
            Central: ['Singapore']
        },
        SouthKorea: {
            Seoul: ['Seoul'],
            Busan: ['Busan']
        },
        UAE: {
            Dubai: ['Dubai'],
            AbuDhabi: ['Abu Dhabi']
        }
    },
    oceania: {
        Australia: {
            NSW: ['Sydney'],
            Victoria: ['Melbourne'],
            Queensland: ['Brisbane']
        },
        NewZealand: {
            Auckland: ['Auckland'],
            Wellington: ['Wellington'],
            Canterbury: ['Christchurch']
        }
    },
    south_america: {
        Brazil: {
            SaoPaulo: ['Sao Paulo'],
            RioDeJaneiro: ['Rio de Janeiro'],
            DistritoFederal: ['Brasilia']
        },
        Argentina: {
            BuenosAires: ['Buenos Aires'],
            Cordoba: ['Cordoba']
        },
        Chile: {
            Santiago: ['Santiago']
        },
        Colombia: {
            Bogota: ['Bogota'],
            Antioquia: ['Medellin']
        }
    },
    africa: {
        SouthAfrica: {
            Gauteng: ['Johannesburg', 'Pretoria'],
            WesternCape: ['Cape Town']
        },
        Nigeria: {
            Lagos: ['Lagos'],
            FCT: ['Abuja']
        },
        Kenya: {
            Nairobi: ['Nairobi']
        },
        Egypt: {
            Cairo: ['Cairo'],
            Alexandria: ['Alexandria']
        }
    }
};

const TEMPLATES = {
    HOSPITALS: [
        { name: 'Renal Institute', summary: 'Comprehensive nephrology, transplant, and dialysis services.', services: ['Nephrology', 'Transplant', 'Dialysis'], labels: ['REGIONAL'], cost: 'INSURANCE' },
        { name: 'University Kidney Center', summary: 'Academic kidney center with genetics and chronic kidney disease programs.', services: ['Academic Care', 'PKD', 'Clinical Trials'], labels: ['ACADEMIC'], cost: 'INSURANCE' },
        { name: 'Dialysis & Renal Hospital', summary: 'Dialysis-focused access point with chronic kidney disease support.', services: ['Dialysis', 'Education', 'Nephrology'], labels: ['ACCESS'], cost: 'MIXED' },
    ],
    SUPPORT_GROUP: [
        { name: 'Kidney Support Network', summary: 'Peer support, patient navigation, and caregiver education.', services: ['Support Groups', 'Caregiver Support', 'Education'], labels: ['FREE'], cost: 'FREE' },
        { name: 'PKD Community Hub', summary: 'PKD-focused community chapter with local events and practical support.', services: ['PKD', 'Events', 'Peer Support'], labels: ['PKD FOCUS'], cost: 'FREE' },
    ],
    ADVOCACY: [
        { name: 'Kidney Advocacy Alliance', summary: 'Advocacy for access, screening, research funding, and patient policy reform.', services: ['Advocacy', 'Policy', 'Awareness'], labels: ['POLICY'], cost: 'FREE' },
        { name: 'Renal Rights Coalition', summary: 'Patient rights and legislative outreach for kidney care access.', services: ['Legal Guidance', 'Policy', 'Navigation'], labels: ['LEGISLATIVE'], cost: 'FREE' },
    ]
};

export async function GET(req: Request) {
    try {
        if (!hasSeedAccess(req, 'SEED_SECRET')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const packName = (searchParams.get('regionPack') || 'north_america').toLowerCase();
        const jobKey = (searchParams.get('jobKey') || `resources:${packName}`).trim();
        const reset = (searchParams.get('reset') || '0') === '1';
        let offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
        const limit = Math.min(500, Math.max(25, parseInt(searchParams.get('limit') || '200', 10)));
        const templatesPerCity = Math.min(12, Math.max(3, parseInt(searchParams.get('templatesPerCity') || '7', 10)));

        const pack = GEO_PACKS[packName];
        if (!pack) {
            return NextResponse.json({ error: 'Unknown regionPack' }, { status: 400 });
        }

        const previous = !reset ? await getImportJob(jobKey) : null;
        if (!searchParams.has('offset') && previous?.cursor?.nextOffset != null) {
            offset = Math.max(0, Number(previous.cursor.nextOffset) || 0);
        }

        if (reset && offset === 0) {
            await (db as any).resourceEntry.deleteMany({
                where: {
                    website: { contains: 'pkdcompass.local' }
                }
            });
        }

        const categoryMap: Record<string, string> = {};
        for (const category of CATEGORIES) {
            const upserted = await (db as any).resourceCategory.upsert({
                where: { name: category.name },
                update: { label: category.label },
                create: category
            });
            categoryMap[category.name] = upserted.id;
        }

        const generated = generateResources(packName, pack, templatesPerCity);
        const batch = generated.slice(offset, offset + limit);

        await setImportJob(jobKey, {
            kind: 'RESOURCES_BULK',
            status: 'RUNNING',
            cursor: { offset, limit, nextOffset: offset },
            metrics: { total: generated.length, processed: 0, created: 0, updated: 0 },
            message: `Starting resources import for ${packName}.`
        });

        let created = 0;
        let updated = 0;
        for (const row of batch) {
            const categoryId = categoryMap[row.category];
            const existing = await (db as any).resourceEntry.findFirst({
                where: {
                    name: row.name,
                    city: row.city,
                    state: row.state,
                    country: row.country,
                    categoryId
                },
                select: { id: true }
            });

            const data = {
                categoryId,
                name: row.name,
                summary: row.summary,
                city: row.city,
                state: row.state,
                country: row.country,
                continent: row.continent,
                website: row.website,
                phone: row.phone,
                services: JSON.stringify(row.services),
                labels: JSON.stringify(row.labels),
                cost: row.cost,
                isVirtual: false,
                isInPerson: true
            };

            if (existing?.id) {
                await (db as any).resourceEntry.update({
                    where: { id: existing.id },
                    data
                });
                updated += 1;
            } else {
                await (db as any).resourceEntry.create({ data });
                created += 1;
            }
        }

        const nextOffset = offset + limit < generated.length ? offset + limit : null;

        await setImportJob(jobKey, {
            kind: 'RESOURCES_BULK',
            status: nextOffset == null ? 'COMPLETED' : 'RUNNING',
            cursor: { offset, limit, nextOffset },
            metrics: { total: generated.length, processed: batch.length, created, updated },
            message: nextOffset == null ? 'Resources import complete.' : 'Resources import batch complete.'
        });

        return NextResponse.json({
            ok: true,
            jobKey,
            regionPack: packName,
            offset,
            limit,
            nextOffset,
            total: generated.length,
            created,
            updated,
            sample: batch.slice(0, 20).map((item) => item.name)
        });
    } catch (error) {
        console.error('Bulk resource seed error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function generateResources(
    packName: string,
    pack: Record<string, Record<string, string[]>>,
    templatesPerCity: number
) {
    const continent = humanizePack(packName);
    const results: Array<{
        category: string;
        continent: string;
        country: string;
        state: string;
        city: string;
        name: string;
        summary: string;
        website: string;
        phone: string;
        services: string[];
        labels: string[];
        cost: string;
    }> = [];

    for (const [country, states] of Object.entries(pack)) {
        for (const [state, cities] of Object.entries(states)) {
            for (const city of cities) {
                const templates = [
                    ...TEMPLATES.HOSPITALS.map((template) => ({ ...template, category: 'HOSPITALS' })),
                    ...TEMPLATES.SUPPORT_GROUP.map((template) => ({ ...template, category: 'SUPPORT_GROUP' })),
                    ...TEMPLATES.ADVOCACY.map((template) => ({ ...template, category: 'ADVOCACY' })),
                ].slice(0, templatesPerCity);

                templates.forEach((template, index) => {
                    const slug = [country, state, city, template.name, index + 1]
                        .join('-')
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '');

                    results.push({
                        category: template.category,
                        continent,
                        country,
                        state,
                        city,
                        name: `${city} ${template.name}`,
                        summary: `${template.summary} Localized for ${city}, ${country}.`,
                        website: `https://${slug}.pkdcompass.local`,
                        phone: `+1-555-${String((index + 1) * 173).padStart(4, '0')}`,
                        services: template.services,
                        labels: [country, city, ...template.labels],
                        cost: template.cost
                    });
                });
            }
        }
    }

    return results;
}

function humanizePack(value: string) {
    return value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
