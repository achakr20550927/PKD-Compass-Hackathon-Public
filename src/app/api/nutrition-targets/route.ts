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

        const target = await db.nutritionTarget.findUnique({
            where: { userId }
        });

        if (!target) {
            // Return defaults if not set
            return NextResponse.json({
                userId,
                sodiumMg: 2300,
                potassiumMg: 3500,
                phosphorusMg: 1000,
                proteinG: 60,
                fluidMl: 2500,
                isDefault: true
            });
        }

        return NextResponse.json(target);
    } catch (error) {
        console.error('Fetch targets error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const body = await req.json();
        const { sodiumMg, potassiumMg, phosphorusMg, proteinG, fluidMl } = body;

        const target = await db.nutritionTarget.upsert({
            where: { userId },
            update: {
                sodiumMg: parseFloat(sodiumMg),
                potassiumMg: parseFloat(potassiumMg),
                phosphorusMg: parseFloat(phosphorusMg),
                proteinG: parseFloat(proteinG),
                fluidMl: parseFloat(fluidMl)
            },
            create: {
                userId,
                sodiumMg: parseFloat(sodiumMg),
                potassiumMg: parseFloat(potassiumMg),
                phosphorusMg: parseFloat(phosphorusMg),
                proteinG: parseFloat(proteinG),
                fluidMl: parseFloat(fluidMl)
            }
        });

        return NextResponse.json(target);
    } catch (error) {
        console.error('Update targets error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
