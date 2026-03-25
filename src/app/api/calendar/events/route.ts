import { NextRequest, NextResponse } from "next/server";
import { getUserCalendarEvents } from "@/lib/calendar";

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("team_id");
  const date = req.nextUrl.searchParams.get("date") || undefined;
  const range = req.nextUrl.searchParams.get("range") as "week" | undefined;

  if (!teamId) {
    return NextResponse.json({ error: "team_id is required" }, { status: 400 });
  }

  try {
    const events = await getUserCalendarEvents(teamId, date, range);
    return NextResponse.json(events);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch calendar events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
