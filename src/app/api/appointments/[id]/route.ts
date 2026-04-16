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
            type,
            startAt,
            endAt,
            providerName,
            locationText,
            notes,
            status,
            reminders
        } = body;

        // Verify ownership
        const existing = await db.appointment.findUnique({
            where: { id, userId }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        const updated = await db.appointment.update({
            where: { id },
            data: {
                title,
                type,
                startAt: startAt ? new Date(startAt) : undefined,
                endAt: endAt ? new Date(endAt) : undefined,
                providerName,
                locationText,
                notes,
                status,
                reminders: reminders ? {
                    deleteMany: {},
                    create: reminders.map((r: any) => ({
                        remindAt: new Date(r.remindAt),
                        channel: r.channel || 'PUSH'
                    }))
                } : undefined
            },
            include: {
                reminders: true
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update appointment error:', error);
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

        const existing = await db.appointment.findUnique({
            where: { id, userId }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        await db.appointment.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete appointment error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
