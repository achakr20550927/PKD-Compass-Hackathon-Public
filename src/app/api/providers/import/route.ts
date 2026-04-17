export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hasSeedAccess } from '@/lib/seed-auth';

/**
 * Admin-only CSV import for provider directory.
 * Expects JSON body: { providers: [...] }
 * In production, protect with admin role check.
 */
export async function POST(req: Request) {
    try {
        if (!hasSeedAccess(req, "ADMIN_SEED_KEY")) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { providers } = await req.json();
        if (!Array.isArray(providers)) {
            return NextResponse.json({ error: 'providers must be an array' }, { status: 400 });
        }

        let imported = 0;
        for (const p of providers) {
            await (db as any).providerDirectory.upsert({
                where: { id: p.id || 'new-' + Math.random() },
                update: p,
                create: {
                    name: p.name,
                    specialty: p.specialty ?? 'NEPHROLOGIST',
                    address: p.address ?? '',
                    city: p.city,
                    state: p.state,
                    country: p.country ?? 'USA',
                    phone: p.phone,
                    website: p.website,
                    lat: p.lat ? parseFloat(p.lat) : null,
                    lng: p.lng ? parseFloat(p.lng) : null,
                    source: p.source ?? 'CSV_IMPORT',
                    npiNumber: p.npiNumber,
                },
            });
            imported++;
        }

        return NextResponse.json({ success: true, imported });
    } catch (error) {
        console.error('Provider import error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
