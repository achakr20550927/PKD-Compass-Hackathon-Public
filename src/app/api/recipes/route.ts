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

        const recipes = await db.recipe.findMany({
            where: { userId },
            include: {
                ingredients: {
                    include: {
                        ingredient: true
                    }
                }
            }
        });

        return NextResponse.json(recipes);
    } catch (error) {
        console.error('Fetch recipes error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const body = await req.json();
        const { title, servings, ingredients, instructions } = body;

        if (!title?.trim()) {
            return NextResponse.json({ error: 'Recipe title is required.' }, { status: 400 });
        }

        // Filter out any rows lacking a valid ingredientId
        const validIngredients = (ingredients || []).filter((ing: any) =>
            ing.ingredientId && typeof ing.ingredientId === 'string' && ing.ingredientId.length > 0
        );

        if (validIngredients.length === 0) {
            return NextResponse.json({ error: 'At least one matched ingredient is required.' }, { status: 400 });
        }

        const recipe = await db.recipe.create({
            data: {
                userId,
                title: title.trim(),
                servings: parseFloat(servings) || 1,
                instructions,
                ingredients: {
                    create: validIngredients.map((ing: any) => ({
                        ingredientId: ing.ingredientId,
                        quantity: parseFloat(ing.quantity) || 1,
                        unit: ing.unit || 'serving',
                        gramsEquivalent: parseFloat(ing.gramsEquivalent) || 100,
                        displayNameOverride: ing.displayNameOverride || null
                    }))
                }
            },
            include: {
                ingredients: true
            }
        });

        return NextResponse.json(recipe);
    } catch (error: any) {
        console.error('Recipe create error:', error?.message ?? error);
        return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
    }
}
