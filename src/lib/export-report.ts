import {
  getProjectInvestors, getInvestors, getProjectNotes, getTasks,
  getMeetings, getProjects, getStartups, getTeam, getPipelineStages,
} from "@/lib/db";
import { getFollowUpStatus, getStalledStatus, NOTE_TYPE_LABELS, type NoteType } from "@/types";
import * as XLSX from "xlsx";

export async function generatePipelineReport(projectId: string): Promise<{ buffer: Uint8Array; filename: string }> {
  const [allPI, allInvestors, allNotes, allTasks, allMeetings, allProjects, allStartups, team, stages] =
    await Promise.all([
      getProjectInvestors(), getInvestors(), getProjectNotes(), getTasks(),
      getMeetings(), getProjects(), getStartups(), getTeam(), getPipelineStages(),
    ]);

  const project = allProjects.find((p) => p.project_id === projectId);
  if (!project) throw new Error("Project not found");
  const startup = allStartups.find((s) => s.startup_id === project.startup_id);

  const piLinks = allPI.filter((pi) => pi.project_id === projectId);
  const projectNotes = allNotes.filter((n) => n.project_id === projectId);
  const projectTasks = allTasks.filter((t) => t.project_id === projectId);
  const projectMeetings = allMeetings.filter((m) => m.project_id === projectId);
  const today = new Date().toISOString().split("T")[0];

  const getOwnerName = (id: string) => team.find((m) => m.team_id === id)?.name || id || "";
  const getInvestor = (id: string) => allInvestors.find((i) => i.investor_id === id);

  const formatDate = (d: string) => {
    if (!d) return "";
    try {
      const date = new Date(d.includes("T") ? d : d + "T00:00:00");
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return d; }
  };

  const formatDateTime = (d: string) => {
    if (!d) return "";
    try {
      const date = new Date(d);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  // Stage counts
  const stageCounts: Record<string, number> = {};
  piLinks.forEach((pi) => {
    stageCounts[pi.stage] = (stageCounts[pi.stage] || 0) + 1;
  });

  const overdueCount = piLinks.filter((pi) => getFollowUpStatus(pi) === "overdue").length;
  const dueSoonCount = piLinks.filter((pi) => getFollowUpStatus(pi) === "due_soon").length;
  const noFollowUpCount = piLinks.filter((pi) => !pi.follow_up_date).length;
  const stalledCount = piLinks.filter((pi) => getStalledStatus(pi)).length;

  // === Sheet 1: Summary ===
  const summaryData: (string | number)[][] = [
    [`Pipeline Report — ${project.project_name}`],
    [],
    ["Startup", startup?.startup_name || ""],
    ["Project", project.project_name],
    ["Status", project.status],
    ["Generated", new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })],
    ["Total Investors", piLinks.length],
    [],
    ["Stage Breakdown"],
  ];

  // Add stage counts in pipeline order
  for (const stage of stages) {
    if (stageCounts[stage]) {
      summaryData.push([stage, stageCounts[stage]]);
    }
  }
  // Add any stages not in config
  for (const [stage, count] of Object.entries(stageCounts)) {
    if (!stages.includes(stage)) {
      summaryData.push([stage, count]);
    }
  }

  summaryData.push([]);
  summaryData.push(["Follow-up Summary"]);
  summaryData.push(["Overdue", overdueCount]);
  summaryData.push(["Due Soon (\u22643 days)", dueSoonCount]);
  summaryData.push(["No Follow-up Set", noFollowUpCount]);
  summaryData.push(["Stalled (>14 days no interaction)", stalledCount]);

  // === Sheet 2: Pipeline (stage-grouped) ===
  const pipelineData: (string | number)[][] = [];
  const pipelineMerges: XLSX.Range[] = [];
  const pipelineHeaders = [
    "Investor", "Type", "Origin", "Wave", "Owner",
    "Last Contact", "Last Contact Type", "Next Step",
    "Follow-up Date", "Latest Update",
  ];

  for (const stage of stages) {
    const stageCards = piLinks
      .filter((pi) => pi.stage === stage)
      .sort((a, b) => a.position_index - b.position_index);

    if (stageCards.length === 0) continue;

    // Stage header row
    const headerRowIdx = pipelineData.length;
    pipelineData.push([`${stage} (${stageCards.length} investor${stageCards.length !== 1 ? "s" : ""})`]);
    pipelineMerges.push({ s: { r: headerRowIdx, c: 0 }, e: { r: headerRowIdx, c: pipelineHeaders.length - 1 } });

    // Column headers
    pipelineData.push([...pipelineHeaders]);

    // Data rows
    for (const pi of stageCards) {
      const investor = getInvestor(pi.investor_id);
      let typeStr = (investor?.investor_type === "individual") ? "Individual" : "Fund";
      if (investor?.investor_type === "individual" && investor?.company_affiliation) {
        typeStr += ` (via ${investor.company_affiliation})`;
      }
      const originStr = investor?.origin === "br" ? "BR" : investor?.origin === "intl" ? "INTL" : "";
      const waveStr = pi.wave ? `W${pi.wave}` : "";
      const lastContact = pi.last_interaction_date || pi.last_update || "";
      const latestUpdate = (pi.latest_update || "").substring(0, 300);

      pipelineData.push([
        investor?.investor_name || pi.investor_id,
        typeStr,
        originStr,
        waveStr,
        getOwnerName(pi.owner_id),
        formatDate(lastContact),
        pi.last_interaction_type || "",
        pi.next_step || pi.next_action || "",
        formatDate(pi.follow_up_date),
        latestUpdate,
      ]);
    }

    // Empty separator row
    pipelineData.push([]);
  }

  // === Sheet 3: Notes ===
  const notesHeaders = [
    "Investor", "Stage", "Note Date", "Note Type", "Author",
    "Title", "Content", "Next Step", "Follow-up Date",
  ];

  // Sort notes by investor name then by date (newest first)
  const sortedNotes = [...projectNotes].sort((a, b) => {
    const invA = getInvestor(a.investor_id)?.investor_name || "ZZZZ";
    const invB = getInvestor(b.investor_id)?.investor_name || "ZZZZ";
    if (invA !== invB) return invA.localeCompare(invB);
    return b.created_at.localeCompare(a.created_at);
  });

  const notesRows = sortedNotes.map((note) => {
    const investor = note.investor_id ? getInvestor(note.investor_id) : null;
    const investorName = investor ? investor.investor_name : "PROJECT GENERAL";
    const piLink = note.investor_id ? piLinks.find((pi) => pi.investor_id === note.investor_id) : null;
    const stage = piLink ? piLink.stage : "\u2014";
    const noteTypeLabel = NOTE_TYPE_LABELS[note.note_type as NoteType] || note.note_type || "\u2014";

    return [
      investorName,
      stage,
      formatDateTime(note.created_at),
      noteTypeLabel,
      getOwnerName(note.author_id),
      note.title || "\u2014",
      note.content,
      note.next_step || "\u2014",
      note.follow_up_date ? formatDate(note.follow_up_date) : "\u2014",
    ];
  });

  // === Sheet 4: Follow-ups (actionable only) ===
  const activeStages = ["Pipeline", "Trying to reach", "Active", "Advanced"];

  const actionablePI = piLinks.filter((pi) => {
    const status = getFollowUpStatus(pi);
    const isStalled = getStalledStatus(pi);
    return (
      status === "overdue" ||
      status === "due_soon" ||
      (status === "no_follow_up" && activeStages.includes(pi.stage)) ||
      isStalled ||
      pi.priority === "high"
    );
  });

  // Sort by urgency
  const getUrgencyScore = (pi: typeof piLinks[0]) => {
    const status = getFollowUpStatus(pi);
    if (status === "overdue") return 0;
    if (status === "due_soon") return 1;
    if (getStalledStatus(pi)) return 2;
    if (status === "no_follow_up") return 3;
    if (pi.priority === "high") return 4;
    return 5;
  };

  actionablePI.sort((a, b) => getUrgencyScore(a) - getUrgencyScore(b));

  const followUpHeaders = [
    "Investor", "Type", "Stage", "Owner", "Next Step",
    "Follow-up Date", "Status", "Last Contact", "Last Note",
  ];

  const followUpRows = actionablePI.map((pi) => {
    const investor = getInvestor(pi.investor_id);
    const typeStr = (investor?.investor_type === "individual") ? "Individual" : "Fund";
    const status = getFollowUpStatus(pi);
    const isStalled = getStalledStatus(pi);

    let statusLabel = "";
    if (status === "overdue") statusLabel = "OVERDUE";
    else if (status === "due_soon") statusLabel = "DUE SOON";
    else if (isStalled) statusLabel = "STALLED";
    else if (status === "no_follow_up") statusLabel = "NO FOLLOW-UP";
    else if (pi.priority === "high") statusLabel = "HIGH PRIORITY";

    const lastContact = pi.last_interaction_date || pi.last_update;
    const investorNotes = projectNotes
      .filter((n) => n.investor_id === pi.investor_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const lastNote = investorNotes[0];

    return [
      investor?.investor_name || pi.investor_id,
      typeStr,
      pi.stage,
      getOwnerName(pi.owner_id),
      pi.next_step || pi.next_action || "",
      pi.follow_up_date ? formatDate(pi.follow_up_date) : "NOT SET",
      statusLabel,
      lastContact ? formatDate(lastContact) : "Never",
      lastNote ? (lastNote.content || "").substring(0, 200) : "No notes",
    ];
  });

  // === Build Workbook ===
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1["!cols"] = [{ wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Summary");

  // Sheet 2: Pipeline
  const ws2 = XLSX.utils.aoa_to_sheet(pipelineData);
  ws2["!cols"] = pipelineHeaders.map(() => ({ wch: 20 }));
  if (pipelineMerges.length > 0) ws2["!merges"] = pipelineMerges;
  XLSX.utils.book_append_sheet(wb, ws2, "Pipeline");

  // Sheet 3: Notes
  const ws3 = XLSX.utils.aoa_to_sheet([notesHeaders, ...notesRows]);
  ws3["!cols"] = [
    { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 16 }, { wch: 15 },
    { wch: 18 }, { wch: 50 }, { wch: 20 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, "Notes");

  // Sheet 4: Follow-ups
  const ws4 = XLSX.utils.aoa_to_sheet([followUpHeaders, ...followUpRows]);
  ws4["!cols"] = [
    { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 22 },
    { wch: 15 }, { wch: 16 }, { wch: 15 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, ws4, "Follow-ups");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const uint8 = new Uint8Array(buf);
  const filename = `${project.project_name.replace(/[^a-zA-Z0-9]/g, "_")}_Pipeline_Report_${today}.xlsx`;

  return { buffer: uint8, filename };
}
