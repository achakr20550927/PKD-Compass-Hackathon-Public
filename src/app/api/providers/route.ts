export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getAnyUserId } from '@/lib/auth-unified';
import { db } from '@/lib/db';
import { haversineDistanceMiles } from '@/lib/geo';

export async function GET(req: Request) {
    try {
        const userId = await getAnyUserId(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
        const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;
        const radius = searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : 25;
        const specialty = searchParams.get('specialty'); // "NEPHROLOGIST" | "DIALYSIS_CENTER" | "TRANSPLANT"

        const where: any = {};
        if (specialty) where.specialty = specialty;

        const providers = await (db as any).providerDirectory.findMany({
            where,
            orderBy: { name: 'asc' },
        });

        if (lat === null || lng === null) {
            return NextResponse.json({ providers });
        }

        // Filter by radius and add distance
        const results = providers
            .filter((p: any) => {
                if (p.lat === null || p.lng === null) return false;
                return haversineDistanceMiles(lat, lng, p.lat, p.lng) <= radius;
            })
            .map((p: any) => ({
                ...p,
                distanceMiles: p.lat && p.lng
                    ? Math.round(haversineDistanceMiles(lat, lng, p.lat, p.lng) * 10) / 10
                    : null,
            }))
            .sort((a: any, b: any) => (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999));

        return NextResponse.json({ providers: results });
    } catch (error) {
        console.error('Providers API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
