import { NextRequest, NextResponse } from "next/server";
import { getCalendarConnectionStatus } from "@/lib/auth-google";

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("team_id");
  if (!teamId) {
    return NextResponse.json({ error: "team_id is required" }, { status: 400 });
  }

  try {
    const status = await getCalendarConnectionStatus(teamId);
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
