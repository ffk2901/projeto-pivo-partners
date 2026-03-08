import { NextRequest, NextResponse } from "next/server";
import {
  getProjectInvestors, getInvestors, getProjectNotes, getTasks,
  getMeetings, getProjects, getStartups, getTeam,
} from "@/lib/sheets";
import { getFollowUpStatus, getStalledStatus, FOLLOW_UP_STATUS_CONFIG } from "@/types";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

// ─── Premium Color Palette (Beige / Cream / Plum) ───────────────────────────
const COLORS = {
  // Backgrounds
  cream: "FFF8F4EE",
  warmWhite: "FFFDFBF7",
  lightBeige: "FFF3EDE4",
  beige: "FFE8DDD0",
  sand: "FFD4C5B0",
  // Text
  charcoal: "FF2D2926",
  darkGray: "FF4A4543",
  mediumGray: "FF7A7573",
  lightGray: "FFB5B0AD",
  // Accents
  plum: "FF5B3A5E",
  darkBrown: "FF5C4033",
  deepTeal: "FF2E5E5A",
  // Status colors (muted, elegant)
  statusOverdueBg: "FFFCE8E8",
  statusOverdueText: "FF9B2C2C",
  statusOverdueBorder: "FFEAB0B0",
  statusDueSoonBg: "FFFFF8E7",
  statusDueSoonText: "FF92600E",
  statusDueSoonBorder: "FFE8D5A0",
  statusScheduledBg: "FFEEF4FA",
  statusScheduledText: "FF2B5EA7",
  statusNoFollowUpBg: "FFF5F0EB",
  statusNoFollowUpText: "FF6B5B50",
  statusStalledBg: "FFFFF0E5",
  statusStalledText: "FF8B5E2F",
  // Stage colors (muted, business-friendly)
  stagePipeline: "FFE8E0D8",
  stageOnHold: "FFEAE5DF",
  stageTrying: "FFDEE8E7",
  stageActive: "FFDCE7E4",
  stageAdvanced: "FFDDD5E3",
  stageDeclined: "FFE8E0DC",
  // KPI card backgrounds
  kpiBlue: "FFEBF0F7",
  kpiGreen: "FFECF4EE",
  kpiAmber: "FFFEF7EC",
  kpiRed: "FFFCEDEF",
  kpiPurple: "FFF3EDF5",
  kpiGray: "FFF0EDEB",
  // Misc
  white: "FFFFFFFF",
  tableHeaderBg: "FF5B3A5E",
  tableHeaderText: "FFFFFFFF",
  zebraLight: "FFFDFBF7",
  zebraDark: "FFF8F4EE",
  borderLight: "FFE0D6CC",
  borderMedium: "FFD0C4B8",
};

// ─── Font definitions ────────────────────────────────────────────────────────
const FONTS = {
  title: { name: "Calibri", size: 22, bold: true, color: { argb: COLORS.plum } },
  subtitle: { name: "Calibri", size: 13, color: { argb: COLORS.darkGray } },
  sectionHeader: { name: "Calibri", size: 14, bold: true, color: { argb: COLORS.plum } },
  kpiValue: { name: "Calibri", size: 20, bold: true, color: { argb: COLORS.charcoal } },
  kpiLabel: { name: "Calibri", size: 10, color: { argb: COLORS.mediumGray } },
  tableHeader: { name: "Calibri", size: 10, bold: true, color: { argb: COLORS.tableHeaderText } },
  tableBody: { name: "Calibri", size: 10, color: { argb: COLORS.charcoal } },
  tableBodyMuted: { name: "Calibri", size: 10, color: { argb: COLORS.mediumGray } },
  small: { name: "Calibri", size: 9, color: { argb: COLORS.mediumGray } },
  bold: { name: "Calibri", size: 10, bold: true, color: { argb: COLORS.charcoal } },
  bodyDark: { name: "Calibri", size: 11, color: { argb: COLORS.charcoal } },
  bodyLabel: { name: "Calibri", size: 11, bold: true, color: { argb: COLORS.darkBrown } },
  priorityItemTitle: { name: "Calibri", size: 10, bold: true, color: { argb: COLORS.darkBrown } },
  priorityItemBody: { name: "Calibri", size: 10, color: { argb: COLORS.darkGray } },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function thinBorder(color = COLORS.borderLight): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: color } };
  return { top: side, bottom: side, left: side, right: side };
}

function getStageColor(stage: string): string {
  const map: Record<string, string> = {
    "Pipeline": COLORS.stagePipeline,
    "On Hold": COLORS.stageOnHold,
    "Trying to reach": COLORS.stageTrying,
    "Active": COLORS.stageActive,
    "Advanced": COLORS.stageAdvanced,
    "Declined": COLORS.stageDeclined,
  };
  return map[stage] || COLORS.lightBeige;
}

