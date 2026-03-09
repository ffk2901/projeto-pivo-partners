import { NextRequest, NextResponse } from "next/server";
import {
  getProjectInvestors, getInvestors, getProjectNotes, getTasks,
  getMeetings, getProjects, getStartups, getTeam,
} from "@/lib/db";
import { getFollowUpStatus, getStalledStatus } from "@/types";

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
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Stage counts
    const stageCounts: Record<string, number> = {};
    piLinks.forEach((pi) => {
      stageCounts[pi.stage] = (stageCounts[pi.stage] || 0) + 1;
    });

    // Follow-up analysis
    const overdueFollowUps = piLinks.filter((pi) => getFollowUpStatus(pi) === "overdue");
    const dueSoonFollowUps = piLinks.filter((pi) => getFollowUpStatus(pi) === "due_soon");
    const noFollowUp = piLinks.filter((pi) => getFollowUpStatus(pi) === "no_follow_up");
    const stalledInvestors = piLinks.filter((pi) => getStalledStatus(pi));

    // Build detailed investor table
    const investorTable = piLinks.map((pi) => {
      const investor = allInvestors.find((i) => i.investor_id === pi.investor_id);
      const investorNotes = projectNotes
        .filter((n) => n.investor_id === pi.investor_id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const investorTasks = projectTasks.filter((t) => t.investor_id === pi.investor_id);
      const investorMeetings = projectMeetings
        .filter((m) => m.investor_id === pi.investor_id)
        .sort((a, b) => b.date.localeCompare(a.date));
      const owner = team.find((m) => m.team_id === pi.owner_id);
      const upcomingMeeting = investorMeetings.find(
        (m) => m.date >= today && m.status === "scheduled"
      );
      const latestNote = investorNotes[0];
      const openTaskCount = investorTasks.filter((t) => t.status !== "done").length;

      return {
        investor_name: investor?.investor_name || pi.investor_id,
        investor_type: investor?.tags?.split(";")[0]?.trim() || "",
        stage: pi.stage,
        owner: owner?.name || pi.owner_id || "",
        last_interaction_date: pi.last_interaction_date || pi.last_update || "",
        last_interaction_type: pi.last_interaction_type || "",
        next_step: pi.next_step || pi.next_action || "",
        follow_up_date: pi.follow_up_date || "",
        follow_up_status: getFollowUpStatus(pi),
        is_stalled: getStalledStatus(pi),
        latest_update: pi.latest_update || latestNote?.content?.substring(0, 120) || "",
        upcoming_meeting: upcomingMeeting ? `${upcomingMeeting.title} (${upcomingMeeting.date})` : "",
        open_tasks_count: openTaskCount,
        priority: pi.priority || "",
      };
    });

    // Follow-ups section - only investors needing attention
    const followUpFocus = investorTable.filter(
      (row) =>
        row.follow_up_status === "overdue" ||
        row.follow_up_status === "due_soon" ||
        row.follow_up_status === "no_follow_up" ||
        row.is_stalled ||
        row.priority === "high"
    );

    const report = {
      generated_at: new Date().toISOString(),
      project: {
        project_id: project.project_id,
        project_name: project.project_name,
        startup_name: startup?.startup_name || "",
        status: project.status,
      },
      summary: {
        total_investors: piLinks.length,
        stage_counts: stageCounts,
        active_conversations: (stageCounts["Active"] || 0) + (stageCounts["Trying to reach"] || 0),
        advanced_conversations: stageCounts["Advanced"] || 0,
        on_hold: stageCounts["On Hold"] || 0,
        declined: stageCounts["Declined"] || 0,
        overdue_follow_ups: overdueFollowUps.length,
        due_soon_follow_ups: dueSoonFollowUps.length,
        no_follow_up: noFollowUp.length,
        stalled_investors: stalledInvestors.length,
      },
      pipeline_snapshot: Object.entries(stageCounts).map(([stage, count]) => ({
        stage, count,
        investors: investorTable.filter((r) => r.stage === stage).map((r) => r.investor_name),
      })),
      investor_table: investorTable,
      follow_up_focus: followUpFocus,
    };

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
