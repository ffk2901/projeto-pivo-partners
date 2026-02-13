/**
 * Migration Script: STARTUP_INVESTORS -> PROJECT_INVESTORS
 *
 * This script:
 * 1. Creates a "Default Project" for each startup that has no projects yet.
 * 2. Migrates rows from STARTUP_INVESTORS to PROJECT_INVESTORS (mapped to the default project).
 * 3. Maps old pipeline stages to new ones where possible.
 * 4. Is idempotent: safe to run multiple times without duplicating data.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/migrate_to_projects.ts
 *
 *   Or with tsx:
 *   npx tsx scripts/migrate_to_projects.ts
 *
 * Requirements:
 *   - .env file with GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY
 *   - PROJECTS and PROJECT_INVESTORS tabs must exist in the spreadsheet (with headers in row 1)
 *   - STARTUP_INVESTORS tab must exist (source data)
 */

import { google } from "googleapis";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// ============================================
// Config
// ============================================

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
  console.error("ERROR: Missing required environment variables.");
  console.error("Ensure .env has: GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY");
  process.exit(1);
}

// New pipeline stages
const NEW_STAGES = [
  "Potentials",
  "Initial Contact",
  "Advanced Contact",
  "Due Diligence",
  "Negotiation",
  "Declined",
  "Accepted",
];

// Stage mapping from common old stages to new ones
const STAGE_MAP: Record<string, string> = {
  // Exact matches (case insensitive handled below)
  "potentials": "Potentials",
  "target": "Potentials",
  "initial contact": "Initial Contact",
  "contacted": "Initial Contact",
  "advanced contact": "Advanced Contact",
  "meeting scheduled": "Advanced Contact",
  "meeting done": "Advanced Contact",
  "due diligence": "Due Diligence",
  "dd": "Due Diligence",
  "next steps": "Negotiation",
  "negotiation": "Negotiation",
  "negotiating": "Negotiation",
  "declined": "Declined",
  "passed": "Declined",
  "rejected": "Declined",
  "accepted": "Accepted",
  "closed": "Accepted",
  "committed": "Accepted",
};

function mapStage(oldStage: string): { stage: string; mapped: boolean; note: string } {
  if (!oldStage) return { stage: "Potentials", mapped: false, note: "Empty stage -> Potentials" };

  // Check if already a valid new stage
  if (NEW_STAGES.includes(oldStage)) return { stage: oldStage, mapped: true, note: "" };

  // Try case-insensitive mapping
  const mapped = STAGE_MAP[oldStage.toLowerCase().trim()];
  if (mapped) return { stage: mapped, mapped: true, note: `"${oldStage}" -> "${mapped}"` };

  // Unmappable
  return {
    stage: "Potentials",
    mapped: false,
    note: `Could not map "${oldStage}" -> defaulting to "Potentials"`,
  };
}

// ============================================
// Google Sheets client
// ============================================

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: SERVICE_ACCOUNT_EMAIL, private_key: PRIVATE_KEY },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function readTab(sheets: ReturnType<typeof getSheets>, tab: string, range: string): Promise<string[][]> {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID!,
      range: `${tab}!${range}`,
    });
    return (res.data.values as string[][]) || [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unable to parse range")) {
      console.error(`ERROR: Tab "${tab}" not found in the spreadsheet.`);
      console.error(`Please create the tab "${tab}" with the correct headers before running this migration.`);
      process.exit(1);
    }
    throw err;
  }
}

async function appendRows(sheets: ReturnType<typeof getSheets>, tab: string, range: string, rows: string[][]) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${tab}!${range}`,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${ts}_${rand}`;
}

// ============================================
// Migration
// ============================================

