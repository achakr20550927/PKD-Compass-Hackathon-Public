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

        const savedMeals = await db.savedMeal.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        foodItem: true,
                        recipe: true
                    }
                }
            }
        });

        return NextResponse.json(savedMeals);
    } catch (error) {
        console.error('Fetch saved meals error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const body = await req.json();
        const { title, items } = body;

        const savedMeal = await db.savedMeal.create({
            data: {
                userId,
                title,
                items: {
                    create: items.map((item: any) => ({
                        itemType: item.itemType,
                        foodItemId: item.itemType === 'FOOD' ? item.itemId : null,
                        recipeId: item.itemType === 'RECIPE' ? item.itemId : null,
                        quantity: parseFloat(item.quantity),
                        unit: item.unit
                    }))
                }
            },
            include: {
                items: true
            }
        });

        return NextResponse.json(savedMeal);
    } catch (error) {
        console.error('Create saved meal error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
