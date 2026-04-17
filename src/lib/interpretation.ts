/**
 * Personalized Clinical Interpretation Engine
 *
 * All outputs include:
 * - status: "NORMAL" | "ATTENTION" | "DANGER" | "CRITICAL"
 * - label: short label
 * - message: detailed, personalized explanation
 * - referenceRange: { low?, high?, unit }
 * - ruleLogic: machine-readable description of rule applied
 * - disclaimer: always present, required on every interpretation screen
 */

export const CLINICAL_DISCLAIMER =
    'For educational purposes only. This information does not replace professional medical advice. Consult your nephrologist or healthcare provider before making any health decisions.';

export type InterpretationStatus = 'NORMAL' | 'ATTENTION' | 'DANGER' | 'CRITICAL';

export interface InterpretationResult {
    status: InterpretationStatus;
    label: string;
    message: string;
    managementSteps: string[];
    referenceRange: { low?: number; high?: number; unit: string };
    ruleLogic: string;
    disclaimer: string;
}

export interface ClinicalProfile {
    dob?: Date | null;
    sexAtBirth?: string | null; // "MALE" | "FEMALE"
    weightKg?: number | null;
    heightCm?: number | null;
    hasDiabetes?: boolean;
    hasHypertension?: boolean;
    profileVersion?: number;
}

//
// ── Utility ──────────────────────────────────────────────────
//

function ageYears(dob?: Date | null): number | null {
    if (!dob) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
}

//
// ── CKD G-Stage ──────────────────────────────────────────────
//

export type GFRStage = 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';

export function getGFRStage(egfr: number): GFRStage {
    if (egfr >= 90) return 'G1';
    if (egfr >= 60) return 'G2';
    if (egfr >= 45) return 'G3a';
    if (egfr >= 30) return 'G3b';
    if (egfr >= 15) return 'G4';
    return 'G5';
}

export function gStageDescription(stage: GFRStage): string {
    const map: Record<GFRStage, string> = {
        G1: 'Normal or high kidney function (≥90 mL/min/1.73m²)',
        G2: 'Mildly decreased kidney function (60–89)',
        G3a: 'Mildly to moderately decreased (45–59)',
        G3b: 'Moderately to severely decreased (30–44)',
        G4: 'Severely decreased function (15–29)',
        G5: 'Kidney failure (<15) — discuss renal replacement therapy with your care team',
    };
    return map[stage];
}

//
// ── eGFR slope & decline ─────────────────────────────────────
//

export function calculateTrendSlope(values: { value: number; timestamp: Date }[]): number | null {
    if (values.length < 2) return null;
    const sorted = [...values].sort((a, b) => +a.timestamp - +b.timestamp);
    const n = sorted.length;
    const xMean = (n - 1) / 2;
    const yMean = sorted.reduce((s, v) => s + v.value, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
        num += (i - xMean) * (sorted[i].value - yMean);
        den += (i - xMean) ** 2;
    }
    if (den === 0) return 0;
    // slope per data point; convert to per year assuming ~monthly measurements
    return Math.round((num / den) * 12 * 10) / 10;
}

export function calculatePercentDecline(first: number, last: number): number {
    if (first === 0) return 0;
    return Math.round(((first - last) / first) * 1000) / 10;
}

//
// ── eGFR Interpretation ──────────────────────────────────────
//

