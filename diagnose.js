const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const foodCount = await prisma.foodItem.count();
    const ingredientCount = await prisma.ingredient.count();
    console.log('FoodItem Count:', foodCount);
    console.log('Ingredient Count:', ingredientCount);

    const sampleFoods = await prisma.foodItem.findMany({ take: 5 });
    console.log('Sample Foods:', JSON.stringify(sampleFoods, null, 2));

    const appleMatch = await prisma.foodItem.count({
        where: { name: { contains: 'apple' } }
    });
    console.log('Apple phrase match count:', appleMatch);

    await prisma.$disconnect();
}

check();
