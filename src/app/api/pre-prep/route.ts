export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateTrendSlope } from '@/lib/interpretation';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const apptId = searchParams.get('apptId');

        if (!apptId) return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });

        const appt = await db.appointment.findUnique({
            where: { id: apptId },
            include: { user: true }
        });

        if (!appt || appt.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Generate automated questions based on recent trends
        const labs = await db.observation.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: 10
        });

        const autoQuestions = [];

        // Check eGFR trend
        const egfrHistory = labs.filter(l => l.type === 'EGFR').map(l => ({ value: l.value, timestamp: new Date(l.timestamp) }));
        const egfrSlope = calculateTrendSlope(egfrHistory);
        if (egfrSlope !== null && egfrSlope <= -3) {
            autoQuestions.push({
                type: 'AUTO',
                text: `My eGFR is declining by ${Math.abs(egfrSlope).toFixed(1)} mL/min/year. Should we adjust my medications or diet?`,
                reason: 'Reflects a significant downward trend in kidney function.'
            });
        }

        // Check BP trend
        const bpHistory = await db.bloodPressureLog.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: 14
        });
        const highBpCount = bpHistory.filter(b => b.systolic > 140 || b.diastolic > 90).length;
        if (highBpCount >= 5) {
            autoQuestions.push({
                type: 'AUTO',
                text: `I've noticed my blood pressure is frequently above 140/90 (${highBpCount} out of last 14 logs). Is my current BP regimen sufficient?`,
                reason: 'Reflects consistent readings above target levels.'
            });
        }

        return NextResponse.json({
            appointment: appt,
            autoQuestions,
            savedQuestions: [] // Placeholder for user-added questions
        });
    } catch (error) {
        console.error('Pre-prep error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
