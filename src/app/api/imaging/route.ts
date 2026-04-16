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

        const imagingEvents = await db.imagingEvent.findMany({
            where: { userId },
            include: {
                metrics: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        return NextResponse.json(imagingEvents);
    } catch (error) {
        console.error('Get imaging events error:', error);
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
            type,
            date,
            facility,
            notes,
            metrics // Array of { metricName, value, unit }
        } = body;

        if (!type || !date) {
            return NextResponse.json({ error: 'Type and date are required' }, { status: 400 });
        }

        const imagingEvent = await db.imagingEvent.create({
            data: {
                userId,
                type,
                date: new Date(date),
                facility,
                notes,
                metrics: {
                    create: metrics ? metrics.map((m: any) => ({
                        metricName: m.metricName,
                        value: parseFloat(m.value),
                        unit: m.unit
                    })) : []
                }
            },
            include: {
                metrics: true
            }
        });

        return NextResponse.json(imagingEvent);
    } catch (error) {
        console.error('Create imaging event error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
