import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LabReviewClient from '@/components/LabReviewClient';
import { interpretObservation } from '@/lib/interpretation';

async function getReviewData(userId: string) {
    const labs = await db.observation.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 50
    });

    const profile = await db.profile.findUnique({
        where: { userId }
    });

    // Identify flagged labs
    const flaggedLabs = labs.map(lab => {
        const history = labs.filter(l => l.type === lab.type);
        const interpretation = interpretObservation(lab, history, profile || {});
        return { ...lab, interpretation };
    }).filter(item => item.interpretation.status !== 'NORMAL');

    return { flaggedLabs, profile };
}

export default async function LabReviewPage() {
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.user?.id) redirect('/login');
    const userId = session.user.id;

    const { flaggedLabs, profile } = await getReviewData(userId);

    return <LabReviewClient flaggedLabs={flaggedLabs} profile={profile} />;
}
