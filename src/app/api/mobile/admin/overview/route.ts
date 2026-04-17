export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  void req;
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
