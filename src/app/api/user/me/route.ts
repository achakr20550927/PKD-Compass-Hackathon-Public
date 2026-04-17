export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const session = await getServerSession(authOptions as any) as any
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id as string;

        const user = await db.user.findUnique({
            where: { id: userId },
            include: { profile: true }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json(user);
    } catch (error) {
        console.error('Fetch me error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

