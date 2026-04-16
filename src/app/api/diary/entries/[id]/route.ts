export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const { id: entryId } = await context.params;
        const body = await req.json();
        const { quantity, unit, checked, nutrientsSnapshot } = body;

        // Verify ownership indirectly via day
        const entry = await db.diaryEntry.findUnique({
            where: { id: entryId },
            include: { day: true }
        });

        if (!entry || entry.day.userId !== userId) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        const updatedEntry = await db.diaryEntry.update({
            where: { id: entryId },
            data: {
                quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
                unit: unit || undefined,
                checked: checked !== undefined ? checked : undefined,
                nutrientsSnapshot: nutrientsSnapshot ? JSON.stringify(nutrientsSnapshot) : undefined
            }
        });

        return NextResponse.json(updatedEntry);
    } catch (error) {
        console.error('Update entry error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const { id: entryId } = await context.params;
        const entry = await db.diaryEntry.findUnique({
            where: { id: entryId },
            include: { day: true }
        });

        if (!entry || entry.day.userId !== userId) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        await db.diaryEntry.delete({
            where: { id: entryId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete entry error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
