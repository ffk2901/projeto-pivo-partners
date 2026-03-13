import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkProjectAccess } from "@/lib/access";
import { getProjectNotes, createProjectNote, updateProjectNote, deleteProjectNote, generateId } from "@/lib/db";
import type { ProjectNote } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const investorId = searchParams.get("investor_id");
    const all = await getProjectNotes();
    let filtered = all;
    if (projectId) filtered = filtered.filter((n) => n.project_id === projectId);
    if (investorId) filtered = filtered.filter((n) => n.investor_id === investorId);
    return NextResponse.json(filtered);
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
    const note: ProjectNote = {
      note_id: generateId("note"),
      project_id: projectId,
      investor_id: body.investor_id || "",
      author_id: body.author_id || "",
      title: body.title || "",
      content: body.content || "",
      note_type: body.note_type || "general_update",
      next_step: body.next_step || "",
      follow_up_date: body.follow_up_date || "",
      tags: body.tags || "",
      meeting_id: body.meeting_id || "",
      created_at: now,
      updated_at: now,
    };
    await createProjectNote(note);
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.note_id) return NextResponse.json({ error: "note_id required" }, { status: 400 });
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const all = await getProjectNotes();
    const existing = all.find((n) => n.note_id === body.note_id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const access = await checkProjectAccess(payload.user_id, payload.role, existing.project_id);
    if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (access.permissionLevel === "view") return NextResponse.json({ error: "Read-only access" }, { status: 403 });
    const updated = { ...existing, ...body, updated_at: new Date().toISOString() };
    await updateProjectNote(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get("note_id");
    if (!noteId) return NextResponse.json({ error: "note_id required" }, { status: 400 });
    const all = await getProjectNotes();
    const existing = all.find((n) => n.note_id === noteId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const access = await checkProjectAccess(payload.user_id, payload.role, existing.project_id);
    if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (access.permissionLevel === "view") return NextResponse.json({ error: "Read-only access" }, { status: 403 });
    await deleteProjectNote(noteId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
