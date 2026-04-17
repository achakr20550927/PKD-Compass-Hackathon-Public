/**
 * Global Nutrition Utilities
 * Handles unit conversion, nutritional scaling, and food densities.
 */

export interface NutrientSnapshot {
    calories: number;
    protein: number;
    sodium: number;
    potassium: number;
    phosphorus: number;
    fluid: number;
    fat?: number;
    carbs?: number;
}

type ServingSize = { name: string, weightG: number };

export const UNIT_WEIGHTS: Record<string, number> = {
    // Volume to weight (water baseline, 1ml = 1g)
    'ml': 1,
    'milliliter': 1,
    'milliliters': 1,
    'oz': 28.35,
    'ounce': 28.35,
    'ounces': 28.35,
    'fl oz': 29.57,
    'fluid ounce': 29.57,
    'fluid ounces': 29.57,

    // Cooking measure defaults (based on average densities)
    'tsp': 5,
    'teaspoon': 5,
    'teaspoons': 5,
    'tbsp': 15,
    'tablespoon': 15,
    'tablespoons': 15,
    'cup': 240,
    'cups': 240,

    // Weight
    'g': 1,
    'gram': 1,
    'grams': 1,
    'kg': 1000,
    'kilogram': 1000,
    'lb': 453.59,
    'pound': 453.59,
    'pounds': 453.59,

    // Piece based
    'piece': 85, // Default generic portion
    'pieces': 85,
    'slice': 30,
    'slices': 30,
    'clove': 4,
    'cloves': 4,
    'pinch': 0.5,
    'whole': 100,
};

/**
 * Normalizes a unit name for matching.
 */
export function normalizeUnit(unit: string): string {
    const u = unit.toLowerCase().trim();
    if (u.endsWith('.')) return u.slice(0, -1);
    return u;
}

function singularize(value: string) {
    const unit = normalizeUnit(value);
    const aliases: Record<string, string> = {
        tablespoons: 'tablespoon',
        teaspoons: 'teaspoon',
        ounces: 'ounce',
        pounds: 'pound',
        grams: 'gram',
        milliliters: 'milliliter',
        pieces: 'piece',
        slices: 'slice',
        cloves: 'clove',
        cups: 'cup'
    };
    return aliases[unit] || (unit.endsWith('s') ? unit.slice(0, -1) : unit);
}

function parseServingName(name: string) {
    const normalized = normalizeUnit(name);
    const compact = normalized.replace(/\([^)]*\)/g, '').trim();
    const match = compact.match(/^([\d.]+)\s*([a-z ]+)$/i);
    if (!match) {
        return { quantity: 1, unit: singularize(compact) };
    }
    return {
        quantity: parseFloat(match[1]) || 1,
        unit: singularize(match[2].trim())
    };
}

/**
 * Gets the gram weight for a given quantity and unit.
 * Uses specific food metadata if available, otherwise falls back to defaults.
 */
export function getGramsForQuantity(quantity: number, unit: string, ingredientServingSizes?: ServingSize[]): number {
    const normUnit = singularize(unit);

    // 1. Check if the specific ingredient has this unit defined in its database record
    if (ingredientServingSizes) {
        const parsed = ingredientServingSizes
            .map((serving) => ({
                serving,
                parsed: parseServingName(serving.name)
            }));

        const exactMatch = parsed.find(({ parsed }) => parsed.unit === normUnit);
        if (exactMatch) {
            const gramsPerUnit = exactMatch.serving.weightG / Math.max(exactMatch.parsed.quantity, 0.0001);
            return gramsPerUnit * quantity;
        }

        const partialMatch = parsed.find(({ serving, parsed }) =>
            parsed.unit.includes(normUnit) || singularize(serving.name).includes(normUnit)
        );
        if (partialMatch) {
            const gramsPerUnit = partialMatch.serving.weightG / Math.max(partialMatch.parsed.quantity, 0.0001);
            return gramsPerUnit * quantity;
        }
    }

    // 2. Fall back to global unit defaults
    const defaultWeight = UNIT_WEIGHTS[normUnit];
    if (defaultWeight !== undefined) return defaultWeight * quantity;

    // 3. Last resort: Treat as "units" (e.g. "1 egg" -> use first serving size if available)
    if (ingredientServingSizes && ingredientServingSizes.length > 0) {
        return ingredientServingSizes[0].weightG * quantity;
    }

    return quantity * 100; // Complete fallback: assume 1 unit = 100g
}

/**
 * Scales nutrients based on quantity and unit.
 * nutrientsPer100g: The base nutrients for 100g of the item.
 */
export function scaleNutrients(
    nutrientsPer100g: NutrientSnapshot,
    quantity: number,
    unit: string,
    servingSizes?: ServingSize[]
): NutrientSnapshot {
    const totalGrams = getGramsForQuantity(quantity, unit, servingSizes);
    const ratio = totalGrams / 100;

    return {
        calories: (nutrientsPer100g.calories || 0) * ratio,
        protein: (nutrientsPer100g.protein || 0) * ratio,
        sodium: (nutrientsPer100g.sodium || 0) * ratio,
        potassium: (nutrientsPer100g.potassium || 0) * ratio,
        phosphorus: (nutrientsPer100g.phosphorus || 0) * ratio,
        fluid: (nutrientsPer100g.fluid || 0) * ratio,
        fat: (nutrientsPer100g.fat || 0) * ratio,
        carbs: (nutrientsPer100g.carbs || 0) * ratio,
    };
}
