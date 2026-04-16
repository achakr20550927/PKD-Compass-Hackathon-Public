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

        // Fetch eGFR history
        const egfrLogs = await db.observation.findMany({
            where: { userId, type: 'EGFR' },
            orderBy: { timestamp: 'asc' }
        });

        const egfrHistory = egfrLogs.map(l => ({
            value: l.value,
            timestamp: new Date(l.timestamp)
        }));

        const egfrSlope = calculateTrendSlope(egfrHistory);

        // Calculate 1-year and 3-year change if possible
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const currentEgfr = egfrHistory.length > 0 ? egfrHistory[egfrHistory.length - 1].value : null;
        const oldEgfrRecord = egfrHistory.find(h => h.timestamp >= oneYearAgo);
        const egfrDelta1y = (currentEgfr !== null && oldEgfrRecord) ? currentEgfr - oldEgfrRecord.value : null;

        // Fetch BP history
        const bpLogs = await db.bloodPressureLog.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: 30
        });

        const avgSystolic = bpLogs.length > 0
            ? bpLogs.reduce((acc, log) => acc + log.systolic, 0) / bpLogs.length
            : null;
        const avgDiastolic = bpLogs.length > 0
            ? bpLogs.reduce((acc, log) => acc + log.diastolic, 0) / bpLogs.length
            : null;

        return NextResponse.json({
            egfr: {
                current: currentEgfr,
                slopePerYear: egfrSlope,
                delta1y: egfrDelta1y,
                historyCount: egfrHistory.length
            },
            bp: {
                avgSystolic: avgSystolic ? Math.round(avgSystolic) : null,
                avgDiastolic: avgDiastolic ? Math.round(avgDiastolic) : null,
                readingCount: bpLogs.length
            },
            summary: {
                status: (egfrSlope !== null && egfrSlope <= -5) ? 'RAPID_DECLINE' : 'STABLE',
                recommendation: (egfrSlope !== null && egfrSlope <= -5)
                    ? 'Your eGFR is declining more than 5 mL/min/year. This is considered rapid progression. Schedule a follow-up with your nephrologist.'
                    : 'Your kidney function appears stable based on recent trends.'
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
