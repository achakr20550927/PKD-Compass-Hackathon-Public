/**
 * Unit Converter Utility for Food Tracker
 * Handles conversions between weight (g) and volume (ml) and common kitchen units.
 */

export type UnitType = 'WEIGHT' | 'VOLUME' | 'PIECE';

export interface UnitDefinition {
    name: string;
    abbreviation: string;
    type: UnitType;
    baseValue: number; // In grams for WEIGHT, mL for VOLUME, or relative for PIECE
}

export const UNITS: Record<string, UnitDefinition> = {
    g: { name: 'grams', abbreviation: 'g', type: 'WEIGHT', baseValue: 1 },
    kg: { name: 'kilograms', abbreviation: 'kg', type: 'WEIGHT', baseValue: 1000 },
    oz: { name: 'ounces', abbreviation: 'oz', type: 'WEIGHT', baseValue: 28.3495 },
    lb: { name: 'pounds', abbreviation: 'lb', type: 'WEIGHT', baseValue: 453.592 },
    ml: { name: 'milliliters', abbreviation: 'ml', type: 'VOLUME', baseValue: 1 },
    l: { name: 'liters', abbreviation: 'l', type: 'VOLUME', baseValue: 1000 },
    tsp: { name: 'teaspoon', abbreviation: 'tsp', type: 'VOLUME', baseValue: 4.92892 },
    tbsp: { name: 'tablespoon', abbreviation: 'tbsp', type: 'VOLUME', baseValue: 14.7868 },
    cup: { name: 'cup', abbreviation: 'cup', type: 'VOLUME', baseValue: 240 },
    fl_oz: { name: 'fluid ounce', abbreviation: 'fl oz', type: 'VOLUME', baseValue: 29.5735 },
    piece: { name: 'piece', abbreviation: 'pc', type: 'PIECE', baseValue: 1 },
    serving: { name: 'serving', abbreviation: 'serv', type: 'PIECE', baseValue: 1 },
};

/**
 * Converts a quantity from one unit to another within the same type.
 * For WEIGHT <-> VOLUME, it requires a density (g/ml). Default is 1.0 (water).
 */
export function convertUnit(
    quantity: number,
    fromUnit: string,
    toUnit: string,
    density: number = 1.0 // g/ml
): number {
    const from = UNITS[fromUnit.toLowerCase()] || UNITS['g'];
    const to = UNITS[toUnit.toLowerCase()] || UNITS['g'];

    // Base value in grams or ml
    let baseValue = quantity * from.baseValue;

    // Handle type conversion (WEIGHT <-> VOLUME)
    if (from.type === 'WEIGHT' && to.type === 'VOLUME') {
        baseValue = baseValue / density; // grams to ml
    } else if (from.type === 'VOLUME' && to.type === 'WEIGHT') {
        baseValue = baseValue * density; // ml to grams
    } else if (from.type !== to.type && from.type !== 'PIECE' && to.type !== 'PIECE') {
        // Cannot convert between unrelated types without specific logic
        return quantity;
    }

    return baseValue / to.baseValue;
}

/**
 * Calculates grams for a given quantity and unit.
 */
export function toGrams(quantity: number, unit: string, density: number = 1.0): number {
    return convertUnit(quantity, unit, 'g', density);
}
