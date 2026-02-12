import { NextRequest, NextResponse } from "next/server";
import {
  getStartups,
  createStartup,
  updateStartup,
  generateId,
} from "@/lib/sheets";
import type { Startup } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const startups = await getStartups();
    return NextResponse.json(startups);
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
    const startup: Startup = {
      startup_id: generateId("st"),
      startup_name: body.startup_name || "",
      status: body.status || "active",
      pitch_deck_url: body.pitch_deck_url || "",
      data_room_url: body.data_room_url || "",
      pl_url: body.pl_url || "",
      investment_memo_url: body.investment_memo_url || "",
      notes: body.notes || "",
    };

    if (!startup.startup_name) {
      return NextResponse.json(
        { error: "startup_name is required" },
        { status: 400 }
      );
    }

    await createStartup(startup);
    return NextResponse.json(startup, { status: 201 });
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
    if (!body.startup_id) {
      return NextResponse.json(
        { error: "startup_id is required" },
        { status: 400 }
      );
    }

    const startups = await getStartups();
    const existing = startups.find((s) => s.startup_id === body.startup_id);
    if (!existing) {
      return NextResponse.json(
        { error: `Startup "${body.startup_id}" not found` },
        { status: 404 }
      );
    }

    const updated: Startup = {
      ...existing,
      ...body,
    };

    await updateStartup(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
