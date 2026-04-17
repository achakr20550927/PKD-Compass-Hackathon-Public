export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";
import { latestConsentMap } from "@/lib/consents";

export async function GET(req: Request) {
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const firstName = user.profile?.firstName ?? null;
    const lastName = user.profile?.lastName ?? null;
    return NextResponse.json({
      id: user.id,
      email: user.email,
      consents: await latestConsentMap(user.id),
      profile: {
        firstName,
        lastName,
      },
    });
  } catch (e) {
    console.error("mobile me error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
