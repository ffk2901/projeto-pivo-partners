import { NextRequest, NextResponse } from "next/server";
import {
  getProjectInvestors, createProjectInvestor, updateProjectInvestor,
  deleteProjectInvestor, generateId, getPipelineStages,
} from "@/lib/sheets";
import type { ProjectInvestor } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    let data = await getProjectInvestors();
    if (projectId) data = data.filter((pi) => pi.project_id === projectId);
    data.sort((a, b) => a.position_index - b.position_index);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const stages = await getPipelineStages();
    const stage = body.stage || stages[0] || "Pipeline";

    if (!stages.includes(stage)) {
      return NextResponse.json({ error: `Invalid stage "${stage}". Valid: ${stages.join(", ")}` }, { status: 400 });
    }
    if (!body.project_id || !body.investor_id) {
      return NextResponse.json({ error: "project_id and investor_id are required" }, { status: 400 });
    }

    // Prevent duplicates
    const existing = await getProjectInvestors();
    const duplicate = existing.find(
      (pi) => pi.project_id === body.project_id && pi.investor_id === body.investor_id
    );
    if (duplicate) {
      return NextResponse.json({ error: "This investor is already in this funnel" }, { status: 409 });
    }

    // Position: append to end of target stage
    const stageCards = existing.filter(
      (pi) => pi.project_id === body.project_id && pi.stage === stage
    );
    const maxPos = stageCards.reduce((max, pi) => Math.max(max, pi.position_index), -1);

    const pi: ProjectInvestor = {
      link_id: generateId("pi"),
      project_id: body.project_id,
      investor_id: body.investor_id,
      stage,
      position_index: maxPos + 1,
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
      position_index: body.position_index !== undefined ? body.position_index : existing.position_index,
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get("link_id");
    if (!linkId) {
      return NextResponse.json({ error: "link_id is required" }, { status: 400 });
    }
    const all = await getProjectInvestors();
    const existing = all.find((pi) => pi.link_id === linkId);
    if (!existing) {
      return NextResponse.json({ error: `Link "${linkId}" not found` }, { status: 404 });
    }
    await deleteProjectInvestor(linkId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
