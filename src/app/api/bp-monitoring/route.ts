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

        // Fetch current week's readings starting from the most recent session
        const latestSummary = await db.weeklySummary.findFirst({
            where: { userId },
            orderBy: { weekStart: 'desc' }
        });

        if (!latestSummary) return NextResponse.json({ readings: [] });

        const readings = await db.bloodPressureLog.findMany({
            where: {
                userId,
                timestamp: {
                    gte: latestSummary.weekStart,
                    lte: new Date(latestSummary.weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
                }
            },
            orderBy: { timestamp: 'asc' }
        });

        return NextResponse.json({ summary: latestSummary, readings });
    } catch (error) {
        console.error('Get BP monitoring error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const body = await req.json();
        const { action, weekStart } = body;

        if (action === 'START_WEEK') {
            const summary = await db.weeklySummary.create({
                data: {
                    userId,
                    weekStart: new Date(weekStart),
                    alertsCount: 0
                }
            });
            return NextResponse.json(summary);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Create BP monitoring error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