function getStatusStyle(status: string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    "Overdue": { bg: COLORS.statusOverdueBg, text: COLORS.statusOverdueText, border: COLORS.statusOverdueBorder },
    "Due Soon": { bg: COLORS.statusDueSoonBg, text: COLORS.statusDueSoonText, border: COLORS.statusDueSoonBorder },
    "Scheduled": { bg: COLORS.statusScheduledBg, text: COLORS.statusScheduledText, border: COLORS.borderLight },
    "No Follow-up": { bg: COLORS.statusNoFollowUpBg, text: COLORS.statusNoFollowUpText, border: COLORS.borderLight },
    "Stalled": { bg: COLORS.statusStalledBg, text: COLORS.statusStalledText, border: COLORS.borderLight },
  };
  return map[status] || { bg: COLORS.warmWhite, text: COLORS.charcoal, border: COLORS.borderLight };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ─── Data Gathering ──────────────────────────────────────────────────────────
interface InvestorRow {
  investor_name: string;
  investor_type: string;
  stage: string;
  owner: string;
  priority: string;
  last_interaction_date: string;
  last_interaction_type: string;
  next_step: string;
  follow_up_date: string;
  follow_up_status: string;
  follow_up_status_label: string;
  is_stalled: boolean;
  latest_update: string;
  upcoming_meeting: string;
  open_tasks_count: number;
}

async function gatherReportData(projectId: string) {
  const [allPI, allInvestors, allNotes, allTasks, allMeetings, allProjects, allStartups, team] =
    await Promise.all([
      getProjectInvestors(), getInvestors(), getProjectNotes(), getTasks(),
      getMeetings(), getProjects(), getStartups(), getTeam(),
    ]);

  const project = allProjects.find((p) => p.project_id === projectId);
  if (!project) throw new Error("Project not found");
  const startup = allStartups.find((s) => s.startup_id === project.startup_id);

  const piLinks = allPI.filter((pi) => pi.project_id === projectId);
  const projectNotes = allNotes.filter((n) => n.project_id === projectId);
  const projectTasks = allTasks.filter((t) => t.project_id === projectId);
  const projectMeetings = allMeetings.filter((m) => m.project_id === projectId);
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Stage counts
  const stageCounts: Record<string, number> = {};
  piLinks.forEach((pi) => {
    stageCounts[pi.stage] = (stageCounts[pi.stage] || 0) + 1;
  });

  // Build investor rows
  const investorRows: InvestorRow[] = piLinks.map((pi) => {
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
    const isStalled = getStalledStatus(pi);

    return {
      investor_name: investor?.investor_name || pi.investor_id,
      investor_type: investor?.tags?.split(";")[0]?.trim() || "",
      stage: pi.stage,
      owner: owner?.name || pi.owner_id || "",
      priority: pi.priority || "",
      last_interaction_date: pi.last_interaction_date || pi.last_update || "",
      last_interaction_type: pi.last_interaction_type || "",
      next_step: pi.next_step || pi.next_action || "",
      follow_up_date: pi.follow_up_date || "",
      follow_up_status: followUpStatus,
      follow_up_status_label: isStalled ? "Stalled" : (FOLLOW_UP_STATUS_CONFIG[followUpStatus]?.label || ""),
      is_stalled: isStalled,
      latest_update: pi.latest_update || latestNote?.content?.substring(0, 200) || "",
      upcoming_meeting: upcomingMeeting ? `${upcomingMeeting.title} (${upcomingMeeting.date})` : "",
      open_tasks_count: openTaskCount,
    };
  });

  // Follow-ups needing attention
  const actionItems = investorRows.filter(
    (row) =>
      row.follow_up_status === "overdue" ||
      row.follow_up_status === "due_soon" ||
      row.follow_up_status === "no_follow_up" ||
      row.is_stalled ||
      row.priority === "high"
  );

  // Sort action items by urgency
  const urgencyOrder: Record<string, number> = {
    "Overdue": 0, "Stalled": 1, "Due Soon": 2, "No Follow-up": 3, "Scheduled": 4,
  };
  actionItems.sort((a, b) => {
    const aOrder = urgencyOrder[a.follow_up_status_label] ?? 5;
    const bOrder = urgencyOrder[b.follow_up_status_label] ?? 5;
    return aOrder - bOrder;
  });

  // Upcoming follow-ups in next 7 days
  const next7DaysFollowUps = investorRows.filter((row) => {
    if (!row.follow_up_date) return false;
    return row.follow_up_date >= today && row.follow_up_date <= sevenDaysFromNow;
  });

  // Upcoming meetings in next 7 days
  const next7DaysMeetings = projectMeetings.filter(
    (m) => m.date >= today && m.date <= sevenDaysFromNow && m.status === "scheduled"
  );

  // Missing next steps
  const missingNextSteps = investorRows.filter(
    (row) => !row.next_step && ["Active", "Advanced", "Trying to reach"].includes(row.stage)
  );

  return {
    project,
    startup,
    stageCounts,
    investorRows,
    actionItems,
    next7DaysFollowUps,
    next7DaysMeetings,
    missingNextSteps,
    team,
    today,
    overdueCount: investorRows.filter((r) => r.follow_up_status === "overdue").length,
    dueSoonCount: investorRows.filter((r) => r.follow_up_status === "due_soon").length,
    noFollowUpCount: investorRows.filter((r) => r.follow_up_status === "no_follow_up").length,
    stalledCount: investorRows.filter((r) => r.is_stalled).length,
    activeCount: (stageCounts["Active"] || 0) + (stageCounts["Trying to reach"] || 0),
    advancedCount: stageCounts["Advanced"] || 0,
    onHoldCount: stageCounts["On Hold"] || 0,
    declinedCount: stageCounts["Declined"] || 0,
  };
}

