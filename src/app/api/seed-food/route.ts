export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hasSeedAccess } from '@/lib/seed-auth';

export async function GET(req: Request) {
    try {
        if (!hasSeedAccess(req, "SEED_SECRET")) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
        const limit = Math.min(300, Math.max(1, parseInt(searchParams.get('limit') || '300', 10)));
        const reset = (searchParams.get('reset') || '0') === '1';
        const multiplier = Math.min(40, Math.max(1, parseInt(searchParams.get('multiplier') || '1', 10)));
        const includeSynthetic = (searchParams.get('synthetic') || '1') === '1';

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
            { name: 'Watermelon', category: 'Fruits', brand: 'Generic', nutrients: { calories: 30, protein: 0.6, sodium: 1, potassium: 112, phosphorus: 11, fluid: 91, fat: 0.2, carbs: 7.6 } },

            // 2️⃣ VEGETABLES (Comprehensive)
            { name: 'Garlic', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 149, protein: 6.4, sodium: 17, potassium: 401, phosphorus: 153, fluid: 59, fat: 0.5, carbs: 33 } },
            { name: 'Scallions', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 32, protein: 1.8, sodium: 16, potassium: 276, phosphorus: 37, fluid: 90, fat: 0.2, carbs: 7.3 } },
            { name: 'Green onion', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 32, protein: 1.8, sodium: 16, potassium: 276, phosphorus: 37, fluid: 90, fat: 0.2, carbs: 7.3 } },
            { name: 'Onion (Yellow)', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 40, protein: 1.1, sodium: 4, potassium: 146, phosphorus: 29, fluid: 89, fat: 0.1, carbs: 9.3 } },
            { name: 'Onion (Red)', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 40, protein: 1.1, sodium: 4, potassium: 146, phosphorus: 29, fluid: 89, fat: 0.1, carbs: 9.3 } },
            { name: 'Onion (White)', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 40, protein: 1.1, sodium: 4, potassium: 146, phosphorus: 29, fluid: 89, fat: 0.1, carbs: 9.3 } },
            { name: 'Shallot', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 72, protein: 2.5, sodium: 12, potassium: 334, phosphorus: 60, fluid: 80, fat: 0.1, carbs: 17 } },
            { name: 'Tomato (Roma)', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 18, protein: 0.9, sodium: 5, potassium: 237, phosphorus: 24, fluid: 95, fat: 0.2, carbs: 3.9 } },
            { name: 'Cherry tomato', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 18, protein: 0.9, sodium: 5, potassium: 237, phosphorus: 24, fluid: 95, fat: 0.2, carbs: 3.9 } },
            { name: 'Spinach', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 23, protein: 2.9, sodium: 79, potassium: 558, phosphorus: 49, fluid: 91, fat: 0.4, carbs: 3.6 } },
            { name: 'Kale', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 35, protein: 2.9, sodium: 53, potassium: 348, phosphorus: 55, fluid: 90, fat: 1.5, carbs: 4.4 } },
            { name: 'Romaine lettuce', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 17, protein: 1.2, sodium: 8, potassium: 247, phosphorus: 30, fluid: 94, fat: 0.3, carbs: 3.3 } },
            { name: 'Iceberg lettuce', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 14, protein: 0.9, sodium: 10, potassium: 141, phosphorus: 20, fluid: 96, fat: 0.1, carbs: 3 } },
            { name: 'Arugula', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 25, protein: 2.6, sodium: 27, potassium: 369, phosphorus: 52, fluid: 92, fat: 0.7, carbs: 3.7 } },
            { name: 'Broccoli', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 34, protein: 2.8, sodium: 33, potassium: 316, phosphorus: 66, fluid: 89, fat: 0.4, carbs: 6.6 } },
            { name: 'Cauliflower', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 25, protein: 1.9, sodium: 30, potassium: 299, phosphorus: 44, fluid: 92, fat: 0.3, carbs: 5 } },
            { name: 'Brussels sprouts', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 43, protein: 3.4, sodium: 25, potassium: 389, phosphorus: 69, fluid: 86, fat: 0.3, carbs: 9 } },
            { name: 'Asparagus', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 20, protein: 2.2, sodium: 2, potassium: 202, phosphorus: 52, fluid: 93, fat: 0.1, carbs: 3.9 } },
            { name: 'Carrot', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 41, protein: 0.9, sodium: 69, potassium: 320, phosphorus: 35, fluid: 88, fat: 0.2, carbs: 9.6 } },
            { name: 'Peas (Frozen)', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 80, protein: 5.4, sodium: 108, potassium: 271, phosphorus: 99, fluid: 79, fat: 0.4, carbs: 14 } },
            { name: 'Peas', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 80, protein: 5.4, sodium: 108, potassium: 271, phosphorus: 99, fluid: 79, fat: 0.4, carbs: 14 } },
            { name: 'Sweet potato', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 86, protein: 1.6, sodium: 55, potassium: 337, phosphorus: 47, fluid: 77, fat: 0.1, carbs: 20 } },
            { name: 'Zucchini', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 17, protein: 1.2, sodium: 8, potassium: 261, phosphorus: 38, fluid: 95, fat: 0.3, carbs: 3.1 } },
            { name: 'Bell pepper (Red)', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 31, protein: 1, sodium: 4, potassium: 211, phosphorus: 26, fluid: 92, fat: 0.3, carbs: 6 } },
            { name: 'Bell pepper (Green)', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 20, protein: 0.9, sodium: 3, potassium: 175, phosphorus: 20, fluid: 94, fat: 0.2, carbs: 4.6 } },
            { name: 'Bell pepper (Yellow)', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 27, protein: 1, sodium: 2, potassium: 212, phosphorus: 24, fluid: 92, fat: 0.2, carbs: 6.3 } },
            { name: 'Jalapeño', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 29, protein: 1.4, sodium: 3, potassium: 248, phosphorus: 26, fluid: 92, fat: 0.4, carbs: 6.5 } },
            { name: 'Cucumber', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 15, protein: 0.7, sodium: 2, potassium: 147, phosphorus: 24, fluid: 95, fat: 0.1, carbs: 3.6 } },
            { name: 'Mushrooms (White)', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 22, protein: 3.1, sodium: 5, potassium: 318, phosphorus: 86, fluid: 92, fat: 0.3, carbs: 3.3 } },
            { name: 'Mushrooms (Shiitake)', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 34, protein: 2.2, sodium: 9, potassium: 304, phosphorus: 112, fluid: 90, fat: 0.5, carbs: 6.8 } },
            { name: 'Celery', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 14, protein: 0.7, sodium: 80, potassium: 260, phosphorus: 24, fluid: 95, fat: 0.2, carbs: 3 } },
            { name: 'Corn', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 96, protein: 3.4, sodium: 15, potassium: 270, phosphorus: 89, fluid: 76, fat: 1.5, carbs: 21 } },
            { name: 'Edamame', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 121, protein: 11, sodium: 6, potassium: 436, phosphorus: 169, fluid: 69, fat: 5.2, carbs: 9 } },
            { name: 'Bok choy', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 13, protein: 1.5, sodium: 65, potassium: 252, phosphorus: 37, fluid: 95, fat: 0.2, carbs: 2.2 } },
            { name: 'Leek', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 61, protein: 1.5, sodium: 20, potassium: 180, phosphorus: 35, fluid: 83, fat: 0.3, carbs: 14 } },
            { name: 'Radish', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 16, protein: 0.7, sodium: 39, potassium: 233, phosphorus: 20, fluid: 95, fat: 0.1, carbs: 3.4 } },
            { name: 'Turnip', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 28, protein: 0.9, sodium: 67, potassium: 191, phosphorus: 27, fluid: 92, fat: 0.1, carbs: 6.4 } },
            { name: 'Beet', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 43, protein: 1.6, sodium: 78, potassium: 325, phosphorus: 40, fluid: 88, fat: 0.2, carbs: 9.6 } },
            { name: 'Eggplant', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 25, protein: 1, sodium: 2, potassium: 229, phosphorus: 24, fluid: 92, fat: 0.2, carbs: 5.9 } },
            { name: 'Green beans', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 31, protein: 1.8, sodium: 6, potassium: 209, phosphorus: 38, fluid: 90, fat: 0.2, carbs: 7 } },
            { name: 'Snow peas', category: 'Vegetables', brand: 'Generic', nutrients: { calories: 42, protein: 2.8, sodium: 4, potassium: 200, phosphorus: 53, fluid: 89, fat: 0.2, carbs: 7.6 } },

            // 3️⃣ PROTEINS — MEATS
            { name: 'Chicken breast', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 165, protein: 31, sodium: 74, potassium: 256, phosphorus: 228, fluid: 65, fat: 3.6, carbs: 0 } },
            { name: 'Chicken Thigh', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 209, protein: 26, sodium: 87, potassium: 223, phosphorus: 188, fluid: 65, fat: 11, carbs: 0 } },
            { name: 'Chicken wing', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 266, protein: 20, sodium: 95, potassium: 166, phosphorus: 145, fluid: 60, fat: 19, carbs: 0 } },
            { name: 'Ground beef', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 250, protein: 26, sodium: 75, potassium: 320, phosphorus: 195, fluid: 60, fat: 15, carbs: 0 } },
            { name: 'Ground beef (90/10)', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 176, protein: 20, sodium: 66, potassium: 313, phosphorus: 191, fluid: 63, fat: 10, carbs: 0 } },
            { name: 'Turkey', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 135, protein: 30, sodium: 52, potassium: 286, phosphorus: 206, fluid: 68, fat: 0.7, carbs: 0 } },
            { name: 'Ground turkey', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 170, protein: 22, sodium: 82, potassium: 259, phosphorus: 185, fluid: 65, fat: 9, carbs: 0 } },
            { name: 'Beef steak', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 250, protein: 26, sodium: 60, potassium: 318, phosphorus: 198, fluid: 60, fat: 15, carbs: 0 } },
            { name: 'Pork chop', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 231, protein: 25, sodium: 58, potassium: 355, phosphorus: 220, fluid: 62, fat: 14, carbs: 0 } },
            { name: 'Pork tenderloin', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 143, protein: 22, sodium: 57, potassium: 423, phosphorus: 230, fluid: 66, fat: 4.5, carbs: 0 } },
            { name: 'Bacon', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 541, protein: 37, sodium: 1717, potassium: 565, phosphorus: 387, fluid: 22, fat: 42, carbs: 1.4 } },
            { name: 'Ham', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 145, protein: 21, sodium: 1203, potassium: 287, phosphorus: 212, fluid: 65, fat: 5.5, carbs: 1.5 } },
            { name: 'Lamb chop', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 294, protein: 25, sodium: 90, potassium: 310, phosphorus: 196, fluid: 58, fat: 20, carbs: 0 } },

            // 4️⃣ PROTEINS — FISH & SEAFOOD
            { name: 'Salmon', category: 'Fish & Seafood', brand: 'Generic', nutrients: { calories: 208, protein: 20, sodium: 59, potassium: 363, phosphorus: 250, fluid: 64, fat: 13, carbs: 0 } },
            { name: 'Tilapia', category: 'Fish & Seafood', brand: 'Generic', nutrients: { calories: 96, protein: 20, sodium: 56, potassium: 302, phosphorus: 180, fluid: 76, fat: 2, carbs: 0 } },
            { name: 'Cod', category: 'Fish & Seafood', brand: 'Generic', nutrients: { calories: 82, protein: 18, sodium: 54, potassium: 413, phosphorus: 203, fluid: 81, fat: 0.7, carbs: 0 } },
            { name: 'Tuna (canned)', category: 'Fish & Seafood', brand: 'Generic', nutrients: { calories: 109, protein: 25, sodium: 350, potassium: 289, phosphorus: 240, fluid: 69, fat: 0.5, carbs: 0 } },
            { name: 'Shrimp', category: 'Fish & Seafood', brand: 'Generic', nutrients: { calories: 99, protein: 24, sodium: 111, potassium: 259, phosphorus: 237, fluid: 76, fat: 0.3, carbs: 0.2 } },
            { name: 'Crab', category: 'Fish & Seafood', brand: 'Generic', nutrients: { calories: 97, protein: 19, sodium: 378, potassium: 259, phosphorus: 228, fluid: 77, fat: 1.5, carbs: 0 } },
            { name: 'Lobster', category: 'Fish & Seafood', brand: 'Generic', nutrients: { calories: 89, protein: 19, sodium: 296, potassium: 352, phosphorus: 185, fluid: 76, fat: 0.9, carbs: 0.5 } },
            { name: 'Scallop', category: 'Fish & Seafood', brand: 'Generic', nutrients: { calories: 88, protein: 17, sodium: 267, potassium: 314, phosphorus: 310, fluid: 76, fat: 0.8, carbs: 2.4 } },
            { name: 'Halibut', category: 'Fish & Seafood', brand: 'Generic', nutrients: { calories: 111, protein: 23, sodium: 68, potassium: 576, phosphorus: 285, fluid: 73, fat: 2.3, carbs: 0 } },
            { name: 'Sardines (canned)', category: 'Fish & Seafood', brand: 'Generic', nutrients: { calories: 208, protein: 25, sodium: 505, potassium: 397, phosphorus: 490, fluid: 60, fat: 11, carbs: 0 } },
            { name: 'Mussels', category: 'Fish & Seafood', brand: 'Generic', nutrients: { calories: 86, protein: 12, sodium: 286, potassium: 320, phosphorus: 197, fluid: 78, fat: 2.2, carbs: 3.7 } },
            { name: 'Clams', category: 'Fish & Seafood', brand: 'Generic', nutrients: { calories: 74, protein: 13, sodium: 56, potassium: 314, phosphorus: 169, fluid: 79, fat: 1, carbs: 2.6 } },

            // 5️⃣ EGGS & DAIRY
            { name: 'Egg (Whole)', category: 'Eggs & Dairy', brand: 'Generic', nutrients: { calories: 155, protein: 13, sodium: 124, potassium: 126, phosphorus: 172, fluid: 75, fat: 11, carbs: 1.1 } },
            { name: 'Egg White', category: 'Eggs & Dairy', brand: 'Generic', nutrients: { calories: 52, protein: 11, sodium: 166, potassium: 163, phosphorus: 15, fluid: 88, fat: 0.2, carbs: 0.7 } },
            { name: 'Tofu (Firm)', category: 'Meats & Proteins', brand: 'Generic', nutrients: { calories: 83, protein: 10, sodium: 7, potassium: 121, phosphorus: 105, fluid: 84, fat: 4.8, carbs: 1.9 } },
            { name: 'Tempeh', category: 'Meats & Proteins', brand: 'Plant-based', nutrients: { calories: 192, protein: 19, sodium: 9, potassium: 412, phosphorus: 266, fluid: 60, fat: 11, carbs: 9.4 } },
            { name: 'Milk (Whole)', category: 'Eggs & Dairy', brand: 'Generic', nutrients: { calories: 61, protein: 3.2, sodium: 43, potassium: 132, phosphorus: 84, fluid: 88, fat: 3.3, carbs: 4.8 } },
            { name: 'Heavy cream', category: 'Eggs & Dairy', brand: 'Generic', nutrients: { calories: 340, protein: 2.1, sodium: 27, potassium: 75, phosphorus: 58, fluid: 57, fat: 36, carbs: 2.8 } },
            { name: 'Sour cream', category: 'Eggs & Dairy', brand: 'Generic', nutrients: { calories: 198, protein: 3, sodium: 53, potassium: 130, phosphorus: 77, fluid: 71, fat: 19, carbs: 4.6 } },

            // 6️⃣ GRAINS & STAPLES
            { name: 'Spaghetti (Dry)', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 371, protein: 13, sodium: 6, potassium: 223, phosphorus: 189, fluid: 10, fat: 1.5, carbs: 75 } },
            { name: 'Penne (Dry)', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 371, protein: 13, sodium: 6, potassium: 223, phosphorus: 189, fluid: 10, fat: 1.5, carbs: 75 } },
            { name: 'White rice', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 130, protein: 2.4, sodium: 0, potassium: 35, phosphorus: 43, fluid: 68, fat: 0.3, carbs: 28 } },
            { name: 'Brown rice', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 123, protein: 2.6, sodium: 5, potassium: 79, phosphorus: 150, fluid: 70, fat: 1, carbs: 26 } },
            { name: 'White rice (Dry)', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 365, protein: 7, sodium: 5, potassium: 115, phosphorus: 115, fluid: 12, fat: 0.7, carbs: 80 } },
            { name: 'Brown rice (Dry)', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 367, protein: 7.5, sodium: 7, potassium: 223, phosphorus: 264, fluid: 10, fat: 2.8, carbs: 77 } },
            { name: 'Quinoa (Dry)', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 368, protein: 14, sodium: 5, potassium: 563, phosphorus: 457, fluid: 13, fat: 6, carbs: 64 } },
            { name: 'Oats (Dry)', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 389, protein: 17, sodium: 2, potassium: 429, phosphorus: 523, fluid: 8, fat: 7, carbs: 66 } },
            { name: 'White Bread', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 265, protein: 9, sodium: 491, potassium: 115, phosphorus: 105, fluid: 36, fat: 3.2, carbs: 49 } },
            { name: 'Whole wheat bread', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 247, protein: 13, sodium: 400, potassium: 248, phosphorus: 212, fluid: 38, fat: 3.4, carbs: 41 } },
            { name: 'Sourdough bread', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 289, protein: 12, sodium: 613, potassium: 115, phosphorus: 105, fluid: 37, fat: 1.2, carbs: 56 } },
            { name: 'Tortilla (Flour)', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 297, protein: 8, sodium: 763, potassium: 115, phosphorus: 153, fluid: 30, fat: 7, carbs: 50 } },
            { name: 'All-purpose flour', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 364, protein: 10, sodium: 2, potassium: 107, phosphorus: 108, fluid: 12, fat: 1, carbs: 76 } },
            { name: 'Breadcrumbs', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 395, protein: 13, sodium: 732, potassium: 152, phosphorus: 115, fluid: 5, fat: 5, carbs: 73 } },
            { name: 'Cornstarch', category: 'Grains & Carbs', brand: 'Generic', nutrients: { calories: 381, protein: 0.3, sodium: 9, potassium: 3, phosphorus: 13, fluid: 13, fat: 0.1, carbs: 91 } },

            // 7️⃣ OILS & FATS
            { name: 'Olive Oil', category: 'Oils & Fats', brand: 'Generic', nutrients: { calories: 884, protein: 0, sodium: 2, potassium: 1, phosphorus: 0, fluid: 0, fat: 100, carbs: 0 } },
            { name: 'Vegetable oil', category: 'Oils & Fats', brand: 'Generic', nutrients: { calories: 884, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0, fat: 100, carbs: 0 } },
            { name: 'Canola oil', category: 'Oils & Fats', brand: 'Generic', nutrients: { calories: 884, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0, fat: 100, carbs: 0 } },
            { name: 'Sesame oil', category: 'Oils & Fats', brand: 'Generic', nutrients: { calories: 884, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0, fat: 100, carbs: 0 } },
            { name: 'Coconut oil', category: 'Oils & Fats', brand: 'Generic', nutrients: { calories: 862, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0, fat: 100, carbs: 0 } },
            { name: 'Butter (Unsalted)', category: 'Oils & Fats', brand: 'Generic', nutrients: { calories: 717, protein: 0.9, sodium: 11, potassium: 24, phosphorus: 24, fluid: 16, fat: 81, carbs: 0.1 } },
            { name: 'Butter (Salted)', category: 'Oils & Fats', brand: 'Generic', nutrients: { calories: 717, protein: 0.9, sodium: 576, potassium: 24, phosphorus: 24, fluid: 16, fat: 81, carbs: 0.1 } },
            { name: 'Ghee', category: 'Oils & Fats', brand: 'Generic', nutrients: { calories: 900, protein: 0, sodium: 0, potassium: 0, phosphorus: 0, fluid: 0, fat: 99, carbs: 0 } },

            // 8️⃣ SAUCES, CONDIMENTS & PANTRY
            { name: 'Tomato Sauce (Marinara)', category: 'Canned Goods', brand: 'Generic', nutrients: { calories: 50, protein: 1.4, sodium: 350, potassium: 331, phosphorus: 25, fluid: 89, fat: 1.5, carbs: 8 } },
            { name: 'Soy sauce', category: 'Condiments', brand: 'Generic', nutrients: { calories: 53, protein: 8, sodium: 5493, potassium: 212, phosphorus: 130, fluid: 70, fat: 0.6, carbs: 4.9 } },
            { name: 'Soy Sauce', category: 'Condiments', brand: 'Generic', nutrients: { calories: 53, protein: 8, sodium: 5493, potassium: 212, phosphorus: 130, fluid: 70, fat: 0.6, carbs: 4.9 } },
            { name: 'Tamari', category: 'Condiments', brand: 'Generic', nutrients: { calories: 60, protein: 11, sodium: 4966, potassium: 213, phosphorus: 130, fluid: 70, fat: 0, carbs: 5.6 } },
            { name: 'Fish sauce', category: 'Condiments', brand: 'Generic', nutrients: { calories: 35, protein: 5.1, sodium: 7851, potassium: 210, phosphorus: 101, fluid: 72, fat: 0, carbs: 3.6 } },
            { name: 'Oyster sauce', category: 'Condiments', brand: 'Generic', nutrients: { calories: 51, protein: 0.6, sodium: 1167, potassium: 13, phosphorus: 12, fluid: 74, fat: 0, carbs: 13 } },
            { name: 'Hoisin sauce', category: 'Condiments', brand: 'Generic', nutrients: { calories: 220, protein: 4, sodium: 1290, potassium: 95, phosphorus: 65, fluid: 40, fat: 5, carbs: 38 } },
            { name: 'Hot sauce', category: 'Condiments', brand: 'Generic', nutrients: { calories: 11, protein: 0.4, sodium: 920, potassium: 52, phosphorus: 10, fluid: 94, fat: 0.4, carbs: 2 } },
            { name: 'Worcestershire sauce', category: 'Condiments', brand: 'Generic', nutrients: { calories: 78, protein: 0, sodium: 980, potassium: 149, phosphorus: 19, fluid: 74, fat: 0, carbs: 19 } },
            { name: 'Ketchup', category: 'Condiments', brand: 'Generic', nutrients: { calories: 101, protein: 1.7, sodium: 907, potassium: 281, phosphorus: 39, fluid: 69, fat: 0.1, carbs: 25 } },
            { name: 'Mayonnaise', category: 'Condiments', brand: 'Generic', nutrients: { calories: 680, protein: 1, sodium: 635, potassium: 25, phosphorus: 29, fluid: 15, fat: 75, carbs: 0.7 } },
            { name: 'Mustard', category: 'Condiments', brand: 'Generic', nutrients: { calories: 66, protein: 4.4, sodium: 1135, potassium: 152, phosphorus: 113, fluid: 79, fat: 4, carbs: 5.8 } },
            { name: 'Vinegar (Balsamic)', category: 'Condiments', brand: 'Generic', nutrients: { calories: 88, protein: 0.5, sodium: 23, potassium: 112, phosphorus: 19, fluid: 76, fat: 0, carbs: 17 } },
            { name: 'Vinegar (Rice)', category: 'Condiments', brand: 'Generic', nutrients: { calories: 18, protein: 0, sodium: 0, potassium: 2, phosphorus: 6, fluid: 93, fat: 0, carbs: 0 } },
            { name: 'Vinegar (Apple cider)', category: 'Condiments', brand: 'Generic', nutrients: { calories: 22, protein: 0, sodium: 5, potassium: 73, phosphorus: 8, fluid: 94, fat: 0, carbs: 0.9 } },
            { name: 'Honey', category: 'Condiments', brand: 'Generic', nutrients: { calories: 304, protein: 0.3, sodium: 4, potassium: 52, phosphorus: 4, fluid: 17, fat: 0, carbs: 82 } },
            { name: 'Maple syrup', category: 'Condiments', brand: 'Generic', nutrients: { calories: 260, protein: 0, sodium: 12, potassium: 212, phosphorus: 2, fluid: 32, fat: 0.1, carbs: 67 } },
            { name: 'Chicken broth', category: 'Condiments', brand: 'Generic', nutrients: { calories: 10, protein: 0.7, sodium: 880, potassium: 14, phosphorus: 29, fluid: 98, fat: 0.5, carbs: 1.4 } },
            { name: 'Beef broth', category: 'Condiments', brand: 'Generic', nutrients: { calories: 12, protein: 1.5, sodium: 892, potassium: 100, phosphorus: 24, fluid: 98, fat: 0.4, carbs: 0.8 } },
            { name: 'Coconut milk (Canned)', category: 'Condiments', brand: 'Generic', nutrients: { calories: 197, protein: 2, sodium: 13, potassium: 263, phosphorus: 100, fluid: 68, fat: 21, carbs: 2.8 } },
            { name: 'Lemon juice', category: 'Condiments', brand: 'Generic', nutrients: { calories: 22, protein: 0.4, sodium: 1, potassium: 103, phosphorus: 9, fluid: 93, fat: 0.2, carbs: 6.9 } },
            { name: 'Lime juice', category: 'Condiments', brand: 'Generic', nutrients: { calories: 25, protein: 0.4, sodium: 2, potassium: 117, phosphorus: 14, fluid: 92, fat: 0.1, carbs: 8.4 } },

            // 9️⃣ SPICES & HERBS
            { name: 'Salt', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 0, protein: 0, sodium: 38758, potassium: 8, phosphorus: 0, fluid: 0, fat: 0, carbs: 0 } },
            { name: 'Black pepper', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 251, protein: 10, sodium: 20, potassium: 1329, phosphorus: 158, fluid: 12, fat: 3.3, carbs: 64 } },
            { name: 'White pepper', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 296, protein: 10, sodium: 5, potassium: 73, phosphorus: 176, fluid: 11, fat: 2.1, carbs: 69 } },
            { name: 'Paprika', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 289, protein: 14, sodium: 68, potassium: 2344, phosphorus: 314, fluid: 11, fat: 13, carbs: 54 } },
            { name: 'Cumin', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 375, protein: 18, sodium: 168, potassium: 1788, phosphorus: 499, fluid: 9, fat: 22, carbs: 44 } },
            { name: 'Turmeric', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 354, protein: 8, sodium: 38, potassium: 2526, phosphorus: 299, fluid: 11, fat: 10, carbs: 65 } },
            { name: 'Ginger (Ground)', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 335, protein: 8.9, sodium: 27, potassium: 1342, phosphorus: 168, fluid: 10, fat: 4.2, carbs: 72 } },
            { name: 'Ginger', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 80, protein: 1.8, sodium: 13, potassium: 415, phosphorus: 34, fluid: 79, fat: 0.8, carbs: 18 } },
            { name: 'Cinnamon', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 247, protein: 4, sodium: 10, potassium: 431, phosphorus: 64, fluid: 11, fat: 1.2, carbs: 81 } },
            { name: 'Oregano', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 265, protein: 9, sodium: 25, potassium: 1260, phosphorus: 148, fluid: 9, fat: 4.3, carbs: 69 } },
            { name: 'Basil', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 22, protein: 3.2, sodium: 4, potassium: 295, phosphorus: 56, fluid: 92, fat: 0.6, carbs: 2.7 } },
            { name: 'Cilantro', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 23, protein: 2.1, sodium: 46, potassium: 521, phosphorus: 48, fluid: 92, fat: 0.5, carbs: 3.7 } },
            { name: 'Parsley', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 36, protein: 3, sodium: 56, potassium: 554, phosphorus: 58, fluid: 88, fat: 0.8, carbs: 6.3 } },
            { name: 'Thyme', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 101, protein: 5.6, sodium: 9, potassium: 609, phosphorus: 106, fluid: 65, fat: 1.7, carbs: 24 } },
            { name: 'Rosemary', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 131, protein: 3.3, sodium: 26, potassium: 668, phosphorus: 66, fluid: 61, fat: 5.9, carbs: 21 } },
            { name: 'Red pepper flakes', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 314, protein: 12, sodium: 68, potassium: 1950, phosphorus: 293, fluid: 10, fat: 17, carbs: 57 } },
            { name: 'Garlic powder', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 331, protein: 16, sodium: 60, potassium: 1193, phosphorus: 303, fluid: 6, fat: 0.7, carbs: 73 } },
            { name: 'Onion powder', category: 'Spices & Herbs', brand: 'Generic', nutrients: { calories: 341, protein: 10, sodium: 79, potassium: 985, phosphorus: 210, fluid: 5, fat: 1.1, carbs: 80 } },

            // 🔟 NUTS & SEEDS
            { name: 'Walnuts', category: 'Nuts & Seeds', brand: 'Generic', nutrients: { calories: 654, protein: 15, sodium: 2, potassium: 441, phosphorus: 346, fluid: 4, fat: 65, carbs: 14 } },
            { name: 'Almonds', category: 'Nuts & Seeds', brand: 'Generic', nutrients: { calories: 579, protein: 21, sodium: 1, potassium: 733, phosphorus: 481, fluid: 4, fat: 50, carbs: 22 } },
            { name: 'Cashews', category: 'Nuts & Seeds', brand: 'Generic', nutrients: { calories: 553, protein: 18, sodium: 12, potassium: 660, phosphorus: 593, fluid: 5, fat: 44, carbs: 30 } },
            { name: 'Peanuts', category: 'Nuts & Seeds', brand: 'Generic', nutrients: { calories: 567, protein: 26, sodium: 18, potassium: 705, phosphorus: 376, fluid: 4, fat: 49, carbs: 16 } },
            { name: 'Peanut butter', category: 'Nuts & Seeds', brand: 'Generic', nutrients: { calories: 588, protein: 25, sodium: 459, potassium: 649, phosphorus: 335, fluid: 1, fat: 50, carbs: 20 } },
            { name: 'Sesame seeds', category: 'Nuts & Seeds', brand: 'Generic', nutrients: { calories: 573, protein: 18, sodium: 11, potassium: 468, phosphorus: 629, fluid: 5, fat: 50, carbs: 23 } },
            { name: 'Chia seeds', category: 'Nuts & Seeds', brand: 'Generic', nutrients: { calories: 486, protein: 17, sodium: 16, potassium: 407, phosphorus: 860, fluid: 6, fat: 31, carbs: 42 } },
            { name: 'Pumpkin seeds', category: 'Nuts & Seeds', brand: 'Generic', nutrients: { calories: 559, protein: 30, sodium: 7, potassium: 809, phosphorus: 1233, fluid: 5, fat: 49, carbs: 11 } },
            { name: 'Sunflower seeds', category: 'Nuts & Seeds', brand: 'Generic', nutrients: { calories: 584, protein: 21, sodium: 9, potassium: 645, phosphorus: 660, fluid: 5, fat: 51, carbs: 20 } },
        ];

        // 8️⃣ RECIPES (Suggested Meals - Variety & Scale - 100+)
        const baseRecipes = [
            { title: 'Stir-Fry with Broccoli', ingredients: ['Broccoli', 'Soy Sauce', 'White rice (Dry)'] },
            { title: 'Marinara Pasta', ingredients: ['Spaghetti (Dry)', 'Tomato Sauce (Marinara)', 'Garlic', 'Olive Oil'] },
            { title: 'Quinoa Bowl', ingredients: ['Quinoa (Dry)', 'Tomato (Roma)', 'Lime'] },
            { title: 'Baked Salmon with Veggies', ingredients: ['Salmon', 'Asparagus', 'Olive Oil'] },
            { title: 'Scrambled Eggs with Bread', ingredients: ['Egg (Whole)', 'Spinach', 'Sourdough bread'] },
            { title: 'Beef Burger Plate', ingredients: ['Ground Beef (90/10)', 'White Bread', 'Onion (Yellow)'] },
            { title: 'Greek Slaw', ingredients: ['Romaine lettuce', 'Cucumber', 'Lemon', 'Olive Oil'] },
            { title: 'Fruit Medley', ingredients: ['Apple', 'Banana', 'Blueberry', 'Strawberry'] },
            { title: 'Oatmeal morning', ingredients: ['Oats (Dry)', 'Walnuts', 'Banana', 'Honey'] },
            { title: 'Turkey Sandwich', ingredients: ['Turkey', 'White Bread', 'Romaine lettuce', 'Tomato (Roma)'] }
        ];

        const PROTEINS = ['Chicken breast', 'Tofu (Firm)', 'Shrimp', 'Beef steak', 'Turkey'];
        const VEGGIES = ['Spinach', 'Kale', 'Zucchini', 'Bell pepper (Red)', 'Mushrooms (White)', 'Celery'];
        const GRAINS = ['Brown rice (Dry)', 'White rice (Dry)', 'Quinoa (Dry)', 'Penne (Dry)'];

        const recipes: any[] = [...baseRecipes];
        const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        const variants: any[] = [];
        const variantSuffixes = ['fresh', 'raw', 'cooked', 'low sodium', 'unsalted', 'classic', 'premium', 'house'];
        if (includeSynthetic && multiplier > 1) {
            for (const food of foods) {
                for (let i = 1; i < multiplier; i++) {
                    const suffix = variantSuffixes[(i - 1) % variantSuffixes.length];
                    const adjust = 1 + ((i % 7) - 3) * 0.015; // +/- 4.5% max
                    variants.push({
                        ...food,
                        name: `${food.name} (${suffix})`,
                        brand: food.brand === 'Generic' ? `Global Catalog ${suffix}` : food.brand,
                        nutrients: {
                            calories: Math.max(0, Math.round((food.nutrients.calories || 0) * adjust)),
                            protein: Number(((food.nutrients.protein || 0) * adjust).toFixed(2)),
                            sodium: Math.max(0, Math.round((food.nutrients.sodium || 0) * adjust)),
                            potassium: Math.max(0, Math.round((food.nutrients.potassium || 0) * adjust)),
                            phosphorus: Math.max(0, Math.round((food.nutrients.phosphorus || 0) * adjust)),
                            fluid: Math.max(0, Math.round((food.nutrients.fluid || 0) * adjust)),
                            fat: Number(((food.nutrients.fat || 0) * adjust).toFixed(2)),
                            carbs: Number(((food.nutrients.carbs || 0) * adjust).toFixed(2)),
                        },
                    });
                }
            }
        }
        const seedRows = foods.concat(variants);
        console.log(`--- STARTING PRODUCTION-GRADE SEEDING VIA API offset=${offset} limit=${limit} total=${seedRows.length} synthetic=${includeSynthetic ? 'on' : 'off'} multiplier=${multiplier} ---`);
        // Generate variations to hit 100+
        for (let i = 0; i < 90; i++) {
            const protein = PROTEINS[i % PROTEINS.length];
            const veggie = VEGGIES[i % VEGGIES.length];
            const grain = GRAINS[i % GRAINS.length];
            recipes.push({
                title: `${protein} & ${veggie} with ${grain}`,
                servings: (i % 3) + 1,
                instructions: `Sauté ${protein} and ${veggie}, serve with ${grain}.`,
                ingredients: [protein, veggie, grain]
            });
        }

        // Assign to the first user found (optional for recipes)
        const firstUser = await db.user.findFirst();

        if (reset && offset === 0) {
            await db.foodItem.deleteMany({});
            await db.ingredient.deleteMany({});
            await db.recipe.deleteMany({});
        }

        const batch = seedRows.slice(offset, offset + limit);
        console.log(`Seeding ${batch.length} items...`);

        for (const food of batch) {
            const data = {
                name: food.name,
                category: food.category,
                brand: food.brand,
                nutrients: JSON.stringify(food.nutrients),
                servingSizes: JSON.stringify([{ name: '100g', weightG: 100 }, { name: '1 serving', weightG: 85 }]),
                source: 'SEED'
            };

            const seedBarcode = `${slug(food.name)}_${slug(food.category || 'food')}_api_seed`;
            await db.foodItem.upsert({
                where: { barcode: seedBarcode },
                update: data,
                create: { ...data, barcode: seedBarcode }
            });

            const existingIng = await db.ingredient.findFirst({ where: { name: food.name } });
            if (!existingIng) {
                await db.ingredient.create({
                    data: {
                        name: food.name,
                        // @ts-ignore - Handle possible type out-of-sync
                        category: food.category,
                        nutrients: data.nutrients,
                        servingSizes: data.servingSizes,
                        source: 'SEED'
                    }
                });
            }
        }

        let recipeCount = 0;
        if (firstUser) {
            console.log(`Seeding ${recipes.length} recipes...`);
            for (const recipe of recipes) {
                const existingRecipe = await db.recipe.findFirst({ where: { title: recipe.title, userId: firstUser.id } });
                if (!existingRecipe) {
                    const createdRecipe = await db.recipe.create({
                        data: {
                            title: recipe.title,
                            userId: firstUser.id,
                            servings: recipe.servings,
                            instructions: recipe.instructions
                        }
                    });

                    for (const ingName of recipe.ingredients) {
                        const ing = await db.ingredient.findFirst({ where: { name: ingName } });
                        if (ing) {
                            await db.recipeIngredient.create({
                                data: {
                                    recipeId: createdRecipe.id,
                                    ingredientId: ing.id,
                                    quantity: 1,
                                    unit: 'unit',
                                    gramsEquivalent: 100
                                }
                            });
                        }
                    }
                    recipeCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            foodItemsSeeded: batch.length,
            recipesSeeded: recipeCount,
            offset,
            limit,
            totalFoods: seedRows.length,
            synthetic: includeSynthetic,
            multiplier,
            nextOffset: offset + limit < seedRows.length ? offset + limit : null,
            message: `Successfully seeded ${batch.length} items and ${recipeCount} recipes.`
        });
    } catch (error) {
        console.error('Seeding error:', error);
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
