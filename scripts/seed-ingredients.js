const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const newIngredients = [
    // Vegetables
    { name: 'Scallions', category: 'Vegetables' },
    { name: 'Green onion', category: 'Vegetables' },
    { name: 'Onion (Red)', category: 'Vegetables' },
    { name: 'Onion (White)', category: 'Vegetables' },
    { name: 'Shallot', category: 'Vegetables' },
    { name: 'Cherry tomato', category: 'Vegetables' },
    { name: 'Iceberg lettuce', category: 'Vegetables' },
    { name: 'Arugula', category: 'Vegetables' },
    { name: 'Asparagus', category: 'Vegetables' },
    { name: 'Peas (Frozen)', category: 'Vegetables' },
    { name: 'Peas', category: 'Vegetables' },
    { name: 'Bell pepper (Yellow)', category: 'Vegetables' },
    { name: 'Jalapeño', category: 'Vegetables' },
    { name: 'Mushrooms (Shiitake)', category: 'Vegetables' },
    { name: 'Corn', category: 'Vegetables' },
    { name: 'Edamame', category: 'Vegetables' },
    { name: 'Bok choy', category: 'Vegetables' },
    { name: 'Leek', category: 'Vegetables' },
    { name: 'Radish', category: 'Vegetables' },
    { name: 'Turnip', category: 'Vegetables' },
    { name: 'Beet', category: 'Vegetables' },
    { name: 'Eggplant', category: 'Vegetables' },
    { name: 'Green beans', category: 'Vegetables' },
    { name: 'Snow peas', category: 'Vegetables' },
    // Meats
    { name: 'Chicken wing', category: 'Meats & Proteins' },
    { name: 'Ground beef', category: 'Meats & Proteins' },
    { name: 'Ground beef (90/10)', category: 'Meats & Proteins' },
    { name: 'Ground turkey', category: 'Meats & Proteins' },
    { name: 'Pork chop', category: 'Meats & Proteins' },
    { name: 'Pork tenderloin', category: 'Meats & Proteins' },
    { name: 'Bacon', category: 'Meats & Proteins' },
    { name: 'Ham', category: 'Meats & Proteins' },
    { name: 'Lamb chop', category: 'Meats & Proteins' },
    // Fish
    { name: 'Tilapia', category: 'Fish & Seafood' },
    { name: 'Cod', category: 'Fish & Seafood' },
    { name: 'Tuna (canned)', category: 'Fish & Seafood' },
    { name: 'Crab', category: 'Fish & Seafood' },
    { name: 'Lobster', category: 'Fish & Seafood' },
    { name: 'Scallop', category: 'Fish & Seafood' },
    { name: 'Halibut', category: 'Fish & Seafood' },
    { name: 'Sardines (canned)', category: 'Fish & Seafood' },
    { name: 'Mussels', category: 'Fish & Seafood' },
    { name: 'Clams', category: 'Fish & Seafood' },
    // Eggs & Dairy
    { name: 'Milk (Whole)', category: 'Eggs & Dairy' },
    { name: 'Heavy cream', category: 'Eggs & Dairy' },
    { name: 'Sour cream', category: 'Eggs & Dairy' },
    // Oils
    { name: 'Vegetable oil', category: 'Oils & Fats' },
    { name: 'Canola oil', category: 'Oils & Fats' },
    { name: 'Sesame oil', category: 'Oils & Fats' },
    { name: 'Coconut oil', category: 'Oils & Fats' },
    { name: 'Butter (Salted)', category: 'Oils & Fats' },
    { name: 'Ghee', category: 'Oils & Fats' },
    // Grains
    { name: 'White rice', category: 'Grains & Carbs' },
    { name: 'Brown rice', category: 'Grains & Carbs' },
    { name: 'All-purpose flour', category: 'Grains & Carbs' },
    { name: 'Breadcrumbs', category: 'Grains & Carbs' },
    { name: 'Cornstarch', category: 'Grains & Carbs' },
    // Condiments
    { name: 'Soy sauce', category: 'Condiments' },
    { name: 'Tamari', category: 'Condiments' },
    { name: 'Fish sauce', category: 'Condiments' },
    { name: 'Oyster sauce', category: 'Condiments' },
    { name: 'Hoisin sauce', category: 'Condiments' },
    { name: 'Hot sauce', category: 'Condiments' },
    { name: 'Worcestershire sauce', category: 'Condiments' },
    { name: 'Ketchup', category: 'Condiments' },
    { name: 'Mayonnaise', category: 'Condiments' },
    { name: 'Mustard', category: 'Condiments' },
    { name: 'Vinegar (Rice)', category: 'Condiments' },
    { name: 'Vinegar (Apple cider)', category: 'Condiments' },
    { name: 'Maple syrup', category: 'Condiments' },
    { name: 'Chicken broth', category: 'Condiments' },
    { name: 'Beef broth', category: 'Condiments' },
    { name: 'Coconut milk (Canned)', category: 'Condiments' },
    { name: 'Lemon juice', category: 'Condiments' },
    { name: 'Lime juice', category: 'Condiments' },
    // Spices
    { name: 'Salt', category: 'Spices & Herbs' },
    { name: 'Black pepper', category: 'Spices & Herbs' },
    { name: 'White pepper', category: 'Spices & Herbs' },
    { name: 'Paprika', category: 'Spices & Herbs' },
    { name: 'Cumin', category: 'Spices & Herbs' },
    { name: 'Turmeric', category: 'Spices & Herbs' },
    { name: 'Ginger (Ground)', category: 'Spices & Herbs' },
    { name: 'Ginger', category: 'Spices & Herbs' },
    { name: 'Cinnamon', category: 'Spices & Herbs' },
    { name: 'Oregano', category: 'Spices & Herbs' },
    { name: 'Basil', category: 'Spices & Herbs' },
    { name: 'Cilantro', category: 'Spices & Herbs' },
    { name: 'Parsley', category: 'Spices & Herbs' },
    { name: 'Thyme', category: 'Spices & Herbs' },
    { name: 'Rosemary', category: 'Spices & Herbs' },
    { name: 'Red pepper flakes', category: 'Spices & Herbs' },
    { name: 'Garlic powder', category: 'Spices & Herbs' },
    { name: 'Onion powder', category: 'Spices & Herbs' },
    // Nuts & Seeds
    { name: 'Cashews', category: 'Nuts & Seeds' },
    { name: 'Peanuts', category: 'Nuts & Seeds' },
    { name: 'Peanut butter', category: 'Nuts & Seeds' },
    { name: 'Sesame seeds', category: 'Nuts & Seeds' },
    { name: 'Sunflower seeds', category: 'Nuts & Seeds' },
];