// ─── Sheet 1: Executive Summary ─────────────────────────────────────────────
function buildSummarySheet(wb: ExcelJS.Workbook, data: Awaited<ReturnType<typeof gatherReportData>>) {
  const ws = wb.addWorksheet("Executive Summary", {
    properties: { tabColor: { argb: COLORS.plum } },
    views: [{ showGridLines: false }],
  });

  // Column widths
  ws.columns = [
    { width: 3 },   // A - left margin
    { width: 22 },  // B
    { width: 18 },  // C
    { width: 18 },  // D
    { width: 18 },  // E
    { width: 18 },  // F
    { width: 18 },  // G
    { width: 18 },  // H
    { width: 3 },   // I - right margin
  ];

  // Fill entire visible area with warm white
  for (let r = 1; r <= 80; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 9; c++) {
      row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.warmWhite } };
    }
  }

  let currentRow = 2;

  // ── Title Block ──
  ws.mergeCells(`B${currentRow}:H${currentRow}`);
  const titleCell = ws.getCell(`B${currentRow}`);
  titleCell.value = "Fundraising Pipeline Report";
  titleCell.font = FONTS.title;
  titleCell.alignment = { vertical: "middle" };
  currentRow++;

  // Accent line under title
  ws.mergeCells(`B${currentRow}:H${currentRow}`);
  const accentCell = ws.getCell(`B${currentRow}`);
  accentCell.border = { bottom: { style: "medium", color: { argb: COLORS.plum } } };
  ws.getRow(currentRow).height = 8;
  currentRow++;

  // Project / Startup / Date
  currentRow++;
  const infoItems = [
    ["Project", data.project.project_name],
    ["Startup", data.startup?.startup_name || "—"],
    ["Generated", new Date().toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
      month: "long", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })],
  ];
  for (const [label, value] of infoItems) {
    ws.getCell(`B${currentRow}`).value = label;
    ws.getCell(`B${currentRow}`).font = FONTS.bodyLabel;
    ws.getCell(`B${currentRow}`).alignment = { vertical: "middle" };
    ws.mergeCells(`C${currentRow}:E${currentRow}`);
    ws.getCell(`C${currentRow}`).value = value;
    ws.getCell(`C${currentRow}`).font = FONTS.bodyDark;
    ws.getCell(`C${currentRow}`).alignment = { vertical: "middle" };
    ws.getRow(currentRow).height = 22;
    currentRow++;
  }

  currentRow += 2;

  // ── KPI Cards ──
  ws.mergeCells(`B${currentRow}:H${currentRow}`);
  const kpiHeader = ws.getCell(`B${currentRow}`);
  kpiHeader.value = "KEY METRICS";
  kpiHeader.font = FONTS.sectionHeader;
  kpiHeader.alignment = { vertical: "middle" };
  for (let c = 2; c <= 8; c++) {
    ws.getCell(currentRow, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.cream } };
    ws.getCell(currentRow, c).border = { bottom: { style: "thin", color: { argb: COLORS.plum } } };
  }
  ws.getRow(currentRow).height = 28;
  currentRow += 2;

  const kpis = [
    { label: "Total Investors", value: data.investorRows.length, bg: COLORS.kpiBlue, col: "B" },
    { label: "Active", value: data.activeCount, bg: COLORS.kpiGreen, col: "C" },
    { label: "Advanced", value: data.advancedCount, bg: COLORS.kpiPurple, col: "D" },
    { label: "On Hold", value: data.onHoldCount, bg: COLORS.kpiAmber, col: "E" },
    { label: "Declined", value: data.declinedCount, bg: COLORS.kpiGray, col: "F" },
    { label: "Overdue", value: data.overdueCount, bg: COLORS.kpiRed, col: "G" },
    { label: "Due Soon", value: data.dueSoonCount, bg: COLORS.kpiAmber, col: "H" },
  ];

  // KPI Value row
  const valueRow = currentRow;
  const labelRow = currentRow + 1;
  ws.getRow(valueRow).height = 36;
  ws.getRow(labelRow).height = 22;

  for (const kpi of kpis) {
    const vCell = ws.getCell(`${kpi.col}${valueRow}`);
    vCell.value = kpi.value;
    vCell.font = FONTS.kpiValue;
    vCell.alignment = { horizontal: "center", vertical: "middle" };
    vCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: kpi.bg } };
    vCell.border = thinBorder(COLORS.borderLight);

    const lCell = ws.getCell(`${kpi.col}${labelRow}`);
    lCell.value = kpi.label;
    lCell.font = FONTS.kpiLabel;
    lCell.alignment = { horizontal: "center", vertical: "middle" };
    lCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: kpi.bg } };
    lCell.border = thinBorder(COLORS.borderLight);
  }
  currentRow = labelRow + 3;

  // ── Stage Distribution ──
  ws.mergeCells(`B${currentRow}:H${currentRow}`);
  const stageHeader = ws.getCell(`B${currentRow}`);
  stageHeader.value = "PIPELINE STAGE DISTRIBUTION";
  stageHeader.font = FONTS.sectionHeader;
  for (let c = 2; c <= 8; c++) {
    ws.getCell(currentRow, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.cream } };
    ws.getCell(currentRow, c).border = { bottom: { style: "thin", color: { argb: COLORS.plum } } };
  }
  ws.getRow(currentRow).height = 28;
  currentRow += 2;

  // Stage table header
  ws.getCell(`B${currentRow}`).value = "Stage";
  ws.getCell(`B${currentRow}`).font = FONTS.bold;
  ws.getCell(`C${currentRow}`).value = "Count";
  ws.getCell(`C${currentRow}`).font = FONTS.bold;
  ws.mergeCells(`D${currentRow}:H${currentRow}`);
  ws.getCell(`D${currentRow}`).value = "Investors";
  ws.getCell(`D${currentRow}`).font = FONTS.bold;
  for (let c = 2; c <= 8; c++) {
    ws.getCell(currentRow, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.beige } };
    ws.getCell(currentRow, c).border = thinBorder(COLORS.borderLight);
    ws.getCell(currentRow, c).alignment = { vertical: "middle" };
  }
  ws.getRow(currentRow).height = 24;
  currentRow++;

  const stageOrder = ["Pipeline", "Trying to reach", "Active", "Advanced", "On Hold", "Declined"];
  const allStages = Array.from(new Set([...stageOrder, ...Object.keys(data.stageCounts)]));
  for (const stage of allStages) {
    const count = data.stageCounts[stage] || 0;
    if (count === 0) continue;
    const names = data.investorRows.filter((r) => r.stage === stage).map((r) => r.investor_name);

    ws.getCell(`B${currentRow}`).value = stage;
    ws.getCell(`B${currentRow}`).font = FONTS.tableBody;
    ws.getCell(`B${currentRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: getStageColor(stage) } };

    ws.getCell(`C${currentRow}`).value = count;
    ws.getCell(`C${currentRow}`).font = FONTS.bold;
    ws.getCell(`C${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };

    ws.mergeCells(`D${currentRow}:H${currentRow}`);
    ws.getCell(`D${currentRow}`).value = names.join(", ");
    ws.getCell(`D${currentRow}`).font = FONTS.tableBody;
    ws.getCell(`D${currentRow}`).alignment = { wrapText: true, vertical: "middle" };

    for (let c = 2; c <= 8; c++) {
      ws.getCell(currentRow, c).border = thinBorder(COLORS.borderLight);
      if (c >= 3 && c <= 8 && c !== 2) {
        ws.getCell(currentRow, c).fill = ws.getCell(currentRow, c).fill || { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.warmWhite } };
      }
    }
    ws.getRow(currentRow).height = Math.max(22, Math.ceil(names.join(", ").length / 70) * 16);
    currentRow++;
  }

  currentRow += 2;

  // ── Top Priorities for This Meeting ──
  ws.mergeCells(`B${currentRow}:H${currentRow}`);
  const priorityHeader = ws.getCell(`B${currentRow}`);
  priorityHeader.value = "TOP PRIORITIES FOR THIS MEETING";
  priorityHeader.font = FONTS.sectionHeader;
  for (let c = 2; c <= 8; c++) {
    ws.getCell(currentRow, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.cream } };
    ws.getCell(currentRow, c).border = { bottom: { style: "thin", color: { argb: COLORS.plum } } };
  }
  ws.getRow(currentRow).height = 28;
  currentRow += 2;

  const priorities: Array<{ category: string; items: InvestorRow[] }> = [];

  const overdueInvestors = data.actionItems.filter((r) => r.follow_up_status === "overdue");
  if (overdueInvestors.length > 0) priorities.push({ category: "Overdue Follow-ups", items: overdueInvestors });

  const highPriorityInvestors = data.investorRows.filter((r) => r.priority === "high" && r.follow_up_status !== "overdue");
  if (highPriorityInvestors.length > 0) priorities.push({ category: "High Priority Investors", items: highPriorityInvestors });

  if (data.missingNextSteps.length > 0) priorities.push({ category: "Missing Next Steps", items: data.missingNextSteps });

  const stalledInvestors = data.actionItems.filter((r) => r.is_stalled && r.follow_up_status !== "overdue");
  if (stalledInvestors.length > 0) priorities.push({ category: "Stalled Investors", items: stalledInvestors });

  if (priorities.length === 0) {
    ws.mergeCells(`B${currentRow}:H${currentRow}`);
    ws.getCell(`B${currentRow}`).value = "No urgent items — pipeline is on track.";
    ws.getCell(`B${currentRow}`).font = { ...FONTS.bodyDark, italic: true };
    currentRow++;
  } else {
    for (const group of priorities) {
      ws.mergeCells(`B${currentRow}:H${currentRow}`);
      const catCell = ws.getCell(`B${currentRow}`);
      catCell.value = `▸ ${group.category}`;
      catCell.font = FONTS.priorityItemTitle;
      for (let c = 2; c <= 8; c++) {
        ws.getCell(currentRow, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.lightBeige } };
      }
      ws.getRow(currentRow).height = 22;
      currentRow++;

      for (const item of group.items) {
        ws.mergeCells(`B${currentRow}:C${currentRow}`);
        ws.getCell(`B${currentRow}`).value = `    ${item.investor_name}`;
        ws.getCell(`B${currentRow}`).font = FONTS.priorityItemBody;

        ws.getCell(`D${currentRow}`).value = item.stage;
        ws.getCell(`D${currentRow}`).font = FONTS.small;

        ws.getCell(`E${currentRow}`).value = item.owner;
        ws.getCell(`E${currentRow}`).font = FONTS.small;

        ws.mergeCells(`F${currentRow}:H${currentRow}`);
        ws.getCell(`F${currentRow}`).value = item.next_step || "(no next step defined)";
        ws.getCell(`F${currentRow}`).font = FONTS.small;
        ws.getCell(`F${currentRow}`).alignment = { wrapText: true };

        ws.getRow(currentRow).height = 18;
        currentRow++;
      }
      currentRow++;
    }
  }

  currentRow += 1;

  // ── Next 7 Days ──
  ws.mergeCells(`B${currentRow}:H${currentRow}`);
  const next7Header = ws.getCell(`B${currentRow}`);
  next7Header.value = "NEXT 7 DAYS";
  next7Header.font = FONTS.sectionHeader;
  for (let c = 2; c <= 8; c++) {
    ws.getCell(currentRow, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.cream } };
    ws.getCell(currentRow, c).border = { bottom: { style: "thin", color: { argb: COLORS.plum } } };
  }
  ws.getRow(currentRow).height = 28;
  currentRow += 2;

  // Upcoming follow-ups
  ws.mergeCells(`B${currentRow}:H${currentRow}`);
  ws.getCell(`B${currentRow}`).value = "▸ Upcoming Follow-ups";
  ws.getCell(`B${currentRow}`).font = FONTS.priorityItemTitle;
  for (let c = 2; c <= 8; c++) {
    ws.getCell(currentRow, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.lightBeige } };
  }
  currentRow++;

  if (data.next7DaysFollowUps.length === 0) {
    ws.mergeCells(`B${currentRow}:H${currentRow}`);
    ws.getCell(`B${currentRow}`).value = "    No follow-ups scheduled in the next 7 days.";
    ws.getCell(`B${currentRow}`).font = { ...FONTS.small, italic: true };
    currentRow++;
  } else {
    for (const item of data.next7DaysFollowUps) {
      ws.mergeCells(`B${currentRow}:C${currentRow}`);
      ws.getCell(`B${currentRow}`).value = `    ${item.investor_name}`;
      ws.getCell(`B${currentRow}`).font = FONTS.priorityItemBody;
      ws.getCell(`D${currentRow}`).value = formatDate(item.follow_up_date);
      ws.getCell(`D${currentRow}`).font = FONTS.small;
      ws.getCell(`E${currentRow}`).value = item.owner;
      ws.getCell(`E${currentRow}`).font = FONTS.small;
      ws.mergeCells(`F${currentRow}:H${currentRow}`);
      ws.getCell(`F${currentRow}`).value = item.next_step || "—";
      ws.getCell(`F${currentRow}`).font = FONTS.small;
      ws.getRow(currentRow).height = 18;
      currentRow++;
    }
  }
  currentRow++;

  // Upcoming meetings
  ws.mergeCells(`B${currentRow}:H${currentRow}`);
  ws.getCell(`B${currentRow}`).value = "▸ Upcoming Meetings";
  ws.getCell(`B${currentRow}`).font = FONTS.priorityItemTitle;
  for (let c = 2; c <= 8; c++) {
    ws.getCell(currentRow, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.lightBeige } };
  }
  currentRow++;

  if (data.next7DaysMeetings.length === 0) {
    ws.mergeCells(`B${currentRow}:H${currentRow}`);
    ws.getCell(`B${currentRow}`).value = "    No meetings scheduled in the next 7 days.";
    ws.getCell(`B${currentRow}`).font = { ...FONTS.small, italic: true };
    currentRow++;
  } else {
    for (const mtg of data.next7DaysMeetings) {
      const inv = data.investorRows.find((r) => r.upcoming_meeting.includes(mtg.title));
      ws.mergeCells(`B${currentRow}:C${currentRow}`);
      ws.getCell(`B${currentRow}`).value = `    ${mtg.title}`;
      ws.getCell(`B${currentRow}`).font = FONTS.priorityItemBody;
      ws.getCell(`D${currentRow}`).value = formatDate(mtg.date);
      ws.getCell(`D${currentRow}`).font = FONTS.small;
      ws.getCell(`E${currentRow}`).value = mtg.time || "";
      ws.getCell(`E${currentRow}`).font = FONTS.small;
      ws.mergeCells(`F${currentRow}:H${currentRow}`);
      ws.getCell(`F${currentRow}`).value = inv?.investor_name || mtg.participants || "";
      ws.getCell(`F${currentRow}`).font = FONTS.small;
      ws.getRow(currentRow).height = 18;
      currentRow++;
    }
  }

  // Footer
  currentRow += 3;
  ws.mergeCells(`B${currentRow}:H${currentRow}`);
  ws.getCell(`B${currentRow}`).value = "Pivô Partners · Confidential";
  ws.getCell(`B${currentRow}`).font = { ...FONTS.small, italic: true, color: { argb: COLORS.lightGray } };
  ws.getCell(`B${currentRow}`).alignment = { horizontal: "center" };

  return ws;
}

