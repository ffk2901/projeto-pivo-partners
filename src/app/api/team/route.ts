import { NextRequest, NextResponse } from "next/server";
import { getTeam, updateTeamMember } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const team = await getTeam();
    return NextResponse.json(team);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.team_id) {
      return NextResponse.json({ error: "team_id is required" }, { status: 400 });
    }
    const team = await getTeam();
    const existing = team.find((m) => m.team_id === body.team_id);
    if (!existing) {
      return NextResponse.json({ error: `Team member "${body.team_id}" not found` }, { status: 404 });
    }
    const updated = { ...existing, ...body };
    await updateTeamMember(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
