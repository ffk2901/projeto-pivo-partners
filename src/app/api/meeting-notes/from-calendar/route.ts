import { NextRequest, NextResponse } from "next/server";
import { getUserCalendarEvent } from "@/lib/calendar";
import { generateId } from "@/lib/sheets";
import type { MeetingNote } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { calendar_event_id, team_id } = await req.json();

    if (!calendar_event_id || !team_id) {
      return NextResponse.json(
        { error: "calendar_event_id and team_id are required" },
        { status: 400 }
      );
    }

    const event = await getUserCalendarEvent(team_id, calendar_event_id);
    if (!event) {
      return NextResponse.json({ error: "Calendar event not found" }, { status: 404 });
    }

    // Extract date from event start
    const meetingDate = event.start
      ? event.start.includes("T")
        ? event.start.split("T")[0]
        : event.start
      : new Date().toISOString().split("T")[0];

    // Determine meeting type from event
    const meetingType = event.meet_link ? "video" : "other";

    const note: MeetingNote = {
      note_id: generateId("mn"),
      investor_id: event.matched_investor?.investor_id || "",
      project_id: event.matched_project?.project_id || "",
      startup_id: "",
      meeting_date: meetingDate,
      meeting_type: meetingType,
      subject: event.title,
      attendees: event.attendees.join("; "),
      summary: "",
      action_items: "",
      sentiment: "neutral",
      calendar_event_id: event.event_id,
      transcription_url: "",
      source: "calendar",
      created_by: team_id,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(note);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create note from calendar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
