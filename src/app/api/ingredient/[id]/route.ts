export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: ingredientId } = await context.params;
        const ingredient = await db.ingredient.findUnique({
            where: { id: ingredientId }
        });

        if (!ingredient) {
            return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...ingredient,
            nutrients: JSON.parse(ingredient.nutrients),
            servingSizes: JSON.parse(ingredient.servingSizes)
        });
    } catch (error) {
        console.error('Fetch ingredient error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
