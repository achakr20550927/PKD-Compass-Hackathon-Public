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
        const { type, severity, details } = body;

        if (!type || severity === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const log = await db.symptomLog.create({
            data: {
                userId,
                type,
                severity: Number(severity),
                details,
                timestamp: new Date()
            }
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error('Error creating symptom log:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (id) {
            // Fetch a single symptom log
            const log = await db.symptomLog.findFirst({
                where: { id, userId }
            });
            if (!log) {
                return NextResponse.json({ error: 'Log not found' }, { status: 404 });
            }
            return NextResponse.json(log);
        }

        // Fetch all symptom logs
        const logs = await db.symptomLog.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: 50
        });

        return NextResponse.json(logs);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Log ID required' }, { status: 400 });
        }

        // Verify ownership
        const existingLog = await db.symptomLog.findFirst({
            where: { id, userId }
        });

        if (!existingLog) {
            return NextResponse.json({ error: 'Log not found' }, { status: 404 });
        }

        const body = await req.json();
        const { type, severity, details } = body;

        const log = await db.symptomLog.update({
            where: { id },
            data: {
                type,
                severity: Number(severity),
                details
            }
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error('Error updating symptom log:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Log ID required' }, { status: 400 });
        }

        // Verify ownership
        const existingLog = await db.symptomLog.findFirst({
            where: { id, userId }
        });

        if (!existingLog) {
            return NextResponse.json({ error: 'Log not found' }, { status: 404 });
        }

        await db.symptomLog.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting symptom log:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
