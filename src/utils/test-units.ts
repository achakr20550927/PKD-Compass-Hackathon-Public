import { convertUnit, toGrams } from './unit-converter';

function test() {
    console.log('--- Testing Unit Converter ---');

    // Test 1: g to g
    const gToG = toGrams(100, 'g');
    console.log('100g to grams:', gToG, gToG === 100 ? '✅' : '❌');

    // Test 2: kg to g
    const kgToG = toGrams(2, 'kg');
    console.log('2kg to grams:', kgToG, kgToG === 2000 ? '✅' : '❌');

    // Test 3: cup to ml (volume)
    const cupToMl = convertUnit(1, 'cup', 'ml');
    console.log('1 cup to ml:', cupToMl, cupToMl === 240 ? '✅' : '❌');

    // Test 4: Density conversion (tbsp to g for something with density 1.5)
    const tbspToG = toGrams(1, 'tbsp', 1.5);
    // tbsp = 14.7868 ml * 1.5 g/ml = 22.1802 g
    console.log('1 tbsp (1.5 density) to grams:', tbspToG, Math.abs(tbspToG - 22.1802) < 0.01 ? '✅' : '❌');

    console.log('--- Test Complete ---');
}

try {
    test();
} catch (e) {
    console.error('Test failed:', e);
}