export function interpretEGFR(
    egfr: number,
    history: { value: number; timestamp: Date }[],
    _profile: ClinicalProfile,
): InterpretationResult {
    const stage = getGFRStage(egfr);
    const stageDesc = gStageDescription(stage);
    let percentDecline: number | null = null;
    let slopePerYear: number | null = null;

    if (history.length >= 2) {
        const sorted = [...history].sort((a, b) => +a.timestamp - +b.timestamp);
        percentDecline = calculatePercentDecline(sorted[0].value, sorted[sorted.length - 1].value);
        slopePerYear = calculateTrendSlope(history);
    }

    let status: InterpretationStatus = 'NORMAL';
    if (['G4', 'G5'].includes(stage)) status = 'CRITICAL';
    else if (['G3a', 'G3b'].includes(stage)) status = 'DANGER';
    else if (stage === 'G2') status = 'ATTENTION';

    // Rapid decline flag
    if (slopePerYear !== null && slopePerYear <= -5) {
        status = status === 'NORMAL' ? 'ATTENTION' : status;
    }

    let message = `CKD Stage ${stage}: ${stageDesc}.`;
    if (percentDecline !== null) {
        message += ` Decline from first recorded value: ${percentDecline}%.`;
    }
    if (slopePerYear !== null) {
        message += ` Estimated trend: ${slopePerYear > 0 ? '+' : ''}${slopePerYear} mL/min/1.73m² per year.`;
        if (slopePerYear <= -5) {
            message += ' Rapid decline detected — discuss with your nephrologist.';
        }
    }

    return {
        status,
        label: stage,
        message,
        managementSteps: status !== 'NORMAL' ? [
            "Monitor blood pressure closely (target <130/80)",
            "Review all medications and supplements with your nephrologist",
            "Maintain a kidney-friendly diet (check your Protein/Sodium limits)",
            "Ensure adequate hydration unless fluid restricted"
        ] : ["Continue current management and healthy habits"],
        referenceRange: { low: 60, unit: 'mL/min/1.73m²' },
        ruleLogic: `eGFR >= 90 = G1; 60-89 = G2; 45-59 = G3a; 30-44 = G3b; 15-29 = G4; <15 = G5. Rapid decline if slope ≤ -5/yr`,
        disclaimer: CLINICAL_DISCLAIMER,
    };
}

//
// ── Blood Pressure Interpretation ────────────────────────────
//

export function interpretBP(
    systolic: number,
    diastolic: number,
    profile: ClinicalProfile,
    recentReadings?: { systolic: number; timestamp: Date }[],
): InterpretationResult {
    const age = ageYears(profile.dob);
    const isElderly = age !== null && age >= 65;
    const hasDiabetes = profile.hasDiabetes ?? false;

    // CKD target: <130/80 per KDIGO 2021/AHA guidance
    let sysTarget = 130;
    let diasTarget = 80;

    // For elderly (≥65), some guidelines allow up to 140 systolic
    if (isElderly) sysTarget = 140;

    const sysHigh = systolic > sysTarget;
    const diasHigh = diastolic > diasTarget;

    let status: InterpretationStatus = 'NORMAL';
    let label = 'At target';
    let message = '';

    if (sysHigh || diasHigh) {
        status = systolic >= 160 || diastolic >= 100 ? 'DANGER' : 'ATTENTION';
        label = 'Above recommended CKD target';
        message = `Your reading of ${systolic}/${diastolic} mmHg is above the recommended CKD target of <${sysTarget}/${diasTarget} mmHg`;
        if (isElderly) message += ` (adjusted for age ≥65)`;
        if (hasDiabetes) message += `. With diabetes, BP control is especially important to slow kidney damage`;
        message += '.';
    } else {
        message = `Your reading of ${systolic}/${diastolic} mmHg is within the CKD target of <${sysTarget}/${diasTarget} mmHg. Good control.`;
    }

    // Check for sustained elevation (7+ days)
    if (recentReadings && recentReadings.length >= 3) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentElevated = recentReadings.filter(
            r => r.timestamp >= sevenDaysAgo && r.systolic > sysTarget,
        );
        if (recentElevated.length >= 3) {
            status = status === 'NORMAL' ? 'ATTENTION' : status;
            message += ' Sustained elevation detected over the past 7 days — please contact your care team.';
        }
    }

    return {
        status,
        label,
        message,
        managementSteps: status !== 'NORMAL' ? [
            "Limit sodium intake to <2,300mg/day",
            "Monitor for swelling (edema) in ankles/feet",
            "Retake measurement after 5 minutes of quiet rest",
            "Log all readings to share with your care team"
        ] : ["Continue regular monitoring as scheduled"],
        referenceRange: { high: sysTarget, unit: `mmHg systolic (target <${sysTarget}/${diasTarget})` },
        ruleLogic: `CKD target <130/80; elderly (≥65) <140/80; sustained >7 days flagged. Diabetes: heightened risk noted.`,
        disclaimer: CLINICAL_DISCLAIMER,
    };
}

