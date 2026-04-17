export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { checkRateLimit, clientIpFromRequest } from '@/lib/rate-limit';

export async function POST(req: Request) {
    try {
        const ip = clientIpFromRequest(req);
        const rl = checkRateLimit(`web-signup:${ip}`, 12, 15 * 60 * 1000);
        if (!rl.ok) {
            return NextResponse.json(
                { error: 'Too many signup attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
            );
        }

        const { email, password, name, gender } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
        }

        // 1. Password validation (8+ length, 1+ special char)
        const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return NextResponse.json({ error: 'Password must be at least 8 characters long and contain at least one special character.' }, { status: 400 });
        }

        // 2. Email domain validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        const validDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
        const domain = email.split('@')[1].toLowerCase();
        if (!validDomains.includes(domain)) {
            return NextResponse.json({ error: 'Please use a common email provider (Gmail, Yahoo, Hotmail, etc.)' }, { status: 400 });
        }

        // 3. Check if user exists
        const existingUser = await db.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        // 4. Create user
        const user = await db.user.create({
            data: {
                email,
                name,
                gender,
                passwordHash: await hash(password, 10),
                role: 'PATIENT',
            }
        });

        return NextResponse.json({ success: true, userId: user.id });
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
