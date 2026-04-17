export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (token) {
      await db.session.delete({ where: { sessionToken: token } }).catch(() => {});
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("mobile logout error:", e);
    return NextResponse.json({ success: true });
  }
}

