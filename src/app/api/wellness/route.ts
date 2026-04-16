export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const wellnessLogs = await db.wellnessLog.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            take: 30
        });

        return NextResponse.json(wellnessLogs);
    } catch (error) {
        console.error('Get wellness logs error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const body = await req.json();
        const {
            date,
            mood,
            energy,
            stress,
            sleepHours,
            notes
        } = body;

        const logDate = date ? new Date(date) : new Date();
        logDate.setHours(0, 0, 0, 0);

        const wellnessLog = await db.wellnessLog.upsert({
            where: {
                userId_date: {
                    userId,
                    date: logDate
                }
            },
            update: {
                mood,
                energy: energy ? parseInt(energy) : undefined,
                stress: stress ? parseInt(stress) : undefined,
                sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
                notes
            },
            create: {
                userId,
                date: logDate,
                mood,
                energy: energy ? parseInt(energy) : undefined,
                stress: stress ? parseInt(stress) : undefined,
                sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
                notes
            }
        });

        return NextResponse.json(wellnessLog);
    } catch (error) {
        console.error('Create wellness log error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