//
// ── Creatinine Interpretation ─────────────────────────────────
//

export function interpretCreatinine(
    value: number,
    profile: ClinicalProfile,
    history: { value: number; timestamp: Date }[],
): InterpretationResult {
    const isFemale = profile.sexAtBirth === 'FEMALE';
    // Sex-specific reference ranges (mg/dL)
    const refLow = isFemale ? 0.5 : 0.7;
    const refHigh = isFemale ? 1.1 : 1.3;

    let status: InterpretationStatus = 'NORMAL';
    let label = 'Normal';
    let message = `Your creatinine is ${value} mg/dL. `;

    if (value > refHigh) {
        status = value > refHigh * 2 ? 'DANGER' : 'ATTENTION';
        label = 'Elevated';
        message += `This is above the normal range for ${isFemale ? 'females' : 'males'} (${refLow}–${refHigh} mg/dL).`;
    } else if (value < refLow) {
        status = 'ATTENTION';
        label = 'Low';
        message += `This is slightly below the normal range (${refLow}–${refHigh} mg/dL).`;
    } else {
        message += `This is within normal range for ${isFemale ? 'females' : 'males'} (${refLow}–${refHigh} mg/dL).`;
    }

    // Rapid rise detection: ≥0.3 mg/dL rise within 48h or ≥50% within 7 days
    if (history.length >= 1) {
        const sorted = [...history].sort((a, b) => +b.timestamp - +a.timestamp);
        const last = sorted[0];
        const hoursAgo = (Date.now() - +last.timestamp) / 3600000;
        if (hoursAgo <= 48 && value - last.value >= 0.3) {
            status = 'DANGER';
            label = 'Rapid Rise — Urgent';
            message += ` Rapid rise of ${(value - last.value).toFixed(2)} mg/dL detected in ≤48h — this may indicate acute kidney injury. Contact your care team promptly.`;
        } else {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const weekOld = sorted.find(r => r.timestamp <= sevenDaysAgo);
            if (weekOld && weekOld.value > 0) {
                const pct = ((value - weekOld.value) / weekOld.value) * 100;
                if (pct >= 50) {
                    status = 'DANGER';
                    label = 'Rapid Rise — Urgent';
                    message += ` Creatinine rose by ${pct.toFixed(0)}% in 7 days — possible AKI. Discuss with your nephrologist.`;
                }
            }
        }
    }

    return {
        status,
        label,
        message,
        managementSteps: status !== 'NORMAL' ? [
            "Review for possible dehydration or new supplements",
            "Check for recent use of NSAIDs (e.g., Ibuprofen, Naproxen)",
            "Ensure your clinical profile is up to date (Weight/Sex)",
            "Persistent rises require nephrology review"
        ] : ["Continue current management"],
        referenceRange: { low: refLow, high: refHigh, unit: 'mg/dL' },
        ruleLogic: `Ref range: female 0.5–1.1, male 0.7–1.3 mg/dL. Rapid rise: +0.3 in ≤48h or +50% in 7d = AKI flag`,
        disclaimer: CLINICAL_DISCLAIMER,
    };
}

//
// ── Potassium Interpretation ──────────────────────────────────
//

