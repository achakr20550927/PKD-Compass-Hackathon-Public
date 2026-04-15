const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    // Check the last 10 ingredients for valid JSON
    const ings = await prisma.ingredient.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
    let badCount = 0;
    for (const ing of ings) {
        try {
            JSON.parse(ing.nutrients);
        } catch (e) {
            console.log(`BAD nutrients JSON on: ${ing.name} -> ${ing.nutrients.substring(0, 50)}`);
            badCount++;
        }
        try {
            JSON.parse(ing.servingSizes);
        } catch (e) {
            console.log(`BAD servingSizes JSON on: ${ing.name} -> ${ing.servingSizes.substring(0, 50)}`);
            badCount++;
        }
    }
    if (badCount === 0) console.log('All recent ingredient JSON fields are valid!');

    // Also check recent failed case: what does search for "scallions" return?
    const scallion = await prisma.ingredient.findFirst({ where: { name: { contains: 'Scallion' } } });
    console.log('Scallion entry:', scallion ? { id: scallion.id, name: scallion.name, nutrients: scallion.nutrients.substring(0, 30), servingSizes: scallion.servingSizes.substring(0, 30) } : 'NOT FOUND');

    await prisma.$disconnect();
}
check();
