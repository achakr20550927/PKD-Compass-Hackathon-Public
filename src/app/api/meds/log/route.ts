export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const body = await req.json();
        const { medId, status, note, scheduledAt } = body;

        // Verify medication belongs to user
        const med = await db.medication.findUnique({
            where: { id: medId, userId }
        });

        if (!med) {
            return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
        }

        const log = await db.medLog.create({
            data: {
                medId,
                scheduledAt: new Date(scheduledAt || new Date()),
                takenAt: status === 'TAKEN' ? new Date() : null,
                status,
                note
            }
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error('Error logging med:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
