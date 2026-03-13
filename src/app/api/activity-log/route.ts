import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getActivityLog } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const investorId = searchParams.get("investor_id");
    let data = await getActivityLog();
    if (projectId) data = data.filter((a) => a.project_id === projectId);
    if (investorId) data = data.filter((a) => a.investor_id === investorId);
    data.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
