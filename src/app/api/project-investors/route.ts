import { NextRequest, NextResponse } from "next/server";
import {
  getProjectInvestors, createProjectInvestor, updateProjectInvestor,
  generateId, getPipelineStages,
} from "@/lib/sheets";
import type { ProjectInvestor } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    let data = await getProjectInvestors();
    if (projectId) data = data.filter((pi) => pi.project_id === projectId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const stages = await getPipelineStages();
    const stage = body.stage || stages[0] || "Potentials";

    if (!stages.includes(stage)) {
      return NextResponse.json({ error: `Invalid stage "${stage}". Valid: ${stages.join(", ")}` }, { status: 400 });
    }
    if (!body.project_id || !body.investor_id) {
      return NextResponse.json({ error: "project_id and investor_id are required" }, { status: 400 });
    }

    const pi: ProjectInvestor = {
      link_id: generateId("pi"),
      project_id: body.project_id,
      investor_id: body.investor_id,
      stage,
      last_update: new Date().toISOString().split("T")[0],
      next_action: body.next_action || "",
      notes: body.notes || "",
    };
    await createProjectInvestor(pi);
    return NextResponse.json(pi, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.link_id) {
      return NextResponse.json({ error: "link_id is required" }, { status: 400 });
    }
    if (body.stage) {
      const stages = await getPipelineStages();
      if (!stages.includes(body.stage)) {
        return NextResponse.json({ error: `Invalid stage "${body.stage}". Valid: ${stages.join(", ")}` }, { status: 400 });
      }
    }
    const all = await getProjectInvestors();
    const existing = all.find((pi) => pi.link_id === body.link_id);
    if (!existing) {
      return NextResponse.json({ error: `Link "${body.link_id}" not found` }, { status: 404 });
    }
    const updated: ProjectInvestor = {
      ...existing,
      ...body,
      last_update: body.stage && body.stage !== existing.stage
        ? new Date().toISOString().split("T")[0]
        : (body.last_update || existing.last_update),
    };
    await updateProjectInvestor(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
