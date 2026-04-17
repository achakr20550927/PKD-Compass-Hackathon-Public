export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id as string;

        const {
            firstName, lastName, phone, notificationsEnabled,
            // Feature 1 clinical fields
            sexAtBirth, weightKg, heightCm, hasDiabetes, hasHypertension, dob,
        } = await req.json();

        // Update User notifications
        if (notificationsEnabled !== undefined) {
            await db.user.update({
                where: { id: userId },
                data: { notificationsEnabled }
            });
        }

        // Determine which clinical fields are being updated
        const clinicalUpdate: Record<string, any> = {};
        if (sexAtBirth !== undefined) clinicalUpdate.sexAtBirth = sexAtBirth;
        if (weightKg !== undefined) clinicalUpdate.weightKg = weightKg ? parseFloat(weightKg) : null;
        if (heightCm !== undefined) clinicalUpdate.heightCm = heightCm ? parseFloat(heightCm) : null;
        if (hasDiabetes !== undefined) clinicalUpdate.hasDiabetes = hasDiabetes;
        if (hasHypertension !== undefined) clinicalUpdate.hasHypertension = hasHypertension;
        if (dob !== undefined) clinicalUpdate.dob = dob ? new Date(dob) : null;

        // Bump profileVersion whenever clinical fields change
        const hasClinicalChange = Object.keys(clinicalUpdate).length > 0;

        // Update Profile
        const existing = await db.profile.findUnique({ where: { userId } });
        const currentVersion = (existing as any)?.profileVersion ?? 1;

        await db.profile.upsert({
            where: { userId },
            update: {
                firstName,
                lastName,
                phone,
                ...clinicalUpdate,
                ...(hasClinicalChange ? { profileVersion: currentVersion + 1, lastCalculationAt: new Date() } : {}),
            } as any,
            create: {
                userId,
                firstName,
                lastName,
                phone,
                ...clinicalUpdate,
            } as any,
        });

        // Also update name in User table for convenience
        if (firstName || lastName) {
            await db.user.update({
                where: { id: userId },
                data: { name: `${firstName || ''} ${lastName || ''}`.trim() }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
