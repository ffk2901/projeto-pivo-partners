import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/access";
import { generateAuthUrl } from "@/lib/auth-google";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = generateAuthUrl(payload.user_id);
    return NextResponse.redirect(url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
