import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkProjectAccess } from "@/lib/access";
import { getTasks, createTask, updateTask, generateId } from "@/lib/db";
import type { Task } from "@/types";

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
  return { payload, projectId };
}

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    // Return all tasks - the client filters by project_id
    const all = await getTasks();
    return NextResponse.json(all);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = body.project_id;
    if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const access = await checkProjectAccess(payload.user_id, payload.role, projectId);
    if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (access.permissionLevel === "view") return NextResponse.json({ error: "Read-only access" }, { status: 403 });
    const now = new Date().toISOString();
    const task: Task = {
      task_id: generateId("tsk"),
      startup_id: body.startup_id || "",
      project_id: projectId,
      investor_id: body.investor_id || "",
      title: body.title || "",
      owner_id: body.owner_id || "",
      due_date: body.due_date || "",
      due_time: body.due_time || "",
      status: body.status || "todo",
      priority: body.priority || "medium",
      notes: body.notes || "",
      created_at: now,
      updated_at: now,
      calendar_event_id: "",
      sync_status: "none",
    };
    await createTask(task);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.task_id) return NextResponse.json({ error: "task_id required" }, { status: 400 });
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const all = await getTasks();
    const existing = all.find((t) => t.task_id === body.task_id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.project_id) {
      const access = await checkProjectAccess(payload.user_id, payload.role, existing.project_id);
      if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (access.permissionLevel === "view") return NextResponse.json({ error: "Read-only access" }, { status: 403 });
    }
    const updated = { ...existing, ...body, updated_at: new Date().toISOString() };
    await updateTask(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
