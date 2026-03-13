import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/access";
import { getStartups, getUserProjectAccess, getProjects } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    if (payload.role === "admin") {
      const rows = await getStartups();
      return NextResponse.json(rows);
    }

    // Client: only startups for projects they have access to
    const accessRows = await getUserProjectAccess(payload.user_id);
    const projectIds = new Set(accessRows.map((a) => a.project_id));
    const projects = await getProjects();
    const startupIds = new Set(
      projects.filter((p) => projectIds.has(p.project_id)).map((p) => p.startup_id)
    );
    const allStartups = await getStartups();
    return NextResponse.json(allStartups.filter((s) => startupIds.has(s.startup_id)));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
