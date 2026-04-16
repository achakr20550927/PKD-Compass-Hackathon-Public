export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { asOptionalDate, asTrimmedString } from '@/lib/request-validators';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const tasks = await db.task.findMany({
            where: { userId },
            include: {
                appointment: true
            },
            orderBy: {
                dueAt: 'asc'
            }
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error('Get tasks error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const body = await req.json();
        const title = asTrimmedString(body?.title ?? '', 180);
        const dueAt = asOptionalDate(body?.dueAt);
        const linkedObjectType = asTrimmedString(body?.linkedObjectType ?? '', 40) || null;
        const linkedObjectId = asTrimmedString(body?.linkedObjectId ?? '', 120) || null;
        const appointmentId = asTrimmedString(body?.appointmentId ?? '', 120) || null;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const task = await db.task.create({
            data: {
                userId,
                title,
                dueAt: dueAt ?? null,
                linkedObjectType,
                linkedObjectId,
                appointmentId: appointmentId || null
            },
            include: {
                appointment: true
            }
        });

        return NextResponse.json(task);
    } catch (error) {
        console.error('Create task error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const body = await req.json();
        const id = asTrimmedString(body?.id ?? '', 120);
        const status = asTrimmedString(body?.status ?? '', 20).toUpperCase();
        if (!['OPEN', 'COMPLETED', 'PENDING', 'DONE', 'MISSED', 'SKIPPED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const task = await db.task.update({
            where: { id, userId },
            data: { status }
        });

        return NextResponse.json(task);
    } catch (error) {
        console.error('Update task error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        await db.task.delete({
            where: { id, userId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete task error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
