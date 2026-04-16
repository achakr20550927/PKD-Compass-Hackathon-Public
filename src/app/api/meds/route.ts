export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '../../../lib/db';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const body = await req.json();
        const { name, dosage, frequency, isTolvaptan, startDate } = body;

        const med = await db.medication.create({
            data: {
                userId,
                name,
                dosage,
                frequency,
                isTolvaptan: !!isTolvaptan,
                startDate: new Date(startDate || new Date())
            }
        });

        return NextResponse.json(med);
    } catch (error) {
        console.error('Error creating med:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
