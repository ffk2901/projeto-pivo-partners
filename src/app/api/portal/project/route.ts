import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkProjectAccess } from "@/lib/access";
import { getProjects, getStartups, getProjectInvestors } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });

    const access = await checkProjectAccess(payload.user_id, payload.role, projectId);
    if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [projects, startups, piLinks] = await Promise.all([
      getProjects(), getStartups(), getProjectInvestors(),
    ]);

    const project = projects.find((p) => p.project_id === projectId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const startup = startups.find((s) => s.startup_id === project.startup_id) || null;
    const investorCount = piLinks.filter((pi) => pi.project_id === projectId).length;

    return NextResponse.json({
      project,
      startup,
      investor_count: investorCount,
      permission_level: access.permissionLevel,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
