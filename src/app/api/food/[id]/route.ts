export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: foodId } = await context.params;
        const food = await db.foodItem.findUnique({
            where: { id: foodId }
        });

        if (!food) {
            return NextResponse.json({ error: 'Food not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...food,
            nutrients: JSON.parse(food.nutrients),
            servingSizes: JSON.parse(food.servingSizes)
        });
    } catch (error) {
        console.error('Fetch food error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