const defaultNutrients = { calories: 50, protein: 2, sodium: 50, potassium: 150, phosphorus: 40, fluid: 80, fat: 2, carbs: 8 };
const defaultServingSizes = [{ name: '100g', weightG: 100 }, { name: '1 serving', weightG: 85 }];

async function seed() {
    console.log(`Adding ${newIngredients.length} new ingredients...`);
    let added = 0;
    for (const ing of newIngredients) {
        const existing = await prisma.ingredient.findFirst({ where: { name: ing.name } });
        if (!existing) {
            await prisma.ingredient.create({
                data: {
                    name: ing.name,
                    category: ing.category,
                    nutrients: JSON.stringify(defaultNutrients),
                    servingSizes: JSON.stringify(defaultServingSizes),
                    source: 'SEED'
                }
            });
            // Also add to FoodItem
            await prisma.foodItem.upsert({
                where: { barcode: ing.name.toLowerCase().replace(/\s+/g, '_') + '_api_seed' },
                update: { name: ing.name, category: ing.category },
                create: {
                    name: ing.name,
                    category: ing.category,
                    brand: 'Generic',
                    nutrients: JSON.stringify(defaultNutrients),
                    servingSizes: JSON.stringify(defaultServingSizes),
                    source: 'SEED',
                    barcode: ing.name.toLowerCase().replace(/\s+/g, '_') + '_api_seed'
                }
            });
            added++;
        }
    }
    console.log(`Done! Added ${added} new ingredients.`);
    await prisma.$disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
