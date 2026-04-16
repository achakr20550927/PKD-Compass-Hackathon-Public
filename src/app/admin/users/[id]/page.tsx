import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage() {
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.user?.email) redirect('/login');
    redirect('/dashboard');
}
