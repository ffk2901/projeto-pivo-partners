import { NextRequest, NextResponse } from "next/server";
import { getProjects, createProject, updateProject, generateId } from "@/lib/sheets";
import type { Project } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startupId = searchParams.get("startup_id");
    let data = await getProjects();
    if (startupId) data = data.filter((p) => p.startup_id === startupId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.startup_id || !body.project_name) {
      return NextResponse.json({ error: "startup_id and project_name are required" }, { status: 400 });
    }
    const project: Project = {
      project_id: generateId("prj"),
      startup_id: body.startup_id,
      project_name: body.project_name,
      status: body.status || "active",
      created_at: new Date().toISOString(),
      notes: body.notes || "",
    };
    await createProject(project);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }
    const projects = await getProjects();
    const existing = projects.find((p) => p.project_id === body.project_id);
    if (!existing) {
      return NextResponse.json({ error: `Project "${body.project_id}" not found` }, { status: 404 });
    }
    const updated: Project = { ...existing, ...body };
    await updateProject(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