export function interpretPotassium(
    value: number,
    refLow?: number,
    refHigh?: number,
): InterpretationResult {
    const low = refLow ?? 3.5;
    const high = refHigh ?? 5.0;

    let status: InterpretationStatus = 'NORMAL';
    let label = 'Normal';
    let message = `Potassium ${value} mEq/L. `;

    if (value > high) {
        if (value >= 6.0) { status = 'CRITICAL'; label = 'Dangerous – Hyperkalemia'; }
        else if (value >= 5.5) { status = 'DANGER'; label = 'High – Hyperkalemia'; }
        else { status = 'ATTENTION'; label = 'Mildly Elevated'; }
        message += `Above range (${low}–${high} mEq/L). Elevated potassium can affect heart rhythm. `;
        if (value >= 6.0) message += 'Seek immediate medical attention.';
        else message += 'Review your diet and medications with your care team.';
    } else if (value < low) {
        status = value < 3.0 ? 'DANGER' : 'ATTENTION';
        label = value < 3.0 ? 'Low – Hypokalemia' : 'Mildly Low';
        message += `Below range (${low}–${high} mEq/L). Low potassium may cause muscle weakness or irregular heartbeat.`;
    } else {
        message += `Within the normal range (${low}–${high} mEq/L).`;
    }

    return {
        status,
        label,
        message,
        managementSteps: status === 'CRITICAL' ? [
            "Emergency: Contact your care team or go to ER immediately",
            "Avoid all high-potassium foods (potatoes, bananas, spinach)",
            "Review medications (ACEi/ARBs/Diuretics)"
        ] : status !== 'NORMAL' ? [
            "Avoid salt substitutes (often contain potassium)",
            "Limit high-potassium fruits and vegetables",
            "Contact your care team for a medication review"
        ] : ["Continue following your target potassium limits"],
        referenceRange: { low, high, unit: 'mEq/L' },
        ruleLogic: `Normal 3.5–5.0 mEq/L; ≥5.5 = hyperkalemia; ≥6.0 = critical/urgent`,
        disclaimer: CLINICAL_DISCLAIMER,
    };
}

//
// ── Sodium Interpretation ─────────────────────────────────────
//

export function interpretSodium(value: number, refLow?: number, refHigh?: number): InterpretationResult {
    const low = refLow ?? 136;
    const high = refHigh ?? 145;

    let status: InterpretationStatus = 'NORMAL';
    let label = 'Normal';
    let message = `Sodium ${value} mEq/L. `;

    if (value > high) {
        status = value >= 150 ? 'DANGER' : 'ATTENTION';
        label = 'High – Hypernatremia';
        message += `Above normal range (${low}–${high} mEq/L). May indicate dehydration or fluid imbalance.`;
    } else if (value < low) {
        status = value <= 125 ? 'DANGER' : 'ATTENTION';
        label = 'Low – Hyponatremia';
        message += `Below normal range (${low}–${high} mEq/L). Low sodium can cause symptoms including confusion or fatigue.`;
    } else {
        message += `Within the normal range (${low}–${high} mEq/L).`;
    }

    return {
        status,
        label,
        message,
        managementSteps: status !== 'NORMAL' ? [
            "Review fluid intake (limit if hyponatremic, increase if hypernatremic)",
            "Monitor for confusion or muscle cramps",
            "Discuss diuretic medications with your doctor"
        ] : ["Continue current hydration plan"],
        referenceRange: { low, high, unit: 'mEq/L' },
        ruleLogic: `Normal 136–145 mEq/L; <125 or >150 = danger`,
        disclaimer: CLINICAL_DISCLAIMER,
    };
}

//
// ── Phosphorus Interpretation ─────────────────────────────────
//

export function interpretPhosphorus(value: number, refLow?: number, refHigh?: number): InterpretationResult {
    const low = refLow ?? 2.5;
    const high = refHigh ?? 4.5;

    let status: InterpretationStatus = 'NORMAL';
    let label = 'Normal';
    let message = `Phosphorus ${value} mg/dL. `;

    if (value > high) {
        status = value > 6.0 ? 'DANGER' : 'ATTENTION';
        label = 'Elevated – Hyperphosphatemia';
        message += `Above range (${low}–${high} mg/dL). High phosphorus is common in CKD and can affect bone and heart health. Discuss phosphate binders with your dietitian and nephrologist.`;
    } else if (value < low) {
        status = 'ATTENTION';
        label = 'Low – Hypophosphatemia';
        message += `Below normal range (${low}–${high} mg/dL). May indicate poor nutrition or other conditions.`;
    } else {
        message += `Within the normal range (${low}–${high} mg/dL).`;
    }

    return {
        status,
        label,
        message,
        managementSteps: status !== 'NORMAL' ? [
            "Take phosphate binders exactly as prescribed with meals",
            "Limit high-phosphorus foods (dairy, beans, nuts, cola)",
            "Check for 'PHOS' additives on food labels",
            "Review phosphorus target with your renal dietitian"
        ] : ["Maintain current phosphorus management"],
        referenceRange: { low, high, unit: 'mg/dL' },
        ruleLogic: `Normal 2.5–4.5 mg/dL; CKD patients often trend high; >6.0 = danger`,
        disclaimer: CLINICAL_DISCLAIMER,
    };
}
//
// ── BUN Interpretation ─────────────────────────────────────────
//

