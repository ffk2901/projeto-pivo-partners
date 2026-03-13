import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/access";
import { getInvestors } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const investors = await getInvestors();
    return NextResponse.json(investors);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
