import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function IngestionPage() {
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.user?.email) redirect('/login');
    redirect('/dashboard');
}
