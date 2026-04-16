export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const checkedEntries = await db.diaryEntry.findMany({
            where: {
                day: { userId },
                checked: true
            },
            include: {
                day: true,
                foodItem: true,
                recipe: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(checkedEntries);
    } catch (error) {
        console.error('Fetch checked foods error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
