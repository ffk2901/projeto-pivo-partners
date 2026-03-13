import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkProjectAccess } from "@/lib/access";
import { getProjectInvestors, createProjectInvestor, updateProjectInvestor, deleteProjectInvestor, generateId } from "@/lib/db";
import type { ProjectInvestor } from "@/types";

export const dynamic = "force-dynamic";

async function portalGuard(req: NextRequest, requireEdit = false) {
  const payload = await requireAuth(req);
  if (!payload) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  if (!projectId) return { error: NextResponse.json({ error: "project_id required" }, { status: 400 }) };
  const access = await checkProjectAccess(payload.user_id, payload.role, projectId);
  if (!access.hasAccess) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  if (requireEdit && access.permissionLevel === "view") return { error: NextResponse.json({ error: "Read-only access" }, { status: 403 }) };
  return { payload, projectId, permissionLevel: access.permissionLevel };
}

export async function GET(req: NextRequest) {
  try {
    const guard = await portalGuard(req);
    if ("error" in guard) return guard.error;
    const all = await getProjectInvestors();
    return NextResponse.json(all.filter((pi) => pi.project_id === guard.projectId));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await portalGuard(req, true);
    if ("error" in guard) return guard.error;
    const body = await req.json();
    const now = new Date().toISOString();
    const pi: ProjectInvestor = {
      link_id: generateId("pi"),
      project_id: guard.projectId,
      investor_id: body.investor_id || "",
      stage: body.stage || "Pipeline",
      position_index: body.position_index || 0,
      owner_id: body.owner_id || "",
      priority: body.priority || "",
      last_interaction_date: "",
      last_interaction_type: "",
      next_step: "",
      follow_up_date: "",
      latest_update: "",
      fit_summary: "",
      source: "",
      last_update: now.split("T")[0],
      next_action: "",
      notes: "",
      wave: "",
      created_at: now,
      updated_at: now,
    };
    await createProjectInvestor(pi);
    return NextResponse.json(pi, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await portalGuard(req, true);
    if ("error" in guard) return guard.error;
    const body = await req.json();
    if (!body.link_id) return NextResponse.json({ error: "link_id required" }, { status: 400 });
    const all = await getProjectInvestors();
    const existing = all.find((pi) => pi.link_id === body.link_id && pi.project_id === guard.projectId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = { ...existing, ...body };
    await updateProjectInvestor(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const guard = await portalGuard(req, true);
    if ("error" in guard) return guard.error;
    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get("link_id");
    if (!linkId) return NextResponse.json({ error: "link_id required" }, { status: 400 });
    const all = await getProjectInvestors();
    const existing = all.find((pi) => pi.link_id === linkId && pi.project_id === guard.projectId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await deleteProjectInvestor(linkId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
