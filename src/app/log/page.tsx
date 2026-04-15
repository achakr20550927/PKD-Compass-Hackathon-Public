import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DailyLogClient from './DailyLogClient';

export default async function DailyLogPage() {
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.user?.id) redirect('/login');

    const userId = session.user.id;

    // Fetch user's medications
    const medications = await db.medication.findMany({
        where: { userId, isActive: true },
        select: {
            id: true,
            name: true,
            dosage: true,
            frequency: true,
            isTolvaptan: true
        }
    });

    return <DailyLogClient medications={medications} />;
}
