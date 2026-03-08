import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask, updateTask, getTeam, generateId, createActivityLog } from "@/lib/sheets";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/calendar";
import type { Task } from "@/types";

export const dynamic = "force-dynamic";

async function autoSyncToCalendar(
  task: Task,
  options?: { forceDelete?: boolean }
): Promise<Pick<Task, "calendar_event_id" | "sync_status">> {
  try {
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

    if (!task.owner_id) {
      return { calendar_event_id: task.calendar_event_id, sync_status: task.sync_status };
    }

    const team = await getTeam();
    const owner = team.find((m) => m.team_id === task.owner_id);
    if (!owner?.email) {
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
      result = await updateCalendarEvent(task.calendar_event_id, eventInput);
    } else {
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
    if (!task.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    if (task.due_date && task.owner_id && task.status !== "done") {
      const calFields = await autoSyncToCalendar(task);
      task = { ...task, ...calFields };
    }

    await createTask(task);

    // Log activity if task is linked to an investor
    if (task.investor_id && task.project_id) {
      try {
        await createActivityLog({
          activity_id: generateId("act"),
          project_id: task.project_id,
          investor_id: task.investor_id,
          activity_type: "task_created",
          description: `Task created: "${task.title}"`,
          metadata: "",
          created_at: now,
          created_by: task.owner_id,
        });
      } catch { /* non-critical */ }
    }

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

    // Log task completion activity
    if (updated.status === "done" && existing.status !== "done" && updated.investor_id && updated.project_id) {
      try {
        await createActivityLog({
          activity_id: generateId("act"),
          project_id: updated.project_id,
          investor_id: updated.investor_id,
          activity_type: "task_completed",
          description: `Task completed: "${updated.title}"`,
          metadata: "",
          created_at: updated.updated_at,
          created_by: updated.owner_id,
        });
      } catch { /* non-critical */ }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