// ─── Sheet 2: Pipeline Detail ────────────────────────────────────────────────
function buildPipelineSheet(wb: ExcelJS.Workbook, data: Awaited<ReturnType<typeof gatherReportData>>) {
  const ws = wb.addWorksheet("Pipeline Detail", {
    properties: { tabColor: { argb: COLORS.deepTeal } },
    views: [{ state: "frozen", ySplit: 3, showGridLines: false }],
  });

  const headers = [
    { header: "Investor", width: 24, key: "investor" },
    { header: "Type", width: 14, key: "type" },
    { header: "Stage", width: 16, key: "stage" },
    { header: "Owner", width: 16, key: "owner" },
    { header: "Last Interaction", width: 16, key: "lastDate" },
    { header: "Interaction Type", width: 16, key: "lastType" },
    { header: "Next Step", width: 28, key: "nextStep" },
    { header: "Follow-up Date", width: 16, key: "followUpDate" },
    { header: "Follow-up Status", width: 16, key: "followUpStatus" },
    { header: "Latest Update / Notes", width: 36, key: "latestUpdate" },
    { header: "Upcoming Meeting", width: 22, key: "meeting" },
    { header: "Open Tasks", width: 12, key: "tasks" },
  ];

  ws.columns = headers.map((h) => ({ width: h.width, key: h.key }));

  // ── Sheet title row ──
  let currentRow = 1;
  ws.mergeCells(`A${currentRow}:L${currentRow}`);
  const sheetTitle = ws.getCell(`A${currentRow}`);
  sheetTitle.value = `Pipeline Detail — ${data.project.project_name}`;
  sheetTitle.font = { ...FONTS.sectionHeader, size: 16 };
  sheetTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.cream } };
  sheetTitle.alignment = { vertical: "middle" };
  sheetTitle.border = { bottom: { style: "medium", color: { argb: COLORS.plum } } };
  ws.getRow(currentRow).height = 36;
  currentRow++;

  // Subtitle row with date
  ws.mergeCells(`A${currentRow}:L${currentRow}`);
  ws.getCell(`A${currentRow}`).value = `Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", month: "long", day: "numeric", year: "numeric" })}  ·  ${data.investorRows.length} investors`;
  ws.getCell(`A${currentRow}`).font = FONTS.small;
  ws.getCell(`A${currentRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.cream } };
  ws.getCell(`A${currentRow}`).alignment = { vertical: "middle" };
  ws.getRow(currentRow).height = 22;
  currentRow++;

  // ── Header row ──
  const headerRow = ws.getRow(currentRow);
  headerRow.height = 30;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h.header;
    cell.font = FONTS.tableHeader;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.tableHeaderBg } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder(COLORS.plum);
  });
  currentRow++;

  // ── Data rows ──
  // Sort by stage order, then by investor name
  const stageOrder: Record<string, number> = {
    "Advanced": 0, "Active": 1, "Trying to reach": 2, "Pipeline": 3, "On Hold": 4, "Declined": 5,
  };
  const sortedRows = [...data.investorRows].sort((a, b) => {
    const sa = stageOrder[a.stage] ?? 3;
    const sb = stageOrder[b.stage] ?? 3;
    if (sa !== sb) return sa - sb;
    return a.investor_name.localeCompare(b.investor_name);
  });

  sortedRows.forEach((inv, idx) => {
    const row = ws.getRow(currentRow);
    const isZebra = idx % 2 === 1;
    const bgColor = isZebra ? COLORS.zebraDark : COLORS.zebraLight;
    row.height = 28;

    const values = [
      inv.investor_name,
      inv.investor_type,
      inv.stage,
      inv.owner,
      formatDate(inv.last_interaction_date),
      inv.last_interaction_type,
      inv.next_step || "—",
      formatDate(inv.follow_up_date),
      inv.follow_up_status_label,
      inv.latest_update || "—",
      inv.upcoming_meeting || "—",
      inv.open_tasks_count,
    ];

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = FONTS.tableBody;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.border = thinBorder(COLORS.borderLight);
      cell.alignment = { vertical: "middle", wrapText: colIdx === 6 || colIdx === 9 };
    });

    // ── Column-specific styling ──

    // Investor name bold
    row.getCell(1).font = FONTS.bold;

    // Stage cell colored
    const stageCell = row.getCell(3);
    stageCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: getStageColor(inv.stage) } };
    stageCell.alignment = { horizontal: "center", vertical: "middle" };

    // Follow-up status styled
    const statusCell = row.getCell(9);
    const statusStyle = getStatusStyle(inv.follow_up_status_label);
    statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusStyle.bg } };
    statusCell.font = { ...FONTS.tableBody, bold: true, color: { argb: statusStyle.text } };
    statusCell.alignment = { horizontal: "center", vertical: "middle" };

    // Follow-up date - highlight if overdue
    if (inv.follow_up_status === "overdue") {
      const dateCell = row.getCell(8);
      dateCell.font = { ...FONTS.tableBody, bold: true, color: { argb: COLORS.statusOverdueText } };
    }

    // Open tasks center aligned
    row.getCell(12).alignment = { horizontal: "center", vertical: "middle" };

    // Priority indicator on investor name
    if (inv.priority === "high") {
      row.getCell(1).font = { ...FONTS.bold, color: { argb: COLORS.plum } };
    }

    // Muted styling for Declined / On Hold
    if (inv.stage === "Declined" || inv.stage === "On Hold") {
      for (let c = 1; c <= 12; c++) {
        const cell = row.getCell(c);
        if (c !== 3 && c !== 9) {
          cell.font = { ...FONTS.tableBodyMuted };
        }
      }
    }

    currentRow++;
  });

  // Auto-filter on header row
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: currentRow - 1, column: 12 } };

  return ws;
}

// ─── Sheet 3: Follow-up Action List ──────────────────────────────────────────
function buildFollowUpSheet(wb: ExcelJS.Workbook, data: Awaited<ReturnType<typeof gatherReportData>>) {
  const ws = wb.addWorksheet("Action Items", {
    properties: { tabColor: { argb: COLORS.darkBrown } },
    views: [{ state: "frozen", ySplit: 3, showGridLines: false }],
  });

  const headers = [
    { header: "Investor", width: 24 },
    { header: "Stage", width: 16 },
    { header: "Owner", width: 16 },
    { header: "Next Step", width: 30 },
    { header: "Follow-up Date", width: 16 },
    { header: "Status", width: 16 },
    { header: "Latest Update", width: 36 },
    { header: "Upcoming Meeting", width: 22 },
  ];

  ws.columns = headers.map((h) => ({ width: h.width }));

  // ── Sheet title ──
  let currentRow = 1;
  ws.mergeCells(`A${currentRow}:H${currentRow}`);
  const sheetTitle = ws.getCell(`A${currentRow}`);
  sheetTitle.value = "Action Items — Investors Requiring Attention";
  sheetTitle.font = { ...FONTS.sectionHeader, size: 16 };
  sheetTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.cream } };
  sheetTitle.alignment = { vertical: "middle" };
  sheetTitle.border = { bottom: { style: "medium", color: { argb: COLORS.plum } } };
  ws.getRow(currentRow).height = 36;
  currentRow++;

  // Summary line
  ws.mergeCells(`A${currentRow}:H${currentRow}`);
  const summaryText = [
    data.overdueCount > 0 ? `${data.overdueCount} overdue` : null,
    data.dueSoonCount > 0 ? `${data.dueSoonCount} due soon` : null,
    data.stalledCount > 0 ? `${data.stalledCount} stalled` : null,
    data.missingNextSteps.length > 0 ? `${data.missingNextSteps.length} missing next steps` : null,
  ].filter(Boolean).join("  ·  ");
  ws.getCell(`A${currentRow}`).value = summaryText || "No urgent action items";
  ws.getCell(`A${currentRow}`).font = FONTS.small;
  ws.getCell(`A${currentRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.cream } };
  ws.getCell(`A${currentRow}`).alignment = { vertical: "middle" };
  ws.getRow(currentRow).height = 22;
  currentRow++;

  // ── Header row ──
  const headerRow = ws.getRow(currentRow);
  headerRow.height = 30;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h.header;
    cell.font = FONTS.tableHeader;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.tableHeaderBg } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder(COLORS.plum);
  });
  currentRow++;

  // ── Data rows (sorted by urgency) ──
  if (data.actionItems.length === 0) {
    ws.mergeCells(`A${currentRow}:H${currentRow}`);
    ws.getCell(`A${currentRow}`).value = "No action items — all investors are on track.";
    ws.getCell(`A${currentRow}`).font = { ...FONTS.bodyDark, italic: true };
    ws.getCell(`A${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(currentRow).height = 40;
  } else {
    data.actionItems.forEach((inv, idx) => {
      const row = ws.getRow(currentRow);
      const isOverdue = inv.follow_up_status === "overdue";
      const isStalled = inv.is_stalled;
      const isDueSoon = inv.follow_up_status === "due_soon";

      // Row background based on urgency
      let rowBg = idx % 2 === 0 ? COLORS.zebraLight : COLORS.zebraDark;
      if (isOverdue) rowBg = COLORS.statusOverdueBg;
      else if (isStalled) rowBg = COLORS.statusStalledBg;

      row.height = 28;

      const values = [
        inv.investor_name,
        inv.stage,
        inv.owner,
        inv.next_step || "(no next step defined)",
        formatDate(inv.follow_up_date),
        inv.follow_up_status_label,
        inv.latest_update || "—",
        inv.upcoming_meeting || "—",
      ];

      values.forEach((val, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.value = val;
        cell.font = FONTS.tableBody;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.border = thinBorder(COLORS.borderLight);
        cell.alignment = { vertical: "middle", wrapText: colIdx === 3 || colIdx === 6 };
      });

      // Investor name bold
      row.getCell(1).font = { ...FONTS.bold, color: { argb: isOverdue ? COLORS.statusOverdueText : COLORS.charcoal } };

      // Stage cell colored
      const stageCell = row.getCell(2);
      stageCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: getStageColor(inv.stage) } };
      stageCell.alignment = { horizontal: "center", vertical: "middle" };

      // Status styled
      const statusCell = row.getCell(6);
      const statusStyle = getStatusStyle(inv.follow_up_status_label);
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusStyle.bg } };
      statusCell.font = { ...FONTS.tableBody, bold: true, color: { argb: statusStyle.text } };
      statusCell.alignment = { horizontal: "center", vertical: "middle" };

      // Follow-up date emphasis
      if (isOverdue) {
        row.getCell(5).font = { ...FONTS.tableBody, bold: true, color: { argb: COLORS.statusOverdueText } };
      } else if (isDueSoon) {
        row.getCell(5).font = { ...FONTS.tableBody, bold: true, color: { argb: COLORS.statusDueSoonText } };
      }

      // Missing next step emphasis
      if (!inv.next_step) {
        row.getCell(4).font = { ...FONTS.tableBody, italic: true, color: { argb: COLORS.statusOverdueText } };
      }

      currentRow++;
    });
  }

  // Auto-filter
  if (data.actionItems.length > 0) {
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: currentRow - 1, column: 8 } };
  }

  // Footer
  currentRow += 2;
  ws.mergeCells(`A${currentRow}:H${currentRow}`);
  ws.getCell(`A${currentRow}`).value = "Sorted by urgency: Overdue → Stalled → Due Soon → No Follow-up";
  ws.getCell(`A${currentRow}`).font = { ...FONTS.small, italic: true };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: "center" };

  return ws;
}

// ─── Main Route Handler ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    if (!projectId) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    // Gather all data
    const data = await gatherReportData(projectId);

    // Build workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = "Pivô Partners";
    wb.created = new Date();

    buildSummarySheet(wb, data);
    buildPipelineSheet(wb, data);
    buildFollowUpSheet(wb, data);

    // Export
    const buffer = await wb.xlsx.writeBuffer();
    const today = new Date().toISOString().split("T")[0];
    const filename = `${data.project.project_name.replace(/[^a-zA-Z0-9]/g, "_")}_Pipeline_Report_${today}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
