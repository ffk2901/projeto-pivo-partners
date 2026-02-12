import { NextRequest, NextResponse } from "next/server";
import {
  getStartupInvestors,
  createStartupInvestor,
  updateStartupInvestor,
  generateId,
  getPipelineStages,
} from "@/lib/sheets";
import type { StartupInvestor } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startupId = searchParams.get("startup_id");

    let data = await getStartupInvestors();
    if (startupId) {
      data = data.filter((si) => si.startup_id === startupId);
    }
    return NextResponse.json(data);
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
    const stages = await getPipelineStages();
    const stage = body.stage || stages[0] || "Target";

    if (!stages.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage "${stage}". Valid: ${stages.join(", ")}` },
        { status: 400 }
      );
    }

    if (!body.startup_id || !body.investor_id) {
      return NextResponse.json(
        { error: "startup_id and investor_id are required" },
        { status: 400 }
      );
    }

    const si: StartupInvestor = {
      link_id: generateId("si"),
      startup_id: body.startup_id,
      investor_id: body.investor_id,
      stage,
      last_update: new Date().toISOString().split("T")[0],
      next_action: body.next_action || "",
      notes: body.notes || "",
    };

    await createStartupInvestor(si);
    return NextResponse.json(si, { status: 201 });
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
    if (!body.link_id) {
      return NextResponse.json(
        { error: "link_id is required" },
        { status: 400 }
      );
    }

    if (body.stage) {
      const stages = await getPipelineStages();
      if (!stages.includes(body.stage)) {
        return NextResponse.json(
          { error: `Invalid stage "${body.stage}". Valid: ${stages.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const all = await getStartupInvestors();
    const existing = all.find((si) => si.link_id === body.link_id);
    if (!existing) {
      return NextResponse.json(
        { error: `Link "${body.link_id}" not found` },
        { status: 404 }
      );
    }

    const updated: StartupInvestor = {
      ...existing,
      ...body,
      last_update: body.stage !== existing.stage
        ? new Date().toISOString().split("T")[0]
        : existing.last_update,
    };

    await updateStartupInvestor(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
