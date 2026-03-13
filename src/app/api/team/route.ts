import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getTeam, updateTeamMember } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
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
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
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
