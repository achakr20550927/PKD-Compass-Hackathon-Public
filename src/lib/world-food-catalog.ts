export type CatalogFoodItem = {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  type: 'FOOD' | 'RECIPE' | 'MEAL';
  nutrients: {
    calories: number;
    protein: number;
    sodium: number;
    potassium: number;
    phosphorus: number;
    fluid: number;
    fat?: number;
    carbs?: number;
  };
  servingSizes: { name: string; weightG: number }[];
  ingredients?: string[];
};

const cuisines = [
  'Italian','Mexican','Indian','Japanese','Chinese','Thai','Korean','Vietnamese','Greek','Turkish','Lebanese','Moroccan','Ethiopian','Nigerian','Brazilian','Peruvian','Argentinian','American','French','Spanish','Portuguese','German','Polish','Russian','Ukrainian','Georgian','Persian','Pakistani','Bangladeshi','Sri Lankan','Indonesian','Malaysian','Filipino','Singaporean','Australian','Caribbean','Jamaican','Cuban','Dominican','Colombian','Chilean'
];

const proteins = [
  'Chicken','Turkey','Salmon','Shrimp','Tofu','Lentils','Chickpeas','Eggs','Beef','Pork','Cod','Tilapia','Tuna','Tempeh','Black Beans','White Beans'
];

const vegetables = [
  'Broccoli','Spinach','Kale','Zucchini','Bell Pepper','Carrots','Cauliflower','Cabbage','Celery','Peas','Green Beans','Mushrooms','Eggplant','Cucumber','Tomatoes','Onions'
];

const grains = [
  'Rice','Brown Rice','Jasmine Rice','Basmati Rice','Quinoa','Couscous','Pasta','Noodles','Barley','Polenta','Flatbread','Potatoes','Sweet Potatoes','Oats'
];

const sauces = [
  'Herb Sauce','Garlic Sauce','Lemon Dressing','Tomato Sauce','Coconut Curry','Soy Glaze','Yogurt Sauce','Chili Sauce','Tahini Drizzle','Ginger Broth','Olive Oil Dressing','Sesame Dressing'
];

const styles = [
  'Bowl','Skillet','Stir-Fry','Roast','Bake','Soup','Stew','Salad','Plate','Wrap','Pilaf','Curry','Pasta','Tacos','Noodle Bowl','Rice Plate','Hash','Sauté'
];

const breakfastBases = [
  'Breakfast Burrito','Savory Oat Bowl','Yogurt Parfait','Fruit & Grain Bowl','Egg Scramble Plate','Toast & Eggs Combo','Breakfast Rice Bowl','Morning Wrap'
];

const popularDishes = [
  'Chicken Tikka Masala','Pad Thai','Beef Bulgogi Bowl','Shrimp Fried Rice','Vegetable Biryani','Lemon Herb Salmon Plate','Turkey Chili','Greek Chicken Bowl','Mushroom Risotto','Tofu Teriyaki Bowl','Chicken Fajita Plate','Pasta Primavera','Chicken Shawarma Bowl','Jollof Rice Plate','Feijoada Bowl','Peruvian Chicken Rice','Soba Noodle Bowl','Pho-Inspired Noodle Soup','Ramen-Style Broth Bowl','Couscous Vegetable Tagine','Stuffed Pepper Plate','Mediterranean Mezze Bowl','Chicken Adobo Rice Plate','Bibimbap-Inspired Bowl','Paella-Inspired Seafood Plate','Tomato Basil Pasta','Tuna Nicoise Bowl','Lentil Stew Plate','Chana Masala Bowl','Veggie Sushi Bowl'
];

const mealDescriptors = [
  'Balanced Meal','Low Sodium Plate','Renal Friendly Plate','Family Style Meal','Quick Lunch','Dinner Special','Protein Forward Meal','Comfort Meal','Classic Plate','Chef Special','Home Style Meal','Daily Meal'
];

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function makeNutrients(seed: number, baseCalories: number, proteinBase: number, carbBase: number, fatBase: number, fluidBase: number) {
  return {
    calories: baseCalories + (seed % 11) * 18,
    protein: Number((proteinBase + (seed % 7) * 1.7).toFixed(1)),
    sodium: 120 + (seed % 13) * 48,
    potassium: 180 + (seed % 17) * 42,
    phosphorus: 90 + (seed % 11) * 28,
    fluid: fluidBase + (seed % 5) * 18,
    fat: Number((fatBase + (seed % 6) * 1.9).toFixed(1)),
    carbs: Number((carbBase + (seed % 9) * 3.4).toFixed(1)),
  };
}

