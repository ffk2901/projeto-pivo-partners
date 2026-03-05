import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask, updateTask, generateId, getTeam } from "@/lib/sheets";
import { createCalendarEvent, updateCalendarEvent } from "@/lib/calendar";
import type { Task } from "@/types";

export const dynamic = "force-dynamic";

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
    const task: Task = {
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
    await createTask(task);

    // Auto-sync to Google Calendar if task has due_date and owner
    if (task.due_date && task.owner_id) {
      try {
        const team = await getTeam();
        const owner = team.find((m) => m.team_id === task.owner_id);
        if (owner?.email) {
          const result = await createCalendarEvent({
            summary: task.title,
            description: task.notes ? `Task notes: ${task.notes}` : "",
            date: task.due_date,
            time: task.due_time || undefined,
            attendeeEmail: owner.email,
          });
          task.calendar_event_id = result.eventId;
          task.sync_status = "synced";
          await updateTask(task);
        }
      } catch (calErr) {
        console.warn("Auto calendar sync failed:", calErr);
        task.sync_status = "failed";
        await updateTask(task);
      }
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
    const updated: Task = { ...existing, ...body, updated_at: new Date().toISOString() };
    await updateTask(updated);

    // Auto-sync calendar when task has due_date + owner and is already synced or has relevant changes
    const dateChanged = body.due_date && body.due_date !== existing.due_date;
    const timeChanged = body.due_time !== undefined && body.due_time !== existing.due_time;
    const titleChanged = body.title && body.title !== existing.title;
    const needsSync = dateChanged || timeChanged || titleChanged;

    if (updated.due_date && updated.owner_id && needsSync) {
      try {
        const team = await getTeam();
        const owner = team.find((m) => m.team_id === updated.owner_id);
        if (owner?.email) {
          const eventInput = {
            summary: updated.title,
            description: updated.notes ? `Task notes: ${updated.notes}` : "",
            date: updated.due_date,
            time: updated.due_time || undefined,
            attendeeEmail: owner.email,
          };
          if (updated.calendar_event_id) {
            const result = await updateCalendarEvent(updated.calendar_event_id, eventInput);
            updated.calendar_event_id = result.eventId;
          } else {
            const result = await createCalendarEvent(eventInput);
            updated.calendar_event_id = result.eventId;
          }
          updated.sync_status = "synced";
          await updateTask(updated);
        }
      } catch (calErr) {
        console.warn("Auto calendar sync on update failed:", calErr);
        updated.sync_status = "failed";
        await updateTask(updated);
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
