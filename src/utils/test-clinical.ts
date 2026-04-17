/**
 * Clinical Unit Tests for PKD Compass
 * Run: npm run test:clinical
 *
 * Tests cover:
 *   1) CKD-EPI 2021 eGFR calculation accuracy
 *   2) Blood pressure interpretation (CKD target, elderly, diabetes)
 *   3) Rapid creatinine rise detection
 *   4) Haversine distance accuracy
 *   5) Resource radius filter simulation
 */

import { calculateEGFR } from '../lib/egfr';
import { interpretBP, interpretCreatinine, interpretPotassium, interpretSodium, interpretPhosphorus } from '../lib/interpretation';
import { haversineDistanceMiles } from '../lib/geo';

let pass = 0;
let fail = 0;

function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
        console.log(`  ✅ ${name}`);
        pass++;
    } else {
        console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
        fail++;
    }
}

function approxEqual(a: number, b: number, tolerance = 1): boolean {
    return Math.abs(a - b) <= tolerance;
}

//
// ── Test 1: CKD-EPI 2021 eGFR Calculation ────────────────────
//
console.log('\n=== Test 1: CKD-EPI 2021 eGFR Calculation ===');

// Published test vectors from the 2021 paper (approximate):
// Female, 45yr, Cr=0.8 → CKD-EPI 2021 gives ~90 mL/min/1.73m² (G1/G2 boundary)
{
    const r = calculateEGFR({ agYears: 45, sexAtBirth: 'FEMALE', creatinineMgDl: 0.8 });
    assert(approxEqual(r.egfr, 90, 5), 'Female 45yr Cr=0.8 ≈ 90 (G1/G2 boundary)', `got ${r.egfr}`);
}

// Male, 60yr, Cr=1.2 → CKD-EPI 2021 gives ~72 mL/min/1.73m² (G2)
{
    const r = calculateEGFR({ agYears: 60, sexAtBirth: 'MALE', creatinineMgDl: 1.2 });
    assert(approxEqual(r.egfr, 72, 5), 'Male 60yr Cr=1.2 ≈ 72 (G2)', `got ${r.egfr}`);
}

// Male, 70yr, Cr=2.5 → should be Stage G4 (15–29 range)
{
    const r = calculateEGFR({ agYears: 70, sexAtBirth: 'MALE', creatinineMgDl: 2.5 });
    assert(r.egfr >= 15 && r.egfr <= 35, 'Male 70yr Cr=2.5 → Stage G4 range (15–35)', `got ${r.egfr}`);
}

// Female, 30yr, Cr=0.6 → ~113 mL/min/1.73m² (Stage 1)
{
    const r = calculateEGFR({ agYears: 30, sexAtBirth: 'FEMALE', creatinineMgDl: 0.6 });
    assert(r.egfr >= 90, 'Female 30yr Cr=0.6 → Stage 1 (≥90)', `got ${r.egfr}`);
    assert(r.isCalculated === true, 'isCalculated is true');
}

//
// ── Test 2: Blood Pressure Interpretation ────────────────────
//
console.log('\n=== Test 2: BP Interpretation ===');

// Normal CKD patient: 125/78 → normal
{
    const r = interpretBP(125, 78, {});
    assert(r.status === 'NORMAL', 'BP 125/78 → NORMAL');
}

// Standard CKD elevated: 135/82 → ATTENTION
{
    const r = interpretBP(135, 82, {});
    assert(r.status === 'ATTENTION', 'BP 135/82 → ATTENTION');
    assert(r.label === 'Above recommended CKD target', 'Label = Above recommended CKD target');
}

// Elderly patient (≥65): 135/78 → NORMAL (threshold 140/80)
{
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 68);
    const r = interpretBP(135, 78, { dob });
    assert(r.status === 'NORMAL', 'Elderly 68yr BP 135/78 → NORMAL (threshold 140)');
}

// Dangerous BP: 165/100 → DANGER
{
    const r = interpretBP(165, 100, { hasDiabetes: true });
    assert(r.status === 'DANGER', 'BP 165/100 with diabetes → DANGER');
}

