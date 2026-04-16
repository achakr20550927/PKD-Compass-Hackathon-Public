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
        const { type, value, unit, loincCode, note } = body;

        if (!type || value === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const obs = await db.observation.create({
            data: {
                userId,
                type: type as any,
                value: Number(value),
                unit,
                loincCode,
                note,
                timestamp: new Date(),
                source: 'MANUAL'
            }
        });

        return NextResponse.json(obs);
    } catch (error) {
        console.error('Error creating lab:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        const where: any = { userId };
        if (type) where.type = type as any;

        const labs = await db.observation.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: 50
        });

        return NextResponse.json(labs);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
