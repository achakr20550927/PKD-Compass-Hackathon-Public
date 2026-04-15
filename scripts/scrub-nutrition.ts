import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Starting Global Nutrition Data Scrub...');

    // 1. Fix Salt (Sodium King) - 1 tsp is ~6g
    await prisma.ingredient.updateMany({
        where: { name: { contains: 'Salt' } },
        data: {
            servingSizes: JSON.stringify([
                { name: 'tsp', weightG: 6 },
                { name: 'tbsp', weightG: 18 },
                { name: 'gram', weightG: 1 },
                { name: '100g', weightG: 100 }
            ])
        }
    });

    // 2. Fix Soy Sauce - 1 tbsp is ~16g
    await prisma.ingredient.updateMany({
        where: { name: { contains: 'Soy sauce' } },
        data: {
            servingSizes: JSON.stringify([
                { name: 'tbsp', weightG: 16 },
                { name: 'tsp', weightG: 5.3 },
                { name: 'cup', weightG: 250 },
                { name: '100g', weightG: 100 }
            ])
        }
    });

    // 3. Fix Oils - 1 tbsp is ~14g
    await prisma.ingredient.updateMany({
        where: { name: { contains: 'oil' } },
        data: {
            servingSizes: JSON.stringify([
                { name: 'tbsp', weightG: 14 },
                { name: 'tsp', weightG: 4.7 },
                { name: 'cup', weightG: 216 },
                { name: '100g', weightG: 100 }
            ])
        }
    });

    // 4. Fix Rice (Cooked)
    await prisma.ingredient.updateMany({
        where: { name: { contains: 'Rice' }, NOT: { name: { contains: 'Dry' } } },
        data: {
            servingSizes: JSON.stringify([
                { name: 'cup', weightG: 195 },
                { name: '100g', weightG: 100 }
            ])
        }
    });

    // 5. Fix Garlic
    await prisma.ingredient.updateMany({
        where: { name: { contains: 'Garlic' } },
        data: {
            servingSizes: JSON.stringify([
                { name: 'clove', weightG: 4 },
                { name: 'tsp', weightG: 3 },
                { name: 'tbsp', weightG: 9 },
                { name: '100g', weightG: 100 }
            ])
        }
    });

    // 6. Fix Any other generic "1 serving" = 85g defaults
    // This removes the fake 85g default which caused massive sodium spikes for small items
    const infected = await prisma.ingredient.findMany({
        where: { servingSizes: { contains: '"weightG":85' } }
    });

    console.log(`Resetting ${infected.length} items with the 85g default error to 100g standard.`);
    for (const item of infected) {
        await prisma.ingredient.update({
            where: { id: item.id },
            data: {
                servingSizes: JSON.stringify([{ name: '100g', weightG: 100 }])
            }
        });
    }

    console.log('Database Scrub Complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
