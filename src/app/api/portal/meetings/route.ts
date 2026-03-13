import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkProjectAccess } from "@/lib/access";
import { getMeetings, createMeeting, updateMeeting, deleteMeeting, generateId } from "@/lib/db";
import type { Meeting } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const investorId = searchParams.get("investor_id");
    const all = await getMeetings();
    let filtered = all;
    if (projectId) filtered = filtered.filter((m) => m.project_id === projectId);
    if (investorId) filtered = filtered.filter((m) => m.investor_id === investorId);
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
    const meeting: Meeting = {
      meeting_id: generateId("mtg"),
      project_id: projectId,
      investor_id: body.investor_id || "",
      title: body.title || "",
      date: body.date || "",
      time: body.time || "",
      participants: body.participants || "",
      status: body.status || "scheduled",
      source: "manual",
      summary: body.summary || "",
      next_steps: body.next_steps || "",
      calendar_event_id: "",
      created_at: now,
      updated_at: now,
    };
    await createMeeting(meeting);
    return NextResponse.json(meeting, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.meeting_id) return NextResponse.json({ error: "meeting_id required" }, { status: 400 });
    const payload = await requireAuth(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const all = await getMeetings();
    const existing = all.find((m) => m.meeting_id === body.meeting_id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const access = await checkProjectAccess(payload.user_id, payload.role, existing.project_id);
    if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (access.permissionLevel === "view") return NextResponse.json({ error: "Read-only access" }, { status: 403 });
    const updated = { ...existing, ...body, updated_at: new Date().toISOString() };
    await updateMeeting(updated);
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
    const meetingId = searchParams.get("meeting_id");
    if (!meetingId) return NextResponse.json({ error: "meeting_id required" }, { status: 400 });
    const all = await getMeetings();
    const existing = all.find((m) => m.meeting_id === meetingId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const access = await checkProjectAccess(payload.user_id, payload.role, existing.project_id);
    if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (access.permissionLevel === "view") return NextResponse.json({ error: "Read-only access" }, { status: 403 });
    await deleteMeeting(meetingId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
