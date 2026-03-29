import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/access";
import { getUserCalendarEvent } from "@/lib/calendar-user";
import { createMeeting, generateId } from "@/lib/db";
import type { Meeting } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { calendar_event_id, project_id, investor_id } = body;

    if (!calendar_event_id) {
      return NextResponse.json({ error: "calendar_event_id is required" }, { status: 400 });
    }
    if (!project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const event = await getUserCalendarEvent(payload.user_id, calendar_event_id);
    if (!event) {
      return NextResponse.json({ error: "Calendar event not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const eventDate = event.start ? event.start.split("T")[0] : "";
    const eventTime = event.start && event.start.includes("T")
      ? event.start.split("T")[1]?.substring(0, 5) || ""
      : "";

    const meeting: Meeting = {
      meeting_id: generateId("mtg"),
      project_id,
      investor_id: investor_id || "",
      title: event.summary,
      date: eventDate,
      time: eventTime,
      participants: event.attendees.join("; "),
      status: "scheduled",
      source: "calendar",
      summary: "",
      next_steps: "",
      calendar_event_id,
      created_at: now,
      updated_at: now,
    };

    await createMeeting(meeting);
    return NextResponse.json(meeting, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
