import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask, updateTask, getTeam, generateId } from "@/lib/db";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/calendar";
import type { Task } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Attempt to auto-sync a task to Google Calendar.
 * Requires the task to have a due_date and an owner with an email.
 * Returns the updated calendar fields (calendar_event_id, sync_status).
 * Never throws — on failure it returns sync_status: "failed".
 */
async function autoSyncToCalendar(
  task: Task,
  options?: { forceDelete?: boolean }
): Promise<Pick<Task, "calendar_event_id" | "sync_status">> {
  try {
    // If the task lost its due_date or is done, remove the calendar event
    if (!task.due_date || task.status === "done" || options?.forceDelete) {
      if (task.calendar_event_id) {
        try {
          await deleteCalendarEvent(task.calendar_event_id);
        } catch (err) {
          console.warn("Calendar event delete failed (may already be gone):", err);
        }
      }
      return { calendar_event_id: "", sync_status: "none" };
    }

    // Need an owner with an email to create/update events
    if (!task.owner_id) {
      return { calendar_event_id: task.calendar_event_id, sync_status: task.sync_status };
    }

    const team = await getTeam();
    const owner = team.find((m) => m.team_id === task.owner_id);
    if (!owner?.email) {
      // No email configured — skip silently, don't mark as failed
      return { calendar_event_id: task.calendar_event_id, sync_status: task.sync_status };
    }

    const eventInput = {
      summary: task.title,
      description: task.notes ? `Task notes: ${task.notes}` : "",
      date: task.due_date,
      time: task.due_time || undefined,
      attendeeEmail: owner.email,
    };

    let result;
    if (task.calendar_event_id) {
      // Update existing event
      result = await updateCalendarEvent(task.calendar_event_id, eventInput);
    } else {
      // Create new event
      result = await createCalendarEvent(eventInput);
    }

    return { calendar_event_id: result.eventId, sync_status: "synced" };
  } catch (err) {
    console.error("Auto calendar sync failed:", err);
    return { calendar_event_id: task.calendar_event_id || "", sync_status: "failed" };
  }
}

export async function GET() {
  try {
    const tasks = await getTasks();
    return NextResponse.json(tasks);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    let task: Task = {
      task_id: generateId("tsk"),
      startup_id: body.startup_id || "",
      project_id: body.project_id || "",
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
    if (!task.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // Auto-sync to Google Calendar if the task has a due date and owner
    if (task.due_date && task.owner_id && task.status !== "done") {
      const calFields = await autoSyncToCalendar(task);
      task = { ...task, ...calFields };
    }

    await createTask(task);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.task_id) {
      return NextResponse.json({ error: "task_id is required" }, { status: 400 });
    }
    const tasks = await getTasks();
    const existing = tasks.find((t) => t.task_id === body.task_id);
    if (!existing) {
      return NextResponse.json({ error: `Task "${body.task_id}" not found` }, { status: 404 });
    }
    let updated: Task = { ...existing, ...body, updated_at: new Date().toISOString() };

    // Determine if calendar-relevant fields changed
    const calFieldsChanged =
      updated.due_date !== existing.due_date ||
      updated.due_time !== existing.due_time ||
      updated.title !== existing.title ||
      updated.owner_id !== existing.owner_id ||
      updated.status !== existing.status ||
      updated.notes !== existing.notes;

    if (calFieldsChanged) {
      const calFields = await autoSyncToCalendar(updated);
      updated = { ...updated, ...calFields };
    }

    await updateTask(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
