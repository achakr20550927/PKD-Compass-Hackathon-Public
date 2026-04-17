/**
 * CKD-EPI 2021 eGFR Calculation Service
 * Reference: Inker LA et al. NEJM 2021; 385:1737-1749
 *
 * The 2021 equation removes the race coefficient used in prior versions.
 * Inputs: age (years), sex at birth ("MALE" or "FEMALE"), serum creatinine (mg/dL)
 * Output: eGFR in mL/min/1.73m²
 */

export interface EGFRInput {
    /** Age in years (integer or float) */
    agYears: number;
    /** "MALE" or "FEMALE" */
    sexAtBirth: string;
    /** Serum creatinine in mg/dL */
    creatinineMgDl: number;
}

export interface EGFRResult {
    egfr: number;
    equation: string;
    inputs: EGFRInput;
    isCalculated: true;
}

/**
 * CKD-EPI 2021 creatinine-based eGFR calculation.
 * Returns rounded to 1 decimal place.
 */
export function calculateEGFR(input: EGFRInput): EGFRResult {
    const { agYears, sexAtBirth, creatinineMgDl } = input;

    if (agYears <= 0 || creatinineMgDl <= 0) {
        throw new Error('Age and creatinine must be positive values.');
    }

    const isFemale = sexAtBirth === 'FEMALE';
    const kappa = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.241 : -0.302;
    const sexFactor = isFemale ? 1.012 : 1.0;

    const cr_kappa = creatinineMgDl / kappa;
    const min_part = Math.min(cr_kappa, 1);
    const max_part = Math.max(cr_kappa, 1);

    const egfr = 142
        * Math.pow(min_part, alpha)
        * Math.pow(max_part, -1.200)
        * Math.pow(0.9938, agYears)
        * sexFactor;

    return {
        egfr: Math.round(egfr * 10) / 10,
        equation: 'CKD-EPI 2021',
        inputs: input,
        isCalculated: true,
    };
}

/**
 * Compute age in full years from date of birth.
 */
export function ageFromDOB(dob: Date): number {
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}
