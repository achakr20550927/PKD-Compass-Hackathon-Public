export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id as string;

        const { id } = await context.params;

        // Ensure the observation (lab) belongs to the current user
        const lab = await db.observation.findUnique({
            where: { id, userId }
        });

        if (!lab) {
            return NextResponse.json({ error: 'Lab result not found or unauthorized' }, { status: 404 });
        }

        await db.observation.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete lab error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
