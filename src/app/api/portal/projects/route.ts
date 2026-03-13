import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/access";
import { getProjects, getUserProjectAccess } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    if (payload.role === "admin") {
      const rows = await getProjects();
      return NextResponse.json(rows);
    }

    const accessRows = await getUserProjectAccess(payload.user_id);
    const projectIds = new Set(accessRows.map((a) => a.project_id));
    const projects = await getProjects();
    return NextResponse.json(projects.filter((p) => projectIds.has(p.project_id)));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
