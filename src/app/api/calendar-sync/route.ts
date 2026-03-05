import { NextRequest, NextResponse } from "next/server";
import { getTasks, updateTask, getTeam } from "@/lib/sheets";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/calendar";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { task_id, action } = body;

    if (!task_id) {
      return NextResponse.json({ error: "task_id is required" }, { status: 400 });
    }

    const tasks = await getTasks();
    const task = tasks.find((t) => t.task_id === task_id);
    if (!task) {
      return NextResponse.json({ error: `Task "${task_id}" not found` }, { status: 404 });
    }

    const team = await getTeam();
    const owner = team.find((m) => m.team_id === task.owner_id);

    if (!owner?.email) {
      return NextResponse.json(
        { error: "Task owner does not have an email configured. Please add an email to the team member first." },
        { status: 400 }
      );
    }

    if (!task.due_date) {
      return NextResponse.json(
        { error: "Task must have a due date to sync with Google Calendar" },
        { status: 400 }
      );
    }

    // Handle delete/unsync
    if (action === "unsync") {
      if (task.calendar_event_id) {
        try {
          await deleteCalendarEvent(task.calendar_event_id);
        } catch (err) {
          console.warn("Failed to delete calendar event (may already be deleted):", err);
        }
      }
      const updated = {
        ...task,
        calendar_event_id: "",
        sync_status: "none" as const,
        updated_at: new Date().toISOString(),
      };
      await updateTask(updated);
      return NextResponse.json({ success: true, task: updated });
    }

    // Create or update calendar event
    const eventInput = {
      summary: task.title,
      description: task.notes ? `Task notes: ${task.notes}` : "",
      date: task.due_date,
      time: task.due_time || undefined,
      attendeeEmail: owner.email,
    };

    try {
      let result;
      if (task.calendar_event_id) {
        // Update existing event
        result = await updateCalendarEvent(task.calendar_event_id, eventInput);
      } else {
        // Create new event
        result = await createCalendarEvent(eventInput);
      }

      const updated = {
        ...task,
        calendar_event_id: result.eventId,
        sync_status: "synced" as const,
        updated_at: new Date().toISOString(),
      };
      await updateTask(updated);

      return NextResponse.json({ success: true, task: updated, eventId: result.eventId });
    } catch (calErr) {
      // Mark as failed
      const updated = {
        ...task,
        sync_status: "failed" as const,
        updated_at: new Date().toISOString(),
      };
      await updateTask(updated);

      return NextResponse.json(
        { error: `Calendar sync failed: ${calErr instanceof Error ? calErr.message : "Unknown error"}`, task: updated },
        { status: 502 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
