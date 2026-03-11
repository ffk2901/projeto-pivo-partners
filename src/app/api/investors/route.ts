import { NextRequest, NextResponse } from "next/server";
import {
  getInvestors,
  getProjectInvestors,
  createInvestor,
  updateInvestor,
  deleteInvestor,
  generateId,
} from "@/lib/db";
import type { Investor } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const investors = await getInvestors();
    return NextResponse.json(investors);
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
    const investor: Investor = {
      investor_id: generateId("inv"),
      investor_name: body.investor_name || "",
      tags: body.tags || "",
      email: body.email || "",
      notes: body.notes || "",
      origin: body.origin || "",
    };

    if (!investor.investor_name) {
      return NextResponse.json(
        { error: "investor_name is required" },
        { status: 400 }
      );
    }

    await createInvestor(investor);
    return NextResponse.json(investor, { status: 201 });
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
    if (!body.investor_id) {
      return NextResponse.json(
        { error: "investor_id is required" },
        { status: 400 }
      );
    }

    const investors = await getInvestors();
    const existing = investors.find((i) => i.investor_id === body.investor_id);
    if (!existing) {
      return NextResponse.json(
        { error: `Investor "${body.investor_id}" not found` },
        { status: 404 }
      );
    }

    const updated: Investor = { ...existing, ...body };
    await updateInvestor(updated);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const investorId = searchParams.get("investor_id");
    if (!investorId) {
      return NextResponse.json({ error: "investor_id is required" }, { status: 400 });
    }

    const investors = await getInvestors();
    const existing = investors.find((i) => i.investor_id === investorId);
    if (!existing) {
      return NextResponse.json({ error: `Investor "${investorId}" not found` }, { status: 404 });
    }

    // Check if linked to any funnel
    const piLinks = await getProjectInvestors();
    const linked = piLinks.some((pi) => pi.investor_id === investorId);
    if (linked) {
      return NextResponse.json(
        { error: "This investor is linked to one or more funnels. Remove them from all funnels first." },
        { status: 409 }
      );
    }

    await deleteInvestor(investorId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
