import { NextRequest, NextResponse } from "next/server";
import {
  getProjectInvestors, getInvestors, getProjectNotes, getTasks,
  getMeetings, getProjects, getStartups, getTeam,
} from "@/lib/sheets";
import { getFollowUpStatus, getStalledStatus, FOLLOW_UP_STATUS_CONFIG } from "@/types";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    if (!projectId) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const [allPI, allInvestors, allNotes, allTasks, allMeetings, allProjects, allStartups, team] =
      await Promise.all([
        getProjectInvestors(), getInvestors(), getProjectNotes(), getTasks(),
        getMeetings(), getProjects(), getStartups(), getTeam(),
      ]);

    const project = allProjects.find((p) => p.project_id === projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const startup = allStartups.find((s) => s.startup_id === project.startup_id);

    const piLinks = allPI.filter((pi) => pi.project_id === projectId);
    const projectNotes = allNotes.filter((n) => n.project_id === projectId);
    const projectTasks = allTasks.filter((t) => t.project_id === projectId);
    const projectMeetings = allMeetings.filter((m) => m.project_id === projectId);
    const today = new Date().toISOString().split("T")[0];

    // Stage counts
    const stageCounts: Record<string, number> = {};
    piLinks.forEach((pi) => {
      stageCounts[pi.stage] = (stageCounts[pi.stage] || 0) + 1;
    });

    const overdueCount = piLinks.filter((pi) => getFollowUpStatus(pi) === "overdue").length;
    const dueSoonCount = piLinks.filter((pi) => getFollowUpStatus(pi) === "due_soon").length;

    // === Sheet 1: Summary ===
    const summaryData = [
      ["Meeting Report - Fundraising Pipeline"],
      [],
      ["Project", project.project_name],
      ["Startup", startup?.startup_name || ""],
      ["Generated At", new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })],
      [],
      ["Pipeline Overview"],
      ["Total Investors", piLinks.length],
      ...Object.entries(stageCounts).map(([stage, count]) => [stage, count]),
      [],
      ["Follow-up Summary"],
      ["Overdue Follow-ups", overdueCount],
      ["Due Soon (3 days)", dueSoonCount],
      ["No Follow-up Set", piLinks.filter((pi) => !pi.follow_up_date).length],
      ["Stalled Investors", piLinks.filter((pi) => getStalledStatus(pi)).length],
    ];

    // === Sheet 2: Pipeline Report ===
    const pipelineHeaders = [
      "Investor", "Type", "Stage", "Owner", "Last Interaction Date",
      "Last Interaction Type", "Next Step", "Follow-up Date", "Follow-up Status",
      "Latest Update", "Upcoming Meeting", "Open Tasks",
    ];

    const pipelineRows = piLinks.map((pi) => {
      const investor = allInvestors.find((i) => i.investor_id === pi.investor_id);
      const investorNotes = projectNotes
        .filter((n) => n.investor_id === pi.investor_id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const investorTasks = projectTasks.filter((t) => t.investor_id === pi.investor_id);
      const investorMeetings = projectMeetings.filter((m) => m.investor_id === pi.investor_id);
      const owner = team.find((m) => m.team_id === pi.owner_id);
      const upcomingMeeting = investorMeetings.find(
        (m) => m.date >= today && m.status === "scheduled"
      );
      const latestNote = investorNotes[0];
      const openTaskCount = investorTasks.filter((t) => t.status !== "done").length;
      const followUpStatus = getFollowUpStatus(pi);

      return [
        investor?.investor_name || pi.investor_id,
        investor?.tags?.split(";")[0]?.trim() || "",
        pi.stage,
        owner?.name || pi.owner_id || "",
        pi.last_interaction_date || pi.last_update || "",
        pi.last_interaction_type || "",
        pi.next_step || pi.next_action || "",
        pi.follow_up_date || "",
        FOLLOW_UP_STATUS_CONFIG[followUpStatus]?.label || "",
        pi.latest_update || latestNote?.content?.substring(0, 200) || "",
        upcomingMeeting ? `${upcomingMeeting.title} (${upcomingMeeting.date})` : "",
        openTaskCount,
      ];
    });

    // === Sheet 3: Follow-ups ===
    const followUpHeaders = [
      "Investor", "Stage", "Owner", "Next Step", "Follow-up Date",
      "Status", "Notes/Update", "Upcoming Meeting",
    ];

    const followUpRows = piLinks
      .filter((pi) => {
        const status = getFollowUpStatus(pi);
        return status === "overdue" || status === "due_soon" || status === "no_follow_up" || getStalledStatus(pi);
      })
      .map((pi) => {
        const investor = allInvestors.find((i) => i.investor_id === pi.investor_id);
        const owner = team.find((m) => m.team_id === pi.owner_id);
        const investorMeetings = projectMeetings.filter((m) => m.investor_id === pi.investor_id);
        const upcomingMeeting = investorMeetings.find(
          (m) => m.date >= today && m.status === "scheduled"
        );
        const followUpStatus = getFollowUpStatus(pi);
        const isStalled = getStalledStatus(pi);
        const statusLabel = isStalled
          ? "Stalled"
          : (FOLLOW_UP_STATUS_CONFIG[followUpStatus]?.label || "");

        return [
          investor?.investor_name || pi.investor_id,
          pi.stage,
          owner?.name || pi.owner_id || "",
          pi.next_step || pi.next_action || "",
          pi.follow_up_date || "",
          statusLabel,
          pi.latest_update || pi.notes || "",
          upcomingMeeting ? `${upcomingMeeting.title} (${upcomingMeeting.date})` : "",
        ];
      });

    // Build workbook
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1["!cols"] = [{ wch: 25 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    const ws2 = XLSX.utils.aoa_to_sheet([pipelineHeaders, ...pipelineRows]);
    ws2["!cols"] = pipelineHeaders.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws2, "Pipeline Report");

    const ws3 = XLSX.utils.aoa_to_sheet([followUpHeaders, ...followUpRows]);
    ws3["!cols"] = followUpHeaders.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws3, "Follow-ups");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `${project.project_name.replace(/[^a-zA-Z0-9]/g, "_")}_Pipeline_Report_${today}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
