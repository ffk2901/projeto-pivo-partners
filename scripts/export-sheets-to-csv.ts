/**
 * Export all Google Sheets tabs to CSV files for Supabase migration.
 *
 * Run with: npx tsx scripts/export-sheets-to-csv.ts
 *
 * Output: /migration-data/*.csv
 */

import { google } from "googleapis";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
if (!SPREADSHEET_ID) {
  console.error("GOOGLE_SHEETS_SPREADSHEET_ID not set in .env");
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

const TABS = [
  { name: "TEAM", range: "A1:C", file: "team.csv" },
  { name: "STARTUPS", range: "A1:H", file: "startups.csv" },
  { name: "PROJECTS", range: "A1:F", file: "projects.csv" },
  { name: "TASKS", range: "A1:N", file: "tasks.csv" },
  { name: "INVESTORS", range: "A1:F", file: "investors.csv" },
  { name: "PROJECT_INVESTORS", range: "A1:H", file: "project_investors.csv" },
  { name: "PROJECT_NOTES", range: "A1:G", file: "project_notes.csv" },
  { name: "CONFIG", range: "A1:B", file: "config.csv" },
];

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function exportAll() {
  const outDir = path.resolve(__dirname, "..", "migration-data");
  fs.mkdirSync(outDir, { recursive: true });

  for (const tab of TABS) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID!,
        range: `${tab.name}!${tab.range}`,
      });
      const rows = res.data.values || [];
      if (rows.length === 0) {
        console.log(`  ${tab.name}: empty, skipping`);
        continue;
      }

      const header = rows[0];
      // Filter out blank rows (empty ID in first column)
      const dataRows = rows.slice(1).filter((r) => r[0]?.trim());

      const csv = [header.map(escapeCsv).join(",")];
      for (const row of dataRows) {
        // Pad each row to header length
        const padded = header.map((_, i) => escapeCsv(row[i] || ""));
        csv.push(padded.join(","));
      }

      const filePath = path.join(outDir, tab.file);
      fs.writeFileSync(filePath, csv.join("\n"), "utf-8");
      console.log(`  ${tab.name}: ${dataRows.length} rows -> ${tab.file}`);
    } catch (err) {
      console.warn(`  ${tab.name}: failed to export`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nExported to: ${outDir}`);
}

console.log("=== Exporting Google Sheets data to CSV ===\n");
exportAll().catch(console.error);
