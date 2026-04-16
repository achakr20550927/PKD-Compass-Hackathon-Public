export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest, context: { params: Promise<{ date: string }> }) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const { date: dateParam } = await context.params;
        // Normalize date to UTC midnight to avoid timezone shifts
        const date = new Date(`${dateParam}T00:00:00Z`);
        const dayStart = date;

        // 1. Find the DiaryDay
        let day = await db.diaryDay.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: dayStart
                }
            },
            include: {
                entries: {
                    include: {
                        foodItem: true,
                        recipe: true
                    }
                }
            }
        });

        if (!day) {
            // Return empty day structure
            return NextResponse.json({
                date: dateParam,
                totals: { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0 },
                meals: {
                    BREAKFAST: { entries: [], totals: { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0 } },
                    LUNCH: { entries: [], totals: { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0 } },
                    DINNER: { entries: [], totals: { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0 } },
                    SNACKS: { entries: [], totals: { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0 } },
                    OTHER: { entries: [], totals: { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0 } }
                },
                risk: { sodium: 0, potassium: 0, phosphorus: 0, protein: 0, fluid: 0 },
                target: { sodiumMg: 2300, potassiumMg: 3500, phosphorusMg: 1000, proteinG: 60, fluidMl: 2500 }
            });
        }

        // 2. Compute Totals
        const initialTotals = { calories: 0, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0 };
        const dailyTotals = { ...initialTotals };
        const mealData: any = {
            BREAKFAST: { entries: [], totals: { ...initialTotals } },
            LUNCH: { entries: [], totals: { ...initialTotals } },
            DINNER: { entries: [], totals: { ...initialTotals } },
            SNACKS: { entries: [], totals: { ...initialTotals } },
            OTHER: { entries: [], totals: { ...initialTotals } }
        };

        day.entries.forEach(entry => {
            const nutrients = JSON.parse(entry.nutrientsSnapshot);
            const meal = entry.mealType as keyof typeof mealData;
            const qty = entry.quantity || 1;

            if (mealData[meal]) {
                mealData[meal].entries.push({
                    ...entry,
                    nutrientsSnapshot: nutrients
                });

                // Sum meal totals (multiplied by quantity)
                Object.keys(initialTotals).forEach(k => {
                    const val = (nutrients[k] || 0) * qty;
                    mealData[meal].totals[k] += val;
                    dailyTotals[k as keyof typeof dailyTotals] += val;
                });
            }
        });

        // 3. Get Targets and Generate Alerts/Risk
        const target = await db.nutritionTarget.findUnique({ where: { userId } }) || {
            sodiumMg: 2300, potassiumMg: 3500, phosphorusMg: 1000, proteinG: 60, fluidMl: 2500
        };

        // Calculate risk scores (%)
        const risk: any = {
            sodium: (dailyTotals.sodium / (target.sodiumMg || 2300)) * 100,
            potassium: (dailyTotals.potassium / (target.potassiumMg || 3500)) * 100,
            phosphorus: (dailyTotals.phosphorus / (target.phosphorusMg || 1000)) * 100,
            protein: (dailyTotals.protein / (target.proteinG || 60)) * 100,
            fluid: (dailyTotals.fluid / (target.fluidMl || 2500)) * 100
        };

        return NextResponse.json({
            id: day.id,
            date: dateParam,
            totals: dailyTotals,
            meals: mealData,
            risk,
            target
        });
    } catch (error) {
        console.error('Diary fetch error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest, context: { params: Promise<{ date: string }> }) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const body = await req.json();
        const { mealType, itemType, quantity, unit, nutrientsSnapshot } = body;
        const itemId = body.itemId || body.recipeId || body.foodItemId;

        const { date: dateParam } = await context.params;
        const date = new Date(`${dateParam}T00:00:00Z`);
        const dayStart = date;

        // 1. Get or Create Day
        let day = await db.diaryDay.upsert({
            where: {
                userId_date: {
                    userId,
                    date: dayStart
                }
            },
            update: {},
            create: {
                userId,
                date: dayStart
            }
        });

        // 2. Create Entry
        const entry = await db.diaryEntry.create({
            data: {
                dayId: day.id,
                mealType,
                itemType,
                foodItemId: itemType === 'FOOD' ? itemId : null,
                recipeId: itemType === 'RECIPE' ? itemId : null,
                quantity: parseFloat(quantity) || 1,
                unit: unit || 'serving',
                nutrientsSnapshot: JSON.stringify(nutrientsSnapshot || {}),
                checked: true
            }
        });

        return NextResponse.json(entry);
    } catch (error: any) {
        console.error('Diary entry error:', error);
        return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
    }
}
