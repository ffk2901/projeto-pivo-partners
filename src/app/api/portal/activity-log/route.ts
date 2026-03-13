import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkProjectAccess } from "@/lib/access";
import { getActivityLog } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const investorId = searchParams.get("investor_id");

    if (projectId) {
      const access = await checkProjectAccess(payload.user_id, payload.role, projectId);
      if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let data = await getActivityLog();
    if (projectId) data = data.filter((a) => a.project_id === projectId);
    if (investorId) data = data.filter((a) => a.investor_id === investorId);
    data.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
