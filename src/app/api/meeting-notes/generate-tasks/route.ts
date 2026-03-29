import { NextRequest, NextResponse } from "next/server";
import { getMeetingNotes, createTask, generateId } from "@/lib/sheets";
import type { Task } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { note_id } = await req.json();
    if (!note_id) {
      return NextResponse.json({ error: "note_id is required" }, { status: 400 });
    }

    const notes = await getMeetingNotes();
    const note = notes.find((n) => n.note_id === note_id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (!note.action_items) {
      return NextResponse.json({ error: "No action items in note" }, { status: 400 });
    }

    const items = note.action_items
      .split(";;")
      .map((s) => s.trim())
      .filter(Boolean);

    const now = new Date().toISOString();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateStr = dueDate.toISOString().split("T")[0];

    const tasks: Task[] = [];
    for (const item of items) {
      const task: Task = {
        task_id: generateId("task"),
        startup_id: note.startup_id,
        project_id: note.project_id,
        investor_id: note.investor_id,
        title: item,
        owner_id: note.created_by,
        due_date: dueDateStr,
        due_time: "",
        status: "todo",
        priority: "medium",
        notes: `Generated from meeting note: ${note.subject}`,
        created_at: now,
        updated_at: now,
        calendar_event_id: "",
        sync_status: "none",
      };
      await createTask(task);
      tasks.push(task);
    }

    return NextResponse.json(tasks);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
