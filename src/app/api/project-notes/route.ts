import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  getProjectNotes, createProjectNote, updateProjectNote, deleteProjectNote,
  generateId, createActivityLog,
} from "@/lib/db";
import type { ProjectNote } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const investorId = searchParams.get("investor_id");
    let data = await getProjectNotes();
    if (projectId) data = data.filter((n) => n.project_id === projectId);
    if (investorId) data = data.filter((n) => n.investor_id === investorId);
    data.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    if (!body.project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const note: ProjectNote = {
      note_id: generateId("note"),
      project_id: body.project_id,
      investor_id: body.investor_id || "",
      author_id: body.author_id || "",
      title: body.title || "",
      content: body.content,
      note_type: body.note_type || "general_update",
      next_step: body.next_step || "",
      follow_up_date: body.follow_up_date || "",
      tags: body.tags || "",
      meeting_id: body.meeting_id || "",
      created_at: now,
      updated_at: now,
    };
    await createProjectNote(note);

    // Log activity
    try {
      await createActivityLog({
        activity_id: generateId("act"),
        project_id: body.project_id,
        investor_id: body.investor_id || "",
        activity_type: "note_created",
        description: `Note created: "${body.title || "Untitled"}"`,
        metadata: JSON.stringify({ note_type: note.note_type }),
        created_at: now,
        created_by: body.author_id || "",
      });
    } catch { /* non-critical */ }

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    if (!body.note_id) {
      return NextResponse.json({ error: "note_id is required" }, { status: 400 });
    }
    const all = await getProjectNotes();
    const existing = all.find((n) => n.note_id === body.note_id);
    if (!existing) {
      return NextResponse.json({ error: `Note "${body.note_id}" not found` }, { status: 404 });
    }
    const updated: ProjectNote = {
      ...existing,
      title: body.title !== undefined ? body.title : existing.title,
      content: body.content !== undefined ? body.content : existing.content,
      author_id: body.author_id !== undefined ? body.author_id : existing.author_id,
      investor_id: body.investor_id !== undefined ? body.investor_id : existing.investor_id,
      note_type: body.note_type !== undefined ? body.note_type : existing.note_type,
      next_step: body.next_step !== undefined ? body.next_step : existing.next_step,
      follow_up_date: body.follow_up_date !== undefined ? body.follow_up_date : existing.follow_up_date,
      tags: body.tags !== undefined ? body.tags : existing.tags,
      meeting_id: body.meeting_id !== undefined ? body.meeting_id : existing.meeting_id,
      updated_at: new Date().toISOString(),
    };
    await updateProjectNote(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get("note_id");
    if (!noteId) {
      return NextResponse.json({ error: "note_id is required" }, { status: 400 });
    }
    const all = await getProjectNotes();
    const existing = all.find((n) => n.note_id === noteId);
    if (!existing) {
      return NextResponse.json({ error: `Note "${noteId}" not found` }, { status: 404 });
    }
    await deleteProjectNote(noteId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