export function interpretBUN(value: number, refLow?: number, refHigh?: number): InterpretationResult {
    const low = refLow ?? 7;
    const high = refHigh ?? 20;

    let status: InterpretationStatus = 'NORMAL';
    let label = 'Normal';
    let message = `BUN ${value} mg/dL. `;

    if (value > high) {
        status = value > 40 ? 'DANGER' : 'ATTENTION';
        label = 'Elevated';
        message += `Above range (${low}–${high} mg/dL). High BUN can indicate reduced kidney function, dehydration, or high protein intake.`;
    } else if (value < low) {
        status = 'ATTENTION';
        label = 'Low';
        message += `Below range (${low}–${high} mg/dL).`;
    } else {
        message += `Within the normal range (${low}–${high} mg/dL).`;
    }

    return {
        status,
        label,
        message,
        managementSteps: status !== 'NORMAL' ? [
            "Check hydration status",
            "Review protein intake levels",
            "Monitor for nausea or metallic taste"
        ] : ["Result is within normal limits"],
        referenceRange: { low, high, unit: 'mg/dL' },
        ruleLogic: `Normal 7–20 mg/dL; >40 = danger flag`,
        disclaimer: CLINICAL_DISCLAIMER,
    };
}

//
// ── UACR Interpretation ────────────────────────────────────────
//

export function interpretUACR(value: number): InterpretationResult {
    let status: InterpretationStatus = 'NORMAL';
    let label = 'Normal';
    let message = `uACR ${value} mg/g. `;

    if (value >= 300) {
        status = 'CRITICAL';
        label = 'Severely Increased Albuminuria';
        message += 'Severely increased protein in urine (≥300 mg/g). This indicates significant kidney damage.';
    } else if (value >= 30) {
        status = 'DANGER';
        label = 'Moderately Increased Albuminuria';
        message += 'Moderately increased protein in urine (30–299 mg/g). An early marker of kidney damage.';
    } else {
        message += 'Optimal range (<30 mg/g). Minimal to no protein detected.';
    }

    return {
        status,
        label,
        message,
        managementSteps: status !== 'NORMAL' ? [
            "Ensure tight blood pressure control",
            "Ask your doctor about SGLT2 inhibitors or MRAs",
            "Limit sodium to reduce protein leakage (proteinuria)",
            "Avoid high-intensity exercise 24h before your next test"
        ] : ["Continue current protective measures"],
        referenceRange: { high: 30, unit: 'mg/g' },
        ruleLogic: `<30 normal; 30-299 moderate; >=300 severe (alb-to-cr ratio)`,
        disclaimer: CLINICAL_DISCLAIMER,
    };
}

//
// ── Generic Dispatcher ───────────────────────────────────────
//

export function interpretObservation(
    obs: { type: string; value: number; timestamp: Date },
    history: { value: number; timestamp: Date }[],
    profile: ClinicalProfile
): InterpretationResult {
    switch (obs.type) {
        case 'EGFR':
            return interpretEGFR(obs.value, history, profile);
        case 'CREATININE':
            return interpretCreatinine(obs.value, profile, history);
        case 'POTASSIUM':
            return interpretPotassium(obs.value);
        case 'SODIUM':
            return interpretSodium(obs.value);
        case 'PHOSPHORUS':
            return interpretPhosphorus(obs.value);
        case 'BUN':
            return interpretBUN(obs.value);
        case 'UACR':
            return interpretUACR(obs.value);
        default:
            return {
                status: 'NORMAL',
                label: 'Result Recorded',
                message: `Result for ${obs.type}: ${obs.value}. No specific clinical interpretation available.`,
                managementSteps: [],
                referenceRange: { unit: '' },
                ruleLogic: 'No rule applied',
                disclaimer: CLINICAL_DISCLAIMER
            };
    }
}
