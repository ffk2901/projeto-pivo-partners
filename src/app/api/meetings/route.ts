import { NextRequest, NextResponse } from "next/server";
import {
  getMeetings, createMeeting, updateMeeting, deleteMeeting,
  generateId, createActivityLog,
} from "@/lib/sheets";
import type { Meeting } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const investorId = searchParams.get("investor_id");
    let data = await getMeetings();
    if (projectId) data = data.filter((m) => m.project_id === projectId);
    if (investorId) data = data.filter((m) => m.investor_id === investorId);
    data.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.time || "").localeCompare(a.time || "");
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }
    if (!body.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!body.date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const meeting: Meeting = {
      meeting_id: generateId("mtg"),
      project_id: body.project_id,
      investor_id: body.investor_id || "",
      title: body.title,
      date: body.date,
      time: body.time || "",
      participants: body.participants || "",
      status: body.status || "scheduled",
      source: body.source || "manual",
      summary: body.summary || "",
      next_steps: body.next_steps || "",
      calendar_event_id: body.calendar_event_id || "",
      created_at: now,
      updated_at: now,
    };
    await createMeeting(meeting);

    // Log activity
    try {
      await createActivityLog({
        activity_id: generateId("act"),
        project_id: body.project_id,
        investor_id: body.investor_id || "",
        activity_type: "meeting_scheduled",
        description: `Meeting scheduled: "${body.title}" on ${body.date}`,
        metadata: "",
        created_at: now,
        created_by: "",
      });
    } catch { /* non-critical */ }

    return NextResponse.json(meeting, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.meeting_id) {
      return NextResponse.json({ error: "meeting_id is required" }, { status: 400 });
    }
    const all = await getMeetings();
    const existing = all.find((m) => m.meeting_id === body.meeting_id);
    if (!existing) {
      return NextResponse.json({ error: `Meeting "${body.meeting_id}" not found` }, { status: 404 });
    }
    const updated: Meeting = {
      ...existing,
      ...body,
      updated_at: new Date().toISOString(),
    };
    await updateMeeting(updated);

    // Log completion activity
    if (updated.status === "completed" && existing.status !== "completed") {
      try {
        await createActivityLog({
          activity_id: generateId("act"),
          project_id: updated.project_id,
          investor_id: updated.investor_id,
          activity_type: "meeting_completed",
          description: `Meeting completed: "${updated.title}"`,
          metadata: "",
          created_at: updated.updated_at,
          created_by: "",
        });
      } catch { /* non-critical */ }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get("meeting_id");
    if (!meetingId) {
      return NextResponse.json({ error: "meeting_id is required" }, { status: 400 });
    }
    await deleteMeeting(meetingId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
