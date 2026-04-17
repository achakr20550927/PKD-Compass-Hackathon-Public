export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAnyUserId } from '@/lib/auth-unified';
import { db } from '@/lib/db';
import { getWorldLocationOptions } from '@/lib/world-directory';

export async function GET(req: Request) {
    try {
        const userId = await getAnyUserId(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const continent = searchParams.get('continent');
        const country = searchParams.get('country');
        const state = searchParams.get('state');
        const city = searchParams.get('city');
        const search = searchParams.get('search');

        const world = await getWorldLocationOptions({ continent, country, state, city, search });
        const dbRows = await (db as any).resourceEntry.findMany({
            where: {
                ...(continent && continent !== 'ALL' ? { continent } : {}),
                ...(country && country !== 'ALL' ? { country } : {}),
                ...(state && state !== 'ALL' ? { state } : {}),
                ...(city && city !== 'ALL' ? { city } : {}),
                ...(search ? {
                    OR: [
                        { city: { contains: search } },
                        { state: { contains: search } },
                        { country: { contains: search } },
                        { name: { contains: search } },
                    ]
                } : {})
            },
            select: {
                continent: true,
                country: true,
                state: true,
                city: true,
            },
            take: 20000,
        });

        const countries = new Set(world.countries);
        const states = new Set(world.states);
        const cities = new Set(world.cities);
        const regions = new Set(world.regions);

        for (const row of dbRows) {
            if (row.continent) regions.add(row.continent);
            if (row.country) countries.add(row.country);
            if (row.state) states.add(row.state);
            if (row.city) cities.add(row.city);
        }

        return NextResponse.json({
            regions: Array.from(regions).sort((a, b) => a.localeCompare(b)),
            countries: Array.from(countries).sort((a, b) => a.localeCompare(b)),
            states: Array.from(states).sort((a, b) => a.localeCompare(b)),
            cities: Array.from(cities).sort((a, b) => a.localeCompare(b)).slice(0, 20000),
        });
    } catch (error) {
        console.error('Resources locations API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
