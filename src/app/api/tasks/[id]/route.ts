export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;
        const { id } = await context.params;

        const body = await req.json();
        const {
            title,
            dueAt,
            status,
            linkedObjectType,
            linkedObjectId,
            appointmentId
        } = body;

        const existing = await db.task.findUnique({
            where: { id, userId }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const updated = await db.task.update({
            where: { id },
            data: {
                title,
                dueAt: dueAt ? new Date(dueAt) : undefined,
                status,
                linkedObjectType,
                linkedObjectId,
                appointmentId
            },
            include: {
                appointment: true
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update task error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;
        const { id } = await context.params;

        const existing = await db.task.findUnique({
            where: { id, userId }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        await db.task.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete task error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
