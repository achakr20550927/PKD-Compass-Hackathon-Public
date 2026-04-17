export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { hasSeedAccess } from '@/lib/seed-auth';
import { getImportJob } from '@/lib/import-jobs';

export async function GET(req: Request) {
    try {
        if (!hasSeedAccess(req, 'SEED_SECRET')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const jobKey = (searchParams.get('jobKey') || '').trim();
        if (!jobKey) {
            return NextResponse.json({ error: 'jobKey is required' }, { status: 400 });
        }

        const job = await getImportJob(jobKey);
        return NextResponse.json({ job });
    } catch (error) {
        console.error('Seed jobs API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
