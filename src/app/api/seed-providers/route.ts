export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hasSeedAccess } from '@/lib/seed-auth';

const PROVIDERS = [
    // ── US Nephrologists ──
    {
        name: 'Dr. Sarah Chen, MD – Nephrology',
        specialty: 'NEPHROLOGIST',
        address: '2301 Holmes St, Kansas City, MO 64108',
        city: 'Kansas City', state: 'MO', country: 'USA',
        phone: '(816) 404-1000',
        lat: 39.0855, lng: -94.5784,
        source: 'SEED',
    },
    {
        name: 'University of Kansas Health System – Nephrology',
        specialty: 'NEPHROLOGIST',
        address: '4000 Cambridge St, Kansas City, KS 66160',
        city: 'Kansas City', state: 'KS', country: 'USA',
        phone: '(913) 588-1227',
        website: 'https://www.kansashealthsystem.com',
        lat: 39.0558, lng: -94.6078,
        source: 'SEED',
    },
    {
        name: 'Mayo Clinic – Division of Nephrology',
        specialty: 'NEPHROLOGIST',
        address: '200 First St SW, Rochester, MN 55905',
        city: 'Rochester', state: 'MN', country: 'USA',
        phone: '(507) 284-2511',
        website: 'https://www.mayoclinic.org',
        lat: 44.0224, lng: -92.4695,
        source: 'SEED',
    },
    {
        name: 'Cleveland Clinic – Nephrology & Hypertension',
        specialty: 'NEPHROLOGIST',
        address: '9500 Euclid Ave, Cleveland, OH 44195',
        city: 'Cleveland', state: 'OH', country: 'USA',
        phone: '(216) 444-2200',
        website: 'https://my.clevelandclinic.org',
        lat: 41.5020, lng: -81.6209,
        source: 'SEED',
    },
    {
        name: 'Johns Hopkins – Nephrology Division',
        specialty: 'NEPHROLOGIST',
        address: '1800 Orleans St, Baltimore, MD 21287',
        city: 'Baltimore', state: 'MD', country: 'USA',
        phone: '(410) 955-6100',
        website: 'https://www.hopkinsmedicine.org',
        lat: 39.2971, lng: -76.5930,
        source: 'SEED',
    },
    // ── US Dialysis Centers ──
    {
        name: 'DaVita Kidney Care – Kansas City',
        specialty: 'DIALYSIS_CENTER',
        address: '2700 E 18th St, Kansas City, MO 64127',
        city: 'Kansas City', state: 'MO', country: 'USA',
        phone: '(816) 245-3800',
        website: 'https://www.davita.com',
        lat: 39.0908, lng: -94.5448,
        source: 'SEED',
    },
    {
        name: 'Fresenius Kidney Care – New York Midtown',
        specialty: 'DIALYSIS_CENTER',
        address: '126 W 60th St, New York, NY 10023',
        city: 'New York', state: 'NY', country: 'USA',
        phone: '(212) 265-0505',
        website: 'https://www.freseniuskidneycare.com',
        lat: 40.7695, lng: -73.9811,
        source: 'SEED',
    },
    {
        name: 'US Renal Care – Los Angeles',
        specialty: 'DIALYSIS_CENTER',
        address: '1127 Wilshire Blvd, Los Angeles, CA 90017',
        city: 'Los Angeles', state: 'CA', country: 'USA',
        phone: '(213) 488-1234',
        website: 'https://www.usrenalcare.com',
        lat: 34.0532, lng: -118.2637,
        source: 'SEED',
    },
    // ── International ──
    {
        name: 'Hammersmith Hospital – Renal Unit',
        specialty: 'NEPHROLOGIST',
        address: 'Du Cane Rd, London W12 0HS',
        city: 'London', state: null, country: 'UK',
        phone: '+44 20 3313 1000',
        website: 'https://www.imperial.nhs.uk',
        lat: 51.5120, lng: -0.2349,
        source: 'SEED',
    },
    {
        name: 'The Royal Melbourne Hospital – Nephrology',
        specialty: 'NEPHROLOGIST',
        address: '300 Grattan St, Parkville VIC 3050',
        city: 'Melbourne', state: 'VIC', country: 'Australia',
        phone: '+61 3 9342 7000',
        website: 'https://www.thermh.org.au',
        lat: -37.7983, lng: 144.9561,
        source: 'SEED',
    },
    {
        name: 'Toronto General Hospital – Nephrology',
        specialty: 'NEPHROLOGIST',
        address: '200 Elizabeth St, Toronto, ON M5G 2C4',
        city: 'Toronto', state: 'ON', country: 'Canada',
        phone: '+1 416-340-4800',
        website: 'https://www.uhn.ca',
        lat: 43.6595, lng: -79.3884,
        source: 'SEED',
    },
    {
        name: 'Charite – Berlin Nephrology Center',
        specialty: 'NEPHROLOGIST',
        address: 'Augustenburger Platz 1, 13353 Berlin',
        city: 'Berlin', state: null, country: 'Germany',
        phone: '+49 30 450 50',
        website: 'https://www.charite.de',
        lat: 52.5431, lng: 13.3525,
        source: 'SEED',
    },
];

export async function GET(req: Request) {
    try {
        if (!hasSeedAccess(req, "SEED_SECRET")) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let count = 0;
        for (const p of PROVIDERS) {
            await (db as any).providerDirectory.create({
                data: {
                    ...p,
                    city: p.city ?? undefined,
                    state: p.state ?? undefined,
                    lat: p.lat ?? undefined,
                    lng: p.lng ?? undefined,
                    phone: p.phone ?? undefined,
                    website: (p as any).website ?? undefined,
                },
            });
            count++;
        }
        return NextResponse.json({ success: true, count });
    } catch (error: any) {
        console.error('Seed providers error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
