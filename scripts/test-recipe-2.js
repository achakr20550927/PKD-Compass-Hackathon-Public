const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const firstUser = await prisma.user.findFirst({ select: { id: true, email: true } });
    console.log('First user:', firstUser?.email);

    // Simulate exactly what the recipe builder sends
    const ing1 = await prisma.ingredient.findFirst({ where: { name: { contains: 'Scallions' } }, select: { id: true, name: true } });
    const ing2 = await prisma.ingredient.findFirst({ where: { name: { contains: 'Sesame oil' } }, select: { id: true, name: true } });
    const ing3 = await prisma.ingredient.findFirst({ where: { name: { contains: 'Soy sauce' } }, select: { id: true, name: true } });

    console.log('Ingredients found:', { ing1, ing2, ing3 });

    const ingredients = [ing1, ing2, ing3].filter(Boolean);

    if (ingredients.length === 0) {
        console.log('No ingredients found to test with!');
        await prisma.$disconnect();
        return;
    }

    try {
        const recipe = await prisma.recipe.create({
            data: {
                userId: firstUser.id,
                title: 'Test Fried Rice',
                servings: 2,
                instructions: null,
                ingredients: {
                    create: ingredients.map(ing => ({
                        ingredientId: ing.id,
                        quantity: 1,
                        unit: 'serving',
                        gramsEquivalent: 100,
                        displayNameOverride: ing.name
                    }))
                }
            },
            include: { ingredients: true }
        });
        console.log('\nSUCCESS! Recipe created:', recipe.id);
        console.log('Ingredients:', recipe.ingredients.length);
        // Cleanup
        await prisma.recipe.delete({ where: { id: recipe.id } });
        console.log('Cleaned up.');
    } catch (e) {
        console.error('\nFAILED! Error:', e.message);
        console.error('Code:', e.code);
        console.error('Meta:', JSON.stringify(e.meta));
    }

    await prisma.$disconnect();
}

test();