function buildRecipeCatalog() {
  const out: CatalogFoodItem[] = [];
  let idx = 1;

  for (const dish of popularDishes) {
    const protein = proteins[idx % proteins.length];
    const vegetable = vegetables[idx % vegetables.length];
    const grain = grains[idx % grains.length];
    const sauce = sauces[idx % sauces.length];
    out.push({
      id: `world_recipe_featured_${idx}`,
      name: dish,
      brand: null,
      category: 'Recipe',
      type: 'RECIPE',
      nutrients: makeNutrients(idx, 320, 18, 28, 9, 70),
      servingSizes: [{ name: '1 serving', weightG: 320 }],
      ingredients: [protein, vegetable, grain, sauce, 'Herbs & seasoning']
    });
    idx += 1;
  }

  for (const cuisine of cuisines) {
    for (const style of styles) {
      for (const protein of proteins) {
        const vegetable = vegetables[idx % vegetables.length];
        const grain = grains[(idx + 3) % grains.length];
        const sauce = sauces[(idx + 5) % sauces.length];
        out.push({
          id: `world_recipe_${idx}`,
          name: `${cuisine} ${protein} ${style}`,
          brand: null,
          category: 'Recipe',
          type: 'RECIPE',
          nutrients: makeNutrients(idx, 290, 17, 24, 8, 64),
          servingSizes: [{ name: '1 serving', weightG: 300 }],
          ingredients: [protein, vegetable, grain, sauce, `${cuisine} spice blend`]
        });
        idx += 1;
      }
    }
  }

  for (const cuisine of cuisines) {
    for (const breakfast of breakfastBases) {
      const protein = proteins[idx % proteins.length];
      const grain = grains[idx % grains.length];
      const fruit = ['Apple','Banana','Blueberries','Mango','Peach','Pear'][idx % 6];
      out.push({
        id: `world_recipe_breakfast_${idx}`,
        name: `${cuisine} ${breakfast}`,
        brand: null,
        category: 'Recipe',
        type: 'RECIPE',
        nutrients: makeNutrients(idx, 240, 12, 31, 7, 82),
        servingSizes: [{ name: '1 serving', weightG: 280 }],
        ingredients: [protein, grain, fruit, sauces[idx % sauces.length]]
      });
      idx += 1;
    }
  }

  return out;
}

function buildMealCatalog() {
  const out: CatalogFoodItem[] = [];
  let idx = 1;

  for (const cuisine of cuisines) {
    for (const descriptor of mealDescriptors) {
      for (const protein of proteins) {
        const veg1 = vegetables[idx % vegetables.length];
        const veg2 = vegetables[(idx + 4) % vegetables.length];
        const grain = grains[idx % grains.length];
        out.push({
          id: `world_meal_${idx}`,
          name: `${cuisine} ${protein} ${descriptor}`,
          brand: 'Meal Template (Global)',
          category: 'Meals',
          type: 'MEAL',
          nutrients: makeNutrients(idx, 410, 22, 34, 12, 96),
          servingSizes: [{ name: '1 meal', weightG: 420 }],
          ingredients: [protein, veg1, veg2, grain, sauces[idx % sauces.length]]
        });
        idx += 1;
      }
    }
  }

  for (const dish of popularDishes) {
    const protein = proteins[idx % proteins.length];
    const grain = grains[idx % grains.length];
    const vegetable = vegetables[idx % vegetables.length];
    out.push({
      id: `world_meal_featured_${idx}`,
      name: `${dish} Meal`,
      brand: 'Meal Template (Global)',
      category: 'Meals',
      type: 'MEAL',
      nutrients: makeNutrients(idx, 430, 24, 36, 13, 90),
      servingSizes: [{ name: '1 meal', weightG: 430 }],
      ingredients: [protein, vegetable, grain, sauces[idx % sauces.length], 'Side salad or fruit']
    });
    idx += 1;
  }

  return out;
}

function buildWorldFoodCatalog() {
  const recipes = buildRecipeCatalog();
  const meals = buildMealCatalog();
  const all = [...recipes, ...meals];
  return { recipes, meals, all };
}

type WorldFoodCatalog = ReturnType<typeof buildWorldFoodCatalog>;

declare global {
  // eslint-disable-next-line no-var
  var __worldFoodCatalog: WorldFoodCatalog | undefined;
}

function getCatalog() {
  if (!globalThis.__worldFoodCatalog) {
    globalThis.__worldFoodCatalog = buildWorldFoodCatalog();
  }
  return globalThis.__worldFoodCatalog;
}

export function getWorldRecipes() {
  return getCatalog().recipes;
}

export function getWorldMeals() {
  return getCatalog().meals;
}

export function searchWorldFoodCatalog(args: { query: string; type: string; category?: string | null }) {
  const { query, type, category } = args;
  const q = query.trim().toLowerCase();
  let source = getCatalog().all;
  if (type === 'recipes') source = getCatalog().recipes;
  else if (type === 'meals') source = getCatalog().meals;

  return source.filter((item) => {
    if (category && category.length > 0) {
      const hay = `${item.category || ''} ${item.name} ${(item.ingredients || []).join(' ')}`.toLowerCase();
      if (!hay.includes(category.toLowerCase())) return false;
    }
    if (!q) return true;
    const hay = `${item.name} ${item.category || ''} ${(item.ingredients || []).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
}