async function migrate() {
  console.log("=== Pivo Partners Migration: STARTUP_INVESTORS -> PROJECT_INVESTORS ===\n");

  const sheets = getSheets();

  // 1. Read existing data
  console.log("Reading existing data...");
  const startupRows = await readTab(sheets, "STARTUPS", "A2:H");
  const projectRows = await readTab(sheets, "PROJECTS", "A2:F");
  const siRows = await readTab(sheets, "STARTUP_INVESTORS", "A2:G");
  const piRows = await readTab(sheets, "PROJECT_INVESTORS", "A2:G");

  const startups = startupRows.filter((r) => r[0]).map((r) => ({
    startup_id: r[0], startup_name: r[1] || "", status: r[2] || "active",
  }));
  const existingProjects = projectRows.filter((r) => r[0]).map((r) => ({
    project_id: r[0], startup_id: r[1] || "", project_name: r[2] || "",
  }));
  const startupInvestors = siRows.filter((r) => r[0]).map((r) => ({
    link_id: r[0], startup_id: r[1] || "", investor_id: r[2] || "",
    stage: r[3] || "", last_update: r[4] || "", next_action: r[5] || "", notes: r[6] || "",
  }));
  const existingPiLinks = piRows.filter((r) => r[0]).map((r) => ({
    link_id: r[0], project_id: r[1] || "", investor_id: r[2] || "",
  }));

  console.log(`  Startups: ${startups.length}`);
  console.log(`  Existing projects: ${existingProjects.length}`);
  console.log(`  STARTUP_INVESTORS rows: ${startupInvestors.length}`);
  console.log(`  Existing PROJECT_INVESTORS rows: ${existingPiLinks.length}`);
  console.log();

  // 2. Create default projects for startups that have none
  const startupsWithProjects = new Set(existingProjects.map((p) => p.startup_id));
  const startupsNeedingProject = startups.filter((s) => !startupsWithProjects.has(s.startup_id));

  const newProjectRows: string[][] = [];
  const projectMap = new Map<string, string>(); // startup_id -> project_id

  // Map existing projects (use first project per startup as default)
  for (const p of existingProjects) {
    if (!projectMap.has(p.startup_id)) {
      projectMap.set(p.startup_id, p.project_id);
    }
  }

  // Create new default projects
  for (const s of startupsNeedingProject) {
    const projectId = generateId("prj");
    projectMap.set(s.startup_id, projectId);
    newProjectRows.push([
      projectId,
      s.startup_id,
      "Default Project",
      s.status || "active",
      new Date().toISOString(),
      "Auto-created by migration script",
    ]);
  }

  if (newProjectRows.length > 0) {
    console.log(`Creating ${newProjectRows.length} default project(s)...`);
    await appendRows(sheets, "PROJECTS", "A:F", newProjectRows);
    console.log("  Done.\n");
  } else {
    console.log("No new projects needed (all startups already have projects).\n");
  }

  // 3. Migrate STARTUP_INVESTORS -> PROJECT_INVESTORS
  // Build a set of existing PI links to avoid duplicates (by project_id + investor_id)
  const existingPiSet = new Set(
    existingPiLinks.map((l) => `${l.project_id}::${l.investor_id}`)
  );

  const newPiRows: string[][] = [];
  const stageIssues: string[] = [];
  let skippedDuplicates = 0;
  let skippedNoProject = 0;

  for (const si of startupInvestors) {
    const projectId = projectMap.get(si.startup_id);
    if (!projectId) {
      skippedNoProject++;
      stageIssues.push(`Skipped: startup_id="${si.startup_id}" has no project mapping`);
      continue;
    }

    // Check for duplicate
    const key = `${projectId}::${si.investor_id}`;
    if (existingPiSet.has(key)) {
      skippedDuplicates++;
      continue;
    }
    existingPiSet.add(key);

    // Map stage
    const { stage, mapped, note } = mapStage(si.stage);
    if (!mapped && note) stageIssues.push(note);

    const notes = si.notes
      ? (note ? `${si.notes} [Migration: ${note}]` : si.notes)
      : (note ? `[Migration: ${note}]` : "");

    newPiRows.push([
      generateId("pi"),
      projectId,
      si.investor_id,
      stage,
      si.last_update || new Date().toISOString().split("T")[0],
      si.next_action,
      notes,
    ]);
  }

  if (newPiRows.length > 0) {
    console.log(`Migrating ${newPiRows.length} investor link(s) to PROJECT_INVESTORS...`);
    await appendRows(sheets, "PROJECT_INVESTORS", "A:G", newPiRows);
    console.log("  Done.\n");
  } else {
    console.log("No new investor links to migrate.\n");
  }

  // 4. Report
  console.log("=== MIGRATION REPORT ===");
  console.log(`  Startups found:           ${startups.length}`);
  console.log(`  Default projects created: ${newProjectRows.length}`);
  console.log(`  Links migrated:           ${newPiRows.length}`);
  console.log(`  Skipped (duplicates):     ${skippedDuplicates}`);
  console.log(`  Skipped (no project):     ${skippedNoProject}`);
  console.log(`  Stage mapping issues:     ${stageIssues.length}`);

  if (stageIssues.length > 0) {
    console.log("\n--- Stage Mapping Issues ---");
    for (const issue of stageIssues) {
      console.log(`  - ${issue}`);
    }
  }

  console.log("\n=== Migration complete ===");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
