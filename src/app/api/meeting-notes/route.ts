import { NextRequest, NextResponse } from "next/server";
import {
  getMeetingNotes,
  getMeetingNotesByInvestor,
  getMeetingNotesByProject,
  createMeetingNote,
  updateMeetingNote,
  generateId,
} from "@/lib/sheets";
import type { MeetingNote } from "@/types";

export async function GET(req: NextRequest) {
  const investorId = req.nextUrl.searchParams.get("investor_id");
  const projectId = req.nextUrl.searchParams.get("project_id");
  const startupId = req.nextUrl.searchParams.get("startup_id");

  try {
    let notes: MeetingNote[];
    if (investorId) {
      notes = await getMeetingNotesByInvestor(investorId);
    } else if (projectId) {
      notes = await getMeetingNotesByProject(projectId);
    } else {
      notes = await getMeetingNotes();
    }

    if (startupId) {
      notes = notes.filter((n) => n.startup_id === startupId);
    }

    return NextResponse.json(notes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch meeting notes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const note: MeetingNote = {
      note_id: generateId("mn"),
      investor_id: body.investor_id || "",
      project_id: body.project_id || "",
      startup_id: body.startup_id || "",
      meeting_date: body.meeting_date || new Date().toISOString().split("T")[0],
      meeting_type: body.meeting_type || "other",
      subject: body.subject || "",
      attendees: body.attendees || "",
      summary: body.summary || "",
      action_items: body.action_items || "",
      sentiment: body.sentiment || "neutral",
      calendar_event_id: body.calendar_event_id || "",
      transcription_url: body.transcription_url || "",
      source: body.source || "manual",
      created_by: body.created_by || "",
      created_at: new Date().toISOString(),
    };

    await createMeetingNote(note);
    return NextResponse.json(note);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create meeting note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.note_id) {
      return NextResponse.json({ error: "note_id is required" }, { status: 400 });
    }

    const notes = await getMeetingNotes();
    const existing = notes.find((n) => n.note_id === body.note_id);
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const updated: MeetingNote = { ...existing, ...body };
    await updateMeetingNote(updated);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update meeting note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
