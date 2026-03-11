import { NextRequest, NextResponse } from "next/server";
import {
  getProjectInvestors, createProjectInvestor, updateProjectInvestor,
  deleteProjectInvestor, generateId, getPipelineStages, createActivityLog,
} from "@/lib/db";
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
    const now = new Date().toISOString();

    const pi: ProjectInvestor = {
      link_id: generateId("pi"),
      project_id: body.project_id,
      investor_id: body.investor_id,
      stage,
      position_index: maxPos + 1,
      owner_id: body.owner_id || "",
      priority: body.priority || "",
      last_interaction_date: "",
      last_interaction_type: "",
      next_step: body.next_step || body.next_action || "",
      follow_up_date: body.follow_up_date || "",
      latest_update: "",
      fit_summary: body.fit_summary || "",
      source: body.source || "",
      last_update: now.split("T")[0],
      next_action: body.next_action || body.next_step || "",
      notes: body.notes || "",
      wave: body.wave || "",
      created_at: now,
      updated_at: now,
    };
    await createProjectInvestor(pi);

    // Log activity
    try {
      await createActivityLog({
        activity_id: generateId("act"),
        project_id: body.project_id,
        investor_id: body.investor_id,
        activity_type: "investor_added",
        description: `Investor added to funnel in stage "${stage}"`,
        metadata: "",
        created_at: now,
        created_by: body.owner_id || "",
      });
    } catch { /* non-critical */ }

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
    const stageChanged = body.stage && body.stage !== existing.stage;
    const now = new Date().toISOString();
    const updated: ProjectInvestor = {
      ...existing,
      ...body,
      position_index: body.position_index !== undefined ? body.position_index : existing.position_index,
      last_update: stageChanged
        ? now.split("T")[0]
        : (body.last_update || existing.last_update),
      updated_at: now,
      // Keep next_step and next_action in sync
      next_step: body.next_step !== undefined ? body.next_step : (body.next_action !== undefined ? body.next_action : existing.next_step),
      next_action: body.next_action !== undefined ? body.next_action : (body.next_step !== undefined ? body.next_step : existing.next_action),
    };
    await updateProjectInvestor(updated);

    // When a card moves between stages, re-index the source stage to close gaps
    if (stageChanged) {
      const sourceCards = all
        .filter((pi) => pi.project_id === existing.project_id && pi.stage === existing.stage && pi.link_id !== existing.link_id)
        .sort((a, b) => a.position_index - b.position_index);
      for (let i = 0; i < sourceCards.length; i++) {
        if (sourceCards[i].position_index !== i) {
          await updateProjectInvestor({ ...sourceCards[i], position_index: i });
        }
      }

      // Log stage change activity
      try {
        await createActivityLog({
          activity_id: generateId("act"),
          project_id: existing.project_id,
          investor_id: existing.investor_id,
          activity_type: "stage_change",
          description: `Stage changed from "${existing.stage}" to "${body.stage}"`,
          metadata: JSON.stringify({ from: existing.stage, to: body.stage }),
          created_at: now,
          created_by: body.owner_id || existing.owner_id || "",
        });
      } catch { /* non-critical */ }
    }

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
