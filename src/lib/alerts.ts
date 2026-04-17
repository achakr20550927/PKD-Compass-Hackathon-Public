
import { db } from './db';
import { ClinicalProfile } from './interpretation';

export interface AlertContext {
    profile?: ClinicalProfile;
    profileVersion?: number;
}

/**
 * Check global alert rules for a given metric value.
 * Optionally uses personalized thresholds from the user's clinical profile.
 * Stores referenceRangeUsed, ruleLogic, and profileVersionUsed for explainability.
 */
export async function checkAlerts(
    userId: string,
    type: string,
    value: number,
    context?: AlertContext,
) {
    const rules = await db.alertRule.findMany({
        where: { metric: type, active: true }
    });

    for (const rule of rules) {
        let triggered = false;
        let explanation = '';
        let referenceRangeUsed: string | null = null;
        let ruleLogic: string | null = null;

        if (rule.condition === 'GT' && value > rule.threshold) {
            triggered = true;
            explanation = `${type} value ${value} is above threshold ${rule.threshold}.`;
            ruleLogic = `${type} > ${rule.threshold} → ${rule.severity} alert`;
            referenceRangeUsed = JSON.stringify({ high: rule.threshold });
        } else if (rule.condition === 'LT' && value < rule.threshold) {
            triggered = true;
            explanation = `${type} value ${value} is below threshold ${rule.threshold}.`;
            ruleLogic = `${type} < ${rule.threshold} → ${rule.severity} alert`;
            referenceRangeUsed = JSON.stringify({ low: rule.threshold });
        } else if (rule.condition === 'RATE_CHANGE' && rule.timeframe) {
            const historical = await db.observation.findFirst({
                where: {
                    userId,
                    type: type as any,
                    timestamp: {
                        gte: new Date(Date.now() - rule.timeframe * 24 * 60 * 60 * 1000)
                    }
                },
                orderBy: { timestamp: 'asc' }
            });

            if (historical) {
                const change = ((value - historical.value) / historical.value) * 100;
                if (Math.abs(change) >= rule.threshold) {
                    triggered = true;
                    explanation = `${type} changed by ${change.toFixed(1)}% over ${rule.timeframe} days.`;
                    ruleLogic = `${type} rate change ≥${rule.threshold}% in ${rule.timeframe} days → ${rule.severity} alert`;
                    referenceRangeUsed = JSON.stringify({ rateChangePercent: rule.threshold, timeframeDays: rule.timeframe });
                }
            }
        }

        if (triggered) {
            await db.alertEvent.create({
                data: {
                    userId,
                    ruleId: rule.id,
                    message: explanation,
                    triggeredVal: value,
                    status: 'ACTIVE',
                    triggeredAt: new Date(),
                    referenceRangeUsed,
                    ruleLogic,
                    profileVersionUsed: context?.profileVersion ?? null,
                } as any
            });
            if (process.env.NODE_ENV !== "production") {
                console.log(`Alert triggered for ${type}: ${explanation}`);
            }
        }
    }
}
