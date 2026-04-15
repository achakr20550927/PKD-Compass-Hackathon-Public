const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    // Check if the ingredient search API returns proper IDs
    const ing = await prisma.ingredient.findFirst({ select: { id: true, name: true, servingSizes: true } });
    console.log('Sample ingredient from DB:', JSON.stringify(ing));

    if (!ing) { console.log('No ingredients found!'); return; }

    // Try creating a recipe like the UI would
    const firstUser = await prisma.user.findFirst({ select: { id: true } });
    console.log('First user:', firstUser?.id);

    if (!firstUser) { console.log('No users!'); return; }

    try {
        const recipe = await prisma.recipe.create({
            data: {
                userId: firstUser.id,
                title: 'Test Recipe Debug',
                servings: 1,
                ingredients: {
                    create: [{
                        ingredientId: ing.id,
                        quantity: 1,
                        unit: 'serving',
                        gramsEquivalent: 100,
                        displayNameOverride: ing.name
                    }]
                }
            },
            include: { ingredients: true }
        });
        console.log('SUCCESS! Recipe created:', recipe.id, recipe.title);
        // Clean up
        await prisma.recipe.delete({ where: { id: recipe.id } });
        console.log('Cleaned up test recipe.');
    } catch (e) {
        console.error('PRISMA ERROR:', e.message);
        console.error('Error code:', e.code);
        console.error('Meta:', JSON.stringify(e.meta));
    }

    await prisma.$disconnect();
}

test().catch(e => { console.error('Outer error:', e); process.exit(1); });
