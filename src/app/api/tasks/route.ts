import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask, updateTask, generateId } from "@/lib/sheets";
import type { Task } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tasks = await getTasks();
    return NextResponse.json(tasks);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const task: Task = {
      task_id: generateId("tsk"),
      startup_id: body.startup_id || "",
      title: body.title || "",
      owner_id: body.owner_id || "",
      due_date: body.due_date || "",
      status: body.status || "todo",
      priority: body.priority || "medium",
      notes: body.notes || "",
      created_at: now,
      updated_at: now,
    };

    if (!task.title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    await createTask(task);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.task_id) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      );
    }

    const tasks = await getTasks();
    const existing = tasks.find((t) => t.task_id === body.task_id);
    if (!existing) {
      return NextResponse.json(
        { error: `Task "${body.task_id}" not found` },
        { status: 404 }
      );
    }

    const updated: Task = {
      ...existing,
      ...body,
      updated_at: new Date().toISOString(),
    };

    await updateTask(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
