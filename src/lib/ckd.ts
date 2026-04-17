export type CKDStage = {
    gfrStage: 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';
    acrStage: 'A1' | 'A2' | 'A3';
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
    description: string;
};

export function classifyCKD(gfr: number, uacr: number): CKDStage {
    let gfrStage: CKDStage['gfrStage'] = 'G1';
    if (gfr >= 90) gfrStage = 'G1';
    else if (gfr >= 60) gfrStage = 'G2';
    else if (gfr >= 45) gfrStage = 'G3a';
    else if (gfr >= 30) gfrStage = 'G3b';
    else if (gfr >= 15) gfrStage = 'G4';
    else gfrStage = 'G5';

    let acrStage: CKDStage['acrStage'] = 'A1';
    if (uacr < 30) acrStage = 'A1';
    else if (uacr <= 300) acrStage = 'A2';
    else acrStage = 'A3';

    // Risk Classification (KDIGO Heatmap simplified logic)
    let riskLevel: CKDStage['riskLevel'] = 'LOW';

    if (gfrStage === 'G1' || gfrStage === 'G2') {
        if (acrStage === 'A1') riskLevel = 'LOW';
        else if (acrStage === 'A2') riskLevel = 'MODERATE';
        else riskLevel = 'HIGH';
    } else if (gfrStage === 'G3a') {
        if (acrStage === 'A1') riskLevel = 'MODERATE';
        else if (acrStage === 'A2') riskLevel = 'HIGH';
        else riskLevel = 'VERY_HIGH';
    } else if (gfrStage === 'G3b') {
        if (acrStage === 'A1') riskLevel = 'HIGH';
        else riskLevel = 'VERY_HIGH';
    } else {
        riskLevel = 'VERY_HIGH';
    }

    // Description
    const descriptions = {
        LOW: "Low risk of progression.",
        MODERATE: "Moderately increased risk.",
        HIGH: "High risk of progression.",
        VERY_HIGH: "Very high risk of kidney failure."
    };

    return {
        gfrStage,
        acrStage,
        riskLevel,
        description: descriptions[riskLevel] || "Unknown risk"
    };
}
