import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/access";
import { getUserCalendarEvents } from "@/lib/calendar-user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    const range = searchParams.get("range") === "week" ? "week" : undefined;

    const events = await getUserCalendarEvents(payload.user_id, date, range);
    return NextResponse.json(events);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
