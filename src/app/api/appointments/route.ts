export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { asOptionalDate, asOptionalString, asTrimmedString } from '@/lib/request-validators';
import { checkRateLimit, clientIpFromRequest } from '@/lib/rate-limit';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const appointments = await db.appointment.findMany({
            where: { userId },
            include: {
                reminders: true,
                tasks: true,
                documents: {
                    include: {
                        document: true
                    }
                }
            },
            orderBy: {
                startAt: 'asc'
            }
        });

        return NextResponse.json(appointments);
    } catch (error) {
        console.error('Get appointments error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;
        const ip = clientIpFromRequest(req);
        const rl = checkRateLimit(`web-appointments-create:${userId}:${ip}`, 30, 15 * 60 * 1000);
        if (!rl.ok) {
            return NextResponse.json(
                { error: 'Too many appointment changes. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
            );
        }

        const body = await req.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }
        const title = asTrimmedString(body?.title ?? '', 160);
        const type = asTrimmedString(body?.type ?? '', 50);
        const startAt = asOptionalDate(body?.startAt);
        const endAt = asOptionalDate(body?.endAt);
        const providerName = asOptionalString(body?.providerName, 120);
        const locationText = asOptionalString(body?.locationText, 250);
        const notes = asOptionalString(body?.notes, 2000);
        const reminders = Array.isArray(body?.reminders) ? body.reminders : [];

        if (!title || !type || !startAt) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const normalizedReminders = reminders
            .map((r: any) => ({
                remindAt: asOptionalDate(r?.remindAt),
                channel: asTrimmedString(r?.channel ?? 'PUSH', 20).toUpperCase(),
            }))
            .filter((r: any) => r.remindAt && ['PUSH', 'EMAIL'].includes(r.channel));

        const appointment = await db.appointment.create({
            data: {
                userId,
                title,
                type,
                startAt,
                endAt: endAt ?? null,
                providerName,
                locationText,
                notes,
                reminders: normalizedReminders.length ? {
                    create: normalizedReminders.map((r: any) => ({
                        remindAt: r.remindAt as Date,
                        channel: r.channel
                    }))
                } : undefined
            },
            include: {
                reminders: true
            }
        });

        return NextResponse.json(appointment);
    } catch (error) {
        console.error('Create appointment error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        await db.appointment.delete({
            where: { id, userId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete appointment error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
