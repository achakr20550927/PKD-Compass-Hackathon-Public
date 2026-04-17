export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { hash } from 'bcryptjs';
import { hasSeedAccess } from '@/lib/seed-auth';

export async function GET(req: Request) {
    try {
        if (!hasSeedAccess(req, "SEED_SECRET")) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user already exists
        const existingUser = await db.user.findUnique({
            where: { email: 'alex@example.com' }
        });

        if (existingUser) {
            return NextResponse.json({ success: true, message: "Seed data already exists" });
        }

        const user = await db.user.create({
            data: {
                id: 'demo-user-123',
                email: 'alex@example.com',
                name: 'Alex Johnson',
                gender: 'MALE',
                passwordHash: await hash('password123', 10),
                role: 'PATIENT',
                profile: {
                    create: {
                        firstName: 'Alex',
                        lastName: 'Johnson',
                        dob: new Date('1985-05-15'),
                        ckdStage: 'G3a'
                    }
                }
            } as any
        });

        // Meds
        await db.medication.create({
            data: { userId: user.id, name: 'Tolvaptan', dosage: '45/15 mg', frequency: 'BID', isTolvaptan: true, startDate: new Date() }
        });
        await db.medication.create({
            data: { userId: user.id, name: 'Lisinopril', dosage: '10 mg', frequency: 'DAILY', startDate: new Date() }
        });

        // eGFR Data (Trend)
        const dates = Array.from({ length: 6 }).map((_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return d;
        }).reverse();

        const egfrValues = [62, 60, 58, 59, 56, 54]; // Dropping trend

        for (let i = 0; i < dates.length; i++) {
            await db.observation.create({
                data: {
                    userId: user.id,
                    type: 'EGFR',
                    value: egfrValues[i],
                    unit: 'mL/min/1.73m²',
                    timestamp: dates[i],
                    source: 'LAB_IMPORT'
                }
            });
        }

        // Recent uACR
        await db.observation.create({
            data: {
                userId: user.id,
                type: 'UACR',
                value: 45,
                unit: 'mg/g',
                timestamp: new Date(),
                source: 'MANUAL',
                referenceRangeHigh: 30
            }
        });

        return NextResponse.json({ success: true, message: "Seed data created" });
    } catch (e: unknown) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
