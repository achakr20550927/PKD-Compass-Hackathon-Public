export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const session = await getServerSession(authOptions as any) as any
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id as string;

        // Fetch active meds for the user
        const meds = await db.medication.findMany({
            where: { userId, isActive: true }
        });

        // Simple mock for "upcoming" logic - in real app, check MedLog
        const upcoming = meds.map(m => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            time: m.frequency === 'DAILY' ? 'Today, 8:00 AM' : 'Scheduled'
        }));

        return NextResponse.json(upcoming);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

