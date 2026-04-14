import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING PRODUCTION-GRADE SEEDING ---');
    console.log('Implementing structured food taxonomy using USDA-inspired categories...');

    const foods = [
        // 1️⃣ FRUITS
        { name: 'Apple', category: 'Fruits', brand: 'Generic', nutrients: { calories: 52, protein: 0.3, sodium: 1, potassium: 107, phosphorus: 11, fluid: 86, fat: 0.2, carbs: 14 } },
        { name: 'Apricot', category: 'Fruits', brand: 'Generic', nutrients: { calories: 48, protein: 1.4, sodium: 1, potassium: 259, phosphorus: 23, fluid: 86, fat: 0.4, carbs: 11 } },
        { name: 'Avocado', category: 'Fruits', brand: 'Generic', nutrients: { calories: 160, protein: 2, sodium: 7, potassium: 485, phosphorus: 52, fluid: 73, fat: 15, carbs: 9 } },
        { name: 'Banana', category: 'Fruits', brand: 'Generic', nutrients: { calories: 89, protein: 1.1, sodium: 1, potassium: 358, phosphorus: 22, fluid: 75, fat: 0.3, carbs: 23 } },
        { name: 'Blackberry', category: 'Fruits', brand: 'Generic', nutrients: { calories: 43, protein: 1.4, sodium: 1, potassium: 162, phosphorus: 22, fluid: 88, fat: 0.5, carbs: 10 } },
        { name: 'Blueberry', category: 'Fruits', brand: 'Generic', nutrients: { calories: 57, protein: 0.7, sodium: 1, potassium: 77, phosphorus: 12, fluid: 84, fat: 0.3, carbs: 14 } },
        { name: 'Cantaloupe', category: 'Fruits', brand: 'Generic', nutrients: { calories: 34, protein: 0.8, sodium: 16, potassium: 267, phosphorus: 15, fluid: 90, fat: 0.2, carbs: 8 } },
        { name: 'Cherry', category: 'Fruits', brand: 'Generic', nutrients: { calories: 50, protein: 1, sodium: 3, potassium: 222, phosphorus: 21, fluid: 82, fat: 0.3, carbs: 12 } },
        { name: 'Clementine', category: 'Fruits', brand: 'Generic', nutrients: { calories: 47, protein: 0.9, sodium: 1, potassium: 177, phosphorus: 20, fluid: 87, fat: 0.2, carbs: 12 } },
        { name: 'Coconut', category: 'Fruits', brand: 'Generic', nutrients: { calories: 354, protein: 3.3, sodium: 20, potassium: 356, phosphorus: 113, fluid: 47, fat: 33, carbs: 15 } },
        { name: 'Cranberry', category: 'Fruits', brand: 'Generic', nutrients: { calories: 46, protein: 0.4, sodium: 2, potassium: 85, phosphorus: 13, fluid: 87, fat: 0.1, carbs: 12 } },
        { name: 'Date', category: 'Fruits', brand: 'Generic', nutrients: { calories: 277, protein: 1.8, sodium: 1, potassium: 696, phosphorus: 62, fluid: 21, fat: 0.2, carbs: 75 } },
        { name: 'Dragon fruit', category: 'Fruits', brand: 'Generic', nutrients: { calories: 60, protein: 1.2, sodium: 0, potassium: 190, phosphorus: 22, fluid: 87, fat: 1.5, carbs: 13 } },
        { name: 'Fig', category: 'Fruits', brand: 'Generic', nutrients: { calories: 74, protein: 0.8, sodium: 1, potassium: 232, phosphorus: 14, fluid: 79, fat: 0.3, carbs: 19 } },
        { name: 'Grape', category: 'Fruits', brand: 'Generic', nutrients: { calories: 69, protein: 0.7, sodium: 2, potassium: 191, phosphorus: 20, fluid: 81, fat: 0.2, carbs: 18 } },
        { name: 'Grapefruit', category: 'Fruits', brand: 'Generic', nutrients: { calories: 42, protein: 0.8, sodium: 0, potassium: 135, phosphorus: 18, fluid: 88, fat: 0.1, carbs: 11 } },
        { name: 'Guava', category: 'Fruits', brand: 'Generic', nutrients: { calories: 68, protein: 2.6, sodium: 2, potassium: 417, phosphorus: 40, fluid: 81, fat: 1, carbs: 14 } },
        { name: 'Honeydew', category: 'Fruits', brand: 'Generic', nutrients: { calories: 36, protein: 0.5, sodium: 18, potassium: 228, phosphorus: 11, fluid: 90, fat: 0.1, carbs: 9 } },
        { name: 'Kiwi', category: 'Fruits', brand: 'Generic', nutrients: { calories: 61, protein: 1.1, sodium: 3, potassium: 312, phosphorus: 34, fluid: 83, fat: 0.5, carbs: 15 } },
        { name: 'Lemon', category: 'Fruits', brand: 'Generic', nutrients: { calories: 29, protein: 1.1, sodium: 2, potassium: 138, phosphorus: 16, fluid: 89, fat: 0.3, carbs: 9 } },
        { name: 'Lime', category: 'Fruits', brand: 'Generic', nutrients: { calories: 30, protein: 0.7, sodium: 2, potassium: 102, phosphorus: 18, fluid: 88, fat: 0.2, carbs: 11 } },
        { name: 'Mango', category: 'Fruits', brand: 'Generic', nutrients: { calories: 60, protein: 0.8, sodium: 1, potassium: 168, phosphorus: 14, fluid: 83, fat: 0.4, carbs: 15 } },
        { name: 'Nectarine', category: 'Fruits', brand: 'Generic', nutrients: { calories: 44, protein: 1.1, sodium: 0, potassium: 201, phosphorus: 26, fluid: 88, fat: 0.3, carbs: 11 } },
        { name: 'Orange', category: 'Fruits', brand: 'Generic', nutrients: { calories: 47, protein: 0.9, sodium: 0, potassium: 181, phosphorus: 14, fluid: 87, fat: 0.1, carbs: 12 } },
        { name: 'Papaya', category: 'Fruits', brand: 'Generic', nutrients: { calories: 43, protein: 0.5, sodium: 8, potassium: 182, phosphorus: 10, fluid: 88, fat: 0.3, carbs: 11 } },
        { name: 'Peach', category: 'Fruits', brand: 'Generic', nutrients: { calories: 39, protein: 0.9, sodium: 0, potassium: 190, phosphorus: 20, fluid: 89, fat: 0.3, carbs: 10 } },
        { name: 'Pear', category: 'Fruits', brand: 'Generic', nutrients: { calories: 57, protein: 0.4, sodium: 1, potassium: 116, phosphorus: 12, fluid: 84, fat: 0.1, carbs: 15 } },
        { name: 'Pineapple', category: 'Fruits', brand: 'Generic', nutrients: { calories: 50, protein: 0.5, sodium: 1, potassium: 109, phosphorus: 8, fluid: 86, fat: 0.1, carbs: 13 } },
        { name: 'Plum', category: 'Fruits', brand: 'Generic', nutrients: { calories: 46, protein: 0.7, sodium: 0, potassium: 157, phosphorus: 16, fluid: 87, fat: 0.3, carbs: 11 } },
        { name: 'Pomegranate', category: 'Fruits', brand: 'Generic', nutrients: { calories: 83, protein: 1.7, sodium: 3, potassium: 236, phosphorus: 36, fluid: 78, fat: 1.2, carbs: 19 } },
        { name: 'Raspberry', category: 'Fruits', brand: 'Generic', nutrients: { calories: 52, protein: 1.2, sodium: 1, potassium: 151, phosphorus: 29, fluid: 86, fat: 0.7, carbs: 12 } },
        { name: 'Strawberry', category: 'Fruits', brand: 'Generic', nutrients: { calories: 32, protein: 0.7, sodium: 1, potassium: 153, phosphorus: 24, fluid: 91, fat: 0.3, carbs: 7.7 } },
        { name: 'Tangerine', category: 'Fruits', brand: 'Generic', nutrients: { calories: 53, protein: 0.8, sodium: 2, potassium: 166, phosphorus: 20, fluid: 85, fat: 0.3, carbs: 13 } },
        { name: 'Watermelon', category: 'Fruits', brand: 'Generic', nutrients: { calories: 30, protein: 0.6, sodium: 1, potassium: 112, phosphorus: 11, fluid: 91, fat: 0.2, carbs: 7.6 } },

        // 2️⃣ VEGETABLES
        { name: 'Spinach', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 23, protein: 2.9, sodium: 79, potassium: 558, phosphorus: 49, fluid: 91, fat: 0.4, carbs: 3.6 } },
        { name: 'Kale', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 35, protein: 2.9, sodium: 53, potassium: 348, phosphorus: 55, fluid: 90, fat: 1.5, carbs: 4.4 } },
        { name: 'Romaine lettuce', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 17, protein: 1.2, sodium: 8, potassium: 247, phosphorus: 30, fluid: 94, fat: 0.3, carbs: 3.3 } },
        { name: 'Iceberg lettuce', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 14, protein: 0.9, sodium: 10, potassium: 141, phosphorus: 20, fluid: 96, fat: 0.1, carbs: 3 } },
        { name: 'Swiss chard', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 19, protein: 1.8, sodium: 213, potassium: 379, phosphorus: 46, fluid: 93, fat: 0.2, carbs: 3.7 } },
        { name: 'Collard greens', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 32, protein: 3, sodium: 9, potassium: 213, phosphorus: 42, fluid: 90, fat: 0.6, carbs: 5.4 } },
        { name: 'Arugula', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 25, protein: 2.6, sodium: 27, potassium: 369, phosphorus: 52, fluid: 92, fat: 0.7, carbs: 3.7 } },
        { name: 'Broccoli', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 34, protein: 2.8, sodium: 33, potassium: 316, phosphorus: 66, fluid: 89, fat: 0.4, carbs: 6.6 } },
        { name: 'Cauliflower', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 25, protein: 1.9, sodium: 30, potassium: 299, phosphorus: 44, fluid: 92, fat: 0.3, carbs: 5 } },
        { name: 'Brussels sprouts', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 43, protein: 3.4, sodium: 25, potassium: 389, phosphorus: 69, fluid: 86, fat: 0.3, carbs: 9 } },
        { name: 'Cabbage', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 25, protein: 1.3, sodium: 18, potassium: 170, phosphorus: 26, fluid: 92, fat: 0.1, carbs: 5.8 } },
        { name: 'Carrot', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 41, protein: 0.9, sodium: 69, potassium: 320, phosphorus: 35, fluid: 88, fat: 0.2, carbs: 9.6 } },
        { name: 'Beet', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 43, protein: 1.6, sodium: 78, potassium: 325, phosphorus: 40, fluid: 88, fat: 0.2, carbs: 10 } },
        { name: 'Turnip', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 28, protein: 0.9, sodium: 67, potassium: 191, phosphorus: 27, fluid: 92, fat: 0.1, carbs: 6 } },
        { name: 'Radish', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 16, protein: 0.7, sodium: 39, potassium: 233, phosphorus: 20, fluid: 95, fat: 0.1, carbs: 3.4 } },
        { name: 'Sweet potato', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 86, protein: 1.6, sodium: 55, potassium: 337, phosphorus: 47, fluid: 77, fat: 0.1, carbs: 20 } },
        { name: 'White potato', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 77, protein: 2, sodium: 6, potassium: 421, phosphorus: 57, fluid: 79, fat: 0.1, carbs: 17 } },
        { name: 'Bell pepper', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 20, protein: 0.9, sodium: 3, potassium: 175, phosphorus: 20, fluid: 94, fat: 0.2, carbs: 4.6 } },
        { name: 'Zucchini', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 17, protein: 1.2, sodium: 8, potassium: 261, phosphorus: 38, fluid: 95, fat: 0.3, carbs: 3.1 } },
        { name: 'Cucumber', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 15, protein: 0.7, sodium: 2, potassium: 147, phosphorus: 24, fluid: 95, fat: 0.1, carbs: 3.6 } },
        { name: 'Eggplant', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 25, protein: 1, sodium: 2, potassium: 229, phosphorus: 24, fluid: 92, fat: 0.2, carbs: 6 } },
        { name: 'Tomato', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 18, protein: 0.9, sodium: 5, potassium: 237, phosphorus: 24, fluid: 95, fat: 0.2, carbs: 3.9 } },
        { name: 'Onion', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 40, protein: 1.1, sodium: 4, potassium: 146, phosphorus: 29, fluid: 89, fat: 0.1, carbs: 9.3 } },
        { name: 'Garlic', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 149, protein: 6.4, sodium: 17, potassium: 401, phosphorus: 153, fluid: 59, fat: 0.5, carbs: 33 } },

        // 3️⃣ LEGUMES & BEANS
        { name: 'Black beans', category: 'Legumes & Beans', brand: 'Generic', nutrients: { calories: 341, protein: 21, sodium: 5, potassium: 1483, phosphorus: 352, fluid: 11, fat: 1.4, carbs: 62 } },
        { name: 'Kidney beans', category: 'Legumes & Beans', brand: 'Generic', nutrients: { calories: 333, protein: 24, sodium: 24, potassium: 1406, phosphorus: 407, fluid: 12, fat: 0.8, carbs: 60 } },
        { name: 'Chickpeas', category: 'Legumes & Beans', brand: 'Generic', nutrients: { calories: 364, protein: 19, sodium: 24, potassium: 875, phosphorus: 366, fluid: 11, fat: 6, carbs: 61 } },
        { name: 'Lentils', category: 'Legumes & Beans', brand: 'Generic', nutrients: { calories: 353, protein: 25, sodium: 6, potassium: 955, phosphorus: 451, fluid: 11, fat: 1, carbs: 60 } },

        // 4️⃣ GRAINS & CARBS
        { name: 'White rice', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 365, protein: 7, sodium: 5, potassium: 115, phosphorus: 115, fluid: 12, fat: 0.7, carbs: 80 } },
        { name: 'Brown rice', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 367, protein: 7.5, sodium: 7, potassium: 223, phosphorus: 264, fluid: 10, fat: 2.8, carbs: 77 } },
        { name: 'Quinoa', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 368, protein: 14, sodium: 5, potassium: 563, phosphorus: 457, fluid: 13, fat: 6, carbs: 64 } },
        { name: 'Oats', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 389, protein: 17, sodium: 2, potassium: 429, phosphorus: 523, fluid: 8, fat: 7, carbs: 66 } },
        { name: 'Whole wheat bread', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 247, protein: 13, sodium: 400, potassium: 248, phosphorus: 212, fluid: 38, fat: 3.4, carbs: 41 } },

        // 5️⃣ MEATS & PROTEINS
        { name: 'Chicken breast', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 165, protein: 31, sodium: 74, potassium: 256, phosphorus: 228, fluid: 65, fat: 3.6, carbs: 0 } },
        { name: 'Turkey', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 135, protein: 30, sodium: 52, potassium: 286, phosphorus: 206, fluid: 68, fat: 0.7, carbs: 0 } },
        { name: 'Beef steak', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 250, protein: 26, sodium: 60, potassium: 318, phosphorus: 198, fluid: 60, fat: 15, carbs: 0 } },
        { name: 'Pork chop', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 196, protein: 26, sodium: 79, potassium: 395, phosphorus: 226, fluid: 64, fat: 9, carbs: 0 } },
        { name: 'Salmon', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 208, protein: 20, sodium: 59, potassium: 363, phosphorus: 250, fluid: 64, fat: 13, carbs: 0 } },
        { name: 'Tuna', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 116, protein: 26, sodium: 338, potassium: 237, phosphorus: 163, fluid: 71, fat: 0.8, carbs: 0 } },
        { name: 'Tofu', category: 'Meats & Proteins', brand: 'Plant-based', nutrients: { calories: 76, protein: 8, sodium: 7, potassium: 121, phosphorus: 105, fluid: 84, fat: 4.8, carbs: 1.9 } },
        { name: 'Egg (Whole)', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 155, protein: 13, sodium: 124, potassium: 126, phosphorus: 172, fluid: 75, fat: 11, carbs: 1.1 } },

        // 6️⃣ DAIRY & ALTERNATIVES
        { name: 'Milk (Whole)', category: 'Dairy & Alternatives', brand: 'Generic', nutrients: { calories: 61, protein: 3.2, sodium: 44, potassium: 132, phosphorus: 84, fluid: 88, fat: 3.3, carbs: 4.8 } },
        { name: 'Greek yogurt', category: 'Dairy & Alternatives', brand: 'Generic', nutrients: { calories: 59, protein: 10, sodium: 36, potassium: 141, phosphorus: 135, fluid: 85, fat: 0.4, carbs: 3.6 } },
        { name: 'Almond milk', category: 'Dairy & Alternatives', brand: 'Alternative', nutrients: { calories: 15, protein: 0.5, sodium: 71, potassium: 63, phosphorus: 14, fluid: 97, fat: 1.1, carbs: 0.6 } },

        // 7️⃣ NUTS & SEEDS
        { name: 'Almond', category: 'Nuts & Seeds', brand: 'Generic', nutrients: { calories: 579, protein: 21, sodium: 1, potassium: 733, phosphorus: 481, fluid: 4, fat: 50, carbs: 22 } },
        { name: 'Walnut', category: 'Nuts & Seeds', brand: 'Generic', nutrients: { calories: 654, protein: 15, sodium: 2, potassium: 441, phosphorus: 346, fluid: 4, fat: 65, carbs: 14 } },
        { name: 'Chia seeds', category: 'Nuts & Seeds', brand: 'Generic', nutrients: { calories: 486, protein: 17, sodium: 16, potassium: 407, phosphorus: 860, fluid: 6, fat: 31, carbs: 42 } },

        // 8️⃣ OILS & FATS
        { name: 'Olive oil', category: 'Oils & Fats', brand: 'Generic', nutrients: { calories: 884, protein: 0, sodium: 2, potassium: 1, phosphorus: 0, fluid: 0, fat: 100, carbs: 0 } },
        { name: 'Butter', category: 'Oils & Fats', brand: 'Generic', nutrients: { calories: 717, protein: 0.9, sodium: 643, potassium: 24, phosphorus: 24, fluid: 16, fat: 81, carbs: 0 } },

        // 9️⃣ SNACKS & PACKAGED
        { name: 'Granola bar', category: 'Snacks & Packaged Basics', brand: 'Generic', nutrients: { calories: 430, protein: 8, sodium: 290, potassium: 270, phosphorus: 180, fluid: 5, fat: 15, carbs: 68 } },
        { name: 'Popcorn', category: 'Snacks & Packaged Basics', brand: 'Generic', nutrients: { calories: 387, protein: 13, sodium: 8, potassium: 329, phosphorus: 358, fluid: 3, fat: 4.5, carbs: 78 } }
    ];

    console.log(`Processing ${foods.length} taxonomically structured food items...`);

    for (const food of foods) {
        const foodData = {
            name: food.name,
            category: food.category,
            brand: food.brand,
            nutrients: JSON.stringify(food.nutrients),
            servingSizes: JSON.stringify([
                { name: '100g', weightG: 100 },
                { name: '1 serving', weightG: 85 } // Default serving estimate
            ]),
            source: 'USDA_STRUCTURED_SEEDED'
        };

        // Seed FoodItem
        await prisma.foodItem.upsert({
            where: { barcode: food.name.toLowerCase().replace(/\s+/g, '_') + '_prod_seed' },
            update: foodData,
            create: { ...foodData, barcode: food.name.toLowerCase().replace(/\s+/g, '_') + '_prod_seed' }
        });

        // Seed Ingredient
        const existingIng = await prisma.ingredient.findFirst({ where: { name: food.name } });
        if (!existingIng) {
            await prisma.ingredient.create({
                data: {
                    name: food.name,
                    category: food.category,
                    nutrients: JSON.stringify(food.nutrients),
                    servingSizes: JSON.stringify([{ name: '100g', weightG: 100 }]),
                    source: 'USDA_STRUCTURED_SEEDED'
                }
            });
        }
    }

    console.log('Seeding common meal templates as recipes...');

    // Simulating user-created recipes (meal templates)
    const mealTemplates = [
        { title: 'Oatmeal with Blueberries', servings: 1, ingredients: [{ name: 'Oats', qty: 0.5, unit: 'cup' }, { name: 'Blueberry', qty: 0.5, unit: 'cup' }] },
        { title: 'Grilled Chicken Stir Fry', servings: 2, ingredients: [{ name: 'Chicken breast', qty: 200, unit: 'g' }, { name: 'Broccoli', qty: 100, unit: 'g' }, { name: 'Bell pepper', qty: 50, unit: 'g' }] },
        { title: 'Avocado Toast', servings: 1, ingredients: [{ name: 'Whole wheat bread', qty: 1, unit: 'slice' }, { name: 'Avocado', qty: 0.5, unit: 'whole' }] },
        { title: 'Salmon & Roasted Vegetables', servings: 1, ingredients: [{ name: 'Salmon', qty: 150, unit: 'g' }, { name: 'Zucchini', qty: 100, unit: 'g' }, { name: 'Carrot', qty: 50, unit: 'g' }] }
    ];

    // Note: We need a system user or a default user to own these recipes. 
    // For seeding simplicity, we'll check for the first user available.
    const firstUser = await prisma.user.findFirst();
    if (firstUser) {
        for (const meal of mealTemplates) {
            const existingRecipe = await prisma.recipe.findFirst({ where: { title: meal.title, userId: firstUser.id } });
            if (!existingRecipe) {
                const recipe = await prisma.recipe.create({
                    data: {
                        title: meal.title,
                        servings: meal.servings,
                        userId: firstUser.id
                    }
                });

                for (const ing of meal.ingredients) {
                    const ingredient = await prisma.ingredient.findFirst({ where: { name: ing.name } });
                    if (ingredient) {
                        await prisma.recipeIngredient.create({
                            data: {
                                recipeId: recipe.id,
                                ingredientId: ingredient.id,
                                quantity: ing.qty,
                                unit: ing.unit,
                                gramsEquivalent: 100 // Approximation
                            }
                        });
                    }
                }
            }
        }
    }

    console.log('--- PRODUCTION SEEDING COMPLETE ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
