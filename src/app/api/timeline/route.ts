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

        const [appts, labs, imaging, bp, wellness] = await Promise.all([
            db.appointment.findMany({ where: { userId }, orderBy: { startAt: 'desc' }, take: 20 }),
            db.observation.findMany({ where: { userId }, orderBy: { timestamp: 'desc' }, take: 20 }),
            db.imagingEvent.findMany({ where: { userId }, include: { metrics: true }, orderBy: { date: 'desc' }, take: 10 }),
            db.bloodPressureLog.findMany({ where: { userId }, orderBy: { timestamp: 'desc' }, take: 20 }),
            db.wellnessLog.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 20 })
        ]);

        const timeline: any[] = [
            ...appts.map(a => ({ type: 'APPOINTMENT', date: a.startAt, data: a })),
            ...labs.map(l => ({ type: 'LAB', date: l.timestamp, data: l })),
            ...imaging.map(i => ({ type: 'IMAGING', date: i.date, data: i })),
            ...bp.map(b => ({ type: 'BP', date: b.timestamp, data: b })),
            ...wellness.map(w => ({ type: 'WELLNESS', date: w.date, data: w }))
        ];

        timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json(timeline);
    } catch (error) {
        console.error('Timeline error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
