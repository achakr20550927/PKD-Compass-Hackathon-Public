export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET(
    req: Request,
    context: { params: Promise<{ patientId: string }> }
) {
    void req;
    void context;
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
