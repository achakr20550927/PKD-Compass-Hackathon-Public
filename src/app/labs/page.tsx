import { db } from '@/lib/db';
import LabsClientPage from '@/components/LabsClientPage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function getLabsData(userId: string) {
    const labs = await db.observation.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 30
    });

    const symptoms = await db.symptomLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 30
    });

    const profile = await db.profile.findUnique({
        where: { userId }
    });

    const egfrLabs = labs.filter(l => l.type === 'EGFR').slice(0, 6).reverse();
    const latestEGFR = egfrLabs[egfrLabs.length - 1];
    const latestCreatinine = labs.find(l => l.type === 'CREATININE');
    const latestBUN = labs.find(l => l.type === 'BUN');
    const latestUACR = labs.find(l => l.type === 'UACR');

    return { labs, symptoms, egfrLabs, latestEGFR, latestCreatinine, latestBUN, latestUACR, profile };
}

export default async function LabsPage() {
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.user?.id) redirect('/login');
    const userId = session.user.id as string;

    const initialData = await getLabsData(userId);

    return <LabsClientPage initialData={initialData} />;
}
