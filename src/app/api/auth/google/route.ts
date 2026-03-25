import { NextRequest, NextResponse } from "next/server";
import { generateAuthUrl } from "@/lib/auth-google";

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("team_id");
  if (!teamId) {
    return NextResponse.json({ error: "team_id is required" }, { status: 400 });
  }

  try {
    const url = generateAuthUrl(teamId);
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate auth URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