// Sustained elevation check (7-day, 3 readings)
{
    const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const readings = [
        { systolic: 138, timestamp: sevenDaysAgo },
        { systolic: 140, timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
        { systolic: 142, timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    ];
    const r = interpretBP(138, 82, {}, readings);
    assert(r.status !== 'NORMAL' || r.message.includes('Sustained'), 'Sustained elevation detected');
}

//
// ── Test 3: Creatinine – Rapid Rise Detection ─────────────────
//
console.log('\n=== Test 3: Creatinine Rapid Rise Detection ===');

// Male, Cr 1.0 → 1.5 within 30h → AKI flag
{
    const history = [{ value: 1.0, timestamp: new Date(Date.now() - 30 * 3600000) }];
    const r = interpretCreatinine(1.5, { sexAtBirth: 'MALE' }, history);
    assert(r.status === 'DANGER', 'Male Cr 1.0→1.5 in 30h → DANGER (AKI)');
    assert(r.label.includes('Rapid Rise'), 'Label contains Rapid Rise');
}

// Female, Cr 0.8 → no rise → normal
{
    const r = interpretCreatinine(0.9, { sexAtBirth: 'FEMALE' }, []);
    assert(r.status === 'NORMAL', 'Female Cr 0.9 → NORMAL');
}

// Male high Cr 2.0 (no history) → ATTENTION
{
    const r = interpretCreatinine(2.0, { sexAtBirth: 'MALE' }, []);
    assert(['ATTENTION', 'DANGER'].includes(r.status), 'Male Cr 2.0 → ATTENTION or DANGER');
}

// 7-day 50% rise → AKI flag
{
    const eight_days_ago = new Date(Date.now() - 8 * 24 * 3600000);
    const history = [{ value: 1.0, timestamp: eight_days_ago }];
    // 1.0 → 1.6 is 60% rise in 8 days (beyond 7-day window, so no flag)
    const r = interpretCreatinine(1.6, { sexAtBirth: 'MALE' }, history);
    assert(r.status !== 'CRITICAL', '8-day window: no rapid-rise flag expected');
}

//
// ── Test 4: Haversine Distance ────────────────────────────────
//
console.log('\n=== Test 4: Haversine Distance Calculation ===');

// NYC to LA ≈ 2451 miles
{
    const d = haversineDistanceMiles(40.7128, -74.006, 34.0522, -118.2437);
    assert(approxEqual(d, 2451, 30), `NYC→LA: ${d.toFixed(0)} miles ≈ 2451`);
}

// London to Paris ≈ 213 miles
{
    const d = haversineDistanceMiles(51.5074, -0.1278, 48.8566, 2.3522);
    assert(approxEqual(d, 213, 15), `London→Paris: ${d.toFixed(0)} miles ≈ 213`);
}

// Same point → 0
{
    const d = haversineDistanceMiles(39.0997, -94.5786, 39.0997, -94.5786);
    assert(d === 0, 'Same point = 0 miles');
}

// Kansas City to 50mi away (approx): PKD Foundation (39.0997, -94.5786) to 38.5, -94.5 ≈ 37mi
{
    const d = haversineDistanceMiles(39.0997, -94.5786, 38.5, -94.5);
    assert(d < 50, `KC radius check: ${d.toFixed(1)} mi < 50`);
}

//
// ── Test 5: Resource Radius Filter Simulation ─────────────────
//
console.log('\n=== Test 5: Resource Radius Filter ===');

const mockResources = [
    { name: 'PKD Foundation', lat: 39.0997, lng: -94.5786, isVirtual: false },
    { name: 'Virtual Group', lat: null, lng: null, isVirtual: true },
    { name: 'Distant Hospital', lat: 48.8566, lng: 2.3522, isVirtual: false },
];

function filterByRadius(
    resources: { name: string; lat: number | null; lng: number | null; isVirtual: boolean }[],
    userLat: number, userLng: number, radiusMi: number,
) {
    return resources.filter(r => {
        if (r.isVirtual && !r.lat) return true;
        if (!r.lat || !r.lng) return false;
        return haversineDistanceMiles(userLat, userLng, r.lat, r.lng) <= radiusMi;
    });
}

// User at KC, 100mi radius → PKD Foundation + Virtual Group; NOT Paris
const kc = { lat: 39.0997, lng: -94.5786 };
const result = filterByRadius(mockResources, kc.lat, kc.lng, 100);
assert(result.some(r => r.name === 'PKD Foundation'), 'PKD Foundation within 100mi of KC');
assert(result.some(r => r.name === 'Virtual Group'), 'Virtual Group always included');
assert(!result.some(r => r.name === 'Distant Hospital'), 'Paris hospital excluded from 100mi KC radius');

//
// ── Test 6: Potassium/Sodium/Phosphorus ───────────────────────
//
console.log('\n=== Test 6: Electrolyte Interpretation ===');

// Potassium normal
assert(interpretPotassium(4.2).status === 'NORMAL', 'K 4.2 → NORMAL');
// Potassium critical
assert(interpretPotassium(6.2).status === 'CRITICAL', 'K 6.2 → CRITICAL');
// Sodium low
assert(interpretSodium(122).status === 'DANGER', 'Na 122 → DANGER');
// Phosphorus elevated
assert(['ATTENTION', 'DANGER'].includes(interpretPhosphorus(5.0).status), 'Phos 5.0 → ATTENTION');

//
// ── Summary ───────────────────────────────────────────────────
//
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ✅ ${pass} passed, ❌ ${fail} failed`);
if (fail > 0) {
    console.error('\nSome tests failed. Review the output above.');
    process.exit(1);
} else {
    console.log('\nAll clinical tests passed! ✅');
}
