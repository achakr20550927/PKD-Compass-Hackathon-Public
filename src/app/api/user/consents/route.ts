export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    CONSENT_TYPES,
    extractIPAddress,
    latestConsentMap,
    recordConsent,
    recordConsentBatch,
    type ConsentType,
} from "@/lib/consents";
import { writeAuditLog } from "@/lib/audit";

const ALLOWED_TYPES = new Set<string>(Object.values(CONSENT_TYPES));

type ConsentEntryPayload = { type?: string; status?: boolean };
type ConsentPayload = { entries?: ConsentEntryPayload[]; type?: string; status?: boolean };

async function getSessionUser() {
    const session = await getServerSession(authOptions as any) as any;
    return session?.user?.id ? session.user : null;
}

export async function GET(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        return NextResponse.json({ statuses: await latestConsentMap(user.id) });
    } catch (error) {
        console.error("web consents GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const payload = (await req.json().catch(() => ({}))) as ConsentPayload;
        const ipAddress = extractIPAddress(req);

        if (Array.isArray(payload.entries)) {
            const entries = payload.entries
                .filter((entry): entry is { type: ConsentType; status: boolean } =>
                    typeof entry?.type === "string" &&
                    ALLOWED_TYPES.has(entry.type) &&
                    typeof entry?.status === "boolean"
                )
                .map((entry) => ({
                    type: entry.type as ConsentType,
                    status: entry.status,
                }));

            if (entries.length === 0) {
                return NextResponse.json({ error: "No valid consent entries provided" }, { status: 400 });
            }

            await recordConsentBatch({
                userId: user.id,
                entries,
                ipAddress,
            });

            await writeAuditLog({
                userId: user.id,
                action: "CONSENT_UPDATE",
                resourceType: "CONSENT",
                details: JSON.stringify(entries),
                ipAddress,
            });

            return NextResponse.json({ success: true, statuses: await latestConsentMap(user.id) });
        }

        if (
            typeof payload.type !== "string" ||
            !ALLOWED_TYPES.has(payload.type) ||
            typeof payload.status !== "boolean"
        ) {
            return NextResponse.json({ error: "Invalid consent payload" }, { status: 400 });
        }

        await recordConsent({
            userId: user.id,
            type: payload.type as ConsentType,
            status: payload.status,
            ipAddress,
        });

        await writeAuditLog({
            userId: user.id,
            action: payload.status ? "CONSENT_GRANTED" : "CONSENT_REVOKED",
            resourceType: "CONSENT",
            resourceId: payload.type,
            details: payload.type,
            ipAddress,
        });

        return NextResponse.json({ success: true, statuses: await latestConsentMap(user.id) });
    } catch (error) {
        console.error("web consents PATCH error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    return PATCH(req);
}
