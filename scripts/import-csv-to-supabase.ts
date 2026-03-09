/**
 * Import CSV files into Supabase Postgres.
 *
 * Run with: npx tsx scripts/import-csv-to-supabase.ts
 *
 * Prerequisites:
 *  1. Run 001-create-schema.sql in Supabase SQL Editor
 *  2. Run export-sheets-to-csv.ts to generate /migration-data/*.csv
 *  3. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// CSV parsing
// ============================================

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i] || "";
    });
    return obj;
  });
}

// ============================================
// Import logic
// ============================================

async function importTable(
  tableName: string,
  csvFile: string,
  transform?: (row: Record<string, string>) => Record<string, unknown>
) {
  const filePath = path.resolve(__dirname, "..", "migration-data", csvFile);
  if (!fs.existsSync(filePath)) {
    console.log(`  ${csvFile}: not found, skipping`);
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const rows = parseCsv(content);
  if (rows.length === 0) {
    console.log(`  ${csvFile}: no data rows, skipping`);
    return;
  }

  const transformed = rows.map((r) => (transform ? transform(r) : r));

  // Insert in batches of 100
  let inserted = 0;
  for (let i = 0; i < transformed.length; i += 100) {
    const batch = transformed.slice(i, i + 100);
    const { error } = await supabase.from(tableName).upsert(batch);
    if (error) {
      console.error(`  ${tableName} batch ${i}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ${tableName}: ${inserted}/${transformed.length} rows imported from ${csvFile}`);
}

async function main() {
  console.log("=== Importing data into Supabase ===\n");
  console.log("Import order: team -> startups -> investors -> projects -> project_investors -> tasks -> project_notes -> config\n");

  // 1. team (no deps)
  await importTable("team", "team.csv", (row) => ({
    team_id: row.team_id,
    name: row.name || "",
    email: row.email || "",
  }));

  // 2. startups (no deps)
  await importTable("startups", "startups.csv", (row) => ({
    startup_id: row.startup_id,
    startup_name: row.startup_name || "",
    status: ["active", "paused", "closed"].includes(row.status) ? row.status : "active",
    pitch_deck_url: row.pitch_deck_url || "",
    data_room_url: row.data_room_url || "",
    pl_url: row.pl_url || "",
    investment_memo_url: row.investment_memo_url || "",
    notes: row.notes || "",
  }));

  // 3. investors (no deps) — convert tags string to TEXT[]
  await importTable("investors", "investors.csv", (row) => ({
    investor_id: row.investor_id,
    investor_name: row.investor_name || "",
    tags: row.tags
      ? row.tags.split(";").map((t: string) => t.trim()).filter(Boolean)
      : [],
    email: row.email || "",
    linkedin: row.linkedin || "",
    notes: row.notes || "",
  }));

  // 4. projects (depends on startups)
  await importTable("projects", "projects.csv", (row) => ({
    project_id: row.project_id,
    startup_id: row.startup_id,
    project_name: row.project_name || "",
    status: ["active", "paused", "closed"].includes(row.status) ? row.status : "active",
    notes: row.notes || "",
    created_at: row.created_at || new Date().toISOString(),
  }));

  // 5. project_investors (depends on projects + investors)
  const VALID_STAGES = ["Pipeline", "On Hold", "Trying to reach", "Active", "Advanced", "Declined"];
  await importTable("project_investors", "project_investors.csv", (row) => ({
    link_id: row.link_id,
    project_id: row.project_id,
    investor_id: row.investor_id,
    stage: VALID_STAGES.includes(row.stage) ? row.stage : "Pipeline",
    position_index: parseInt(row.position_index || "0", 10),
    last_update: row.last_update || "",
    next_action: row.next_action || "",
    notes: row.notes || "",
  }));

  // 6. tasks (logically depends on startups/projects but no strict FK)
  await importTable("tasks", "tasks.csv", (row) => ({
    task_id: row.task_id,
    startup_id: row.startup_id || "",
    project_id: row.project_id || "",
    title: row.title || "",
    owner_id: row.owner_id || "",
    due_date: row.due_date || "",
    due_time: row.due_time || "",
    status: ["todo", "doing", "done"].includes(row.status) ? row.status : "todo",
    priority: ["low", "medium", "high"].includes(row.priority) ? row.priority : "medium",
    notes: row.notes || "",
    calendar_event_id: row.calendar_event_id || "",
    sync_status: ["none", "pending", "synced", "failed"].includes(row.sync_status)
      ? row.sync_status
      : "none",
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  }));

  // 7. project_notes (depends on projects)
  await importTable("project_notes", "project_notes.csv", (row) => ({
    note_id: row.note_id,
    project_id: row.project_id,
    author_id: row.author_id || "",
    title: row.title || "",
    content: row.content || "",
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  }));

  // 8. config (no deps)
  await importTable("config", "config.csv", (row) => ({
    key: row.key,
    value: row.value || "",
  }));

  console.log("\n=== Import complete ===");
  console.log("\nNext steps:");
  console.log("  1. Run validation queries from scripts/002-validate-migration.sql");
  console.log("  2. Compare row counts with Google Sheets");
  console.log("  3. Start the app with `npm run dev` and test all features");
}

main().catch(console.error);
