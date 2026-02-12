import { google, sheets_v4 } from "googleapis";
import type {
  TeamMember,
  Startup,
  Task,
  Investor,
  StartupInvestor,
  ConfigRow,
  TaskStatus,
  TaskPriority,
} from "@/types";

// ============================================
// Google Sheets client singleton
// ============================================

let sheetsInstance: sheets_v4.Sheets | null = null;

function getSheets(): sheets_v4.Sheets {
  if (sheetsInstance) return sheetsInstance;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsInstance = google.sheets({ version: "v4", auth });
  return sheetsInstance;
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID not set");
  return id;
}

// ============================================
// Simple in-memory cache (TTL-based)
// ============================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 30_000; // 30 seconds

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  const keys = Array.from(cache.keys());
  for (const key of keys) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

// ============================================
// Generic read/write helpers
// ============================================

async function readRange(range: string): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range,
  });
  return (res.data.values as string[][]) || [];
}

async function appendRows(range: string, rows: string[][]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

async function updateRange(range: string, rows: string[][]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

// ============================================
// Tab names (must match user's Google Sheet)
// ============================================

const TAB = {
  TEAM: "TEAM",
  STARTUPS: "STARTUPS",
  TASKS: "TASKS",
  INVESTORS: "INVESTORS",
  STARTUP_INVESTORS: "STARTUP_INVESTORS",
  CONFIG: "CONFIG",
} as const;

// ============================================
// Row mappers (row array -> typed object)
// ============================================

function toTeamMember(row: string[]): TeamMember {
  return {
    team_id: row[0] || "",
    name: row[1] || "",
  };
}

function toStartup(row: string[]): Startup {
  return {
    startup_id: row[0] || "",
    startup_name: row[1] || "",
    status: (row[2] as Startup["status"]) || "active",
    pitch_deck_url: row[3] || "",
    data_room_url: row[4] || "",
    pl_url: row[5] || "",
    investment_memo_url: row[6] || "",
    notes: row[7] || "",
  };
}

function toTask(row: string[]): Task {
  return {
    task_id: row[0] || "",
    startup_id: row[1] || "",
    title: row[2] || "",
    owner_id: row[3] || "",
    due_date: row[4] || "",
    status: (row[5] as TaskStatus) || "todo",
    priority: (row[6] as TaskPriority) || "medium",
    notes: row[7] || "",
    created_at: row[8] || "",
    updated_at: row[9] || "",
  };
}

function toInvestor(row: string[]): Investor {
  return {
    investor_id: row[0] || "",
    investor_name: row[1] || "",
    tags: row[2] || "",
    email: row[3] || "",
    linkedin: row[4] || "",
    notes: row[5] || "",
  };
}

function toStartupInvestor(row: string[]): StartupInvestor {
  return {
    link_id: row[0] || "",
    startup_id: row[1] || "",
    investor_id: row[2] || "",
    stage: row[3] || "",
    last_update: row[4] || "",
    next_action: row[5] || "",
    notes: row[6] || "",
  };
}

function toConfigRow(row: string[]): ConfigRow {
  return {
    key: row[0] || "",
    value: row[1] || "",
  };
}

// ============================================
// READ operations (with cache)
// ============================================

export async function getTeam(): Promise<TeamMember[]> {
  const cacheKey = "team";
  const cached = getCached<TeamMember[]>(cacheKey);
  if (cached) return cached;

  const rows = await readRange(`${TAB.TEAM}!A2:B`);
  const data = rows.map(toTeamMember).filter((m) => m.team_id);
  setCache(cacheKey, data);
  return data;
}

export async function getStartups(): Promise<Startup[]> {
  const cacheKey = "startups";
  const cached = getCached<Startup[]>(cacheKey);
  if (cached) return cached;

  const rows = await readRange(`${TAB.STARTUPS}!A2:H`);
  const data = rows.map(toStartup).filter((s) => s.startup_id);
  setCache(cacheKey, data);
  return data;
}

export async function getTasks(): Promise<Task[]> {
  const cacheKey = "tasks";
  const cached = getCached<Task[]>(cacheKey);
  if (cached) return cached;

  const rows = await readRange(`${TAB.TASKS}!A2:J`);
  const data = rows.map(toTask).filter((t) => t.task_id);
  setCache(cacheKey, data);
  return data;
}

export async function getInvestors(): Promise<Investor[]> {
  const cacheKey = "investors";
  const cached = getCached<Investor[]>(cacheKey);
  if (cached) return cached;

  const rows = await readRange(`${TAB.INVESTORS}!A2:F`);
  const data = rows.map(toInvestor).filter((i) => i.investor_id);
  setCache(cacheKey, data);
  return data;
}

export async function getStartupInvestors(): Promise<StartupInvestor[]> {
  const cacheKey = "startup_investors";
  const cached = getCached<StartupInvestor[]>(cacheKey);
  if (cached) return cached;

  const rows = await readRange(`${TAB.STARTUP_INVESTORS}!A2:G`);
  const data = rows.map(toStartupInvestor).filter((si) => si.link_id);
  setCache(cacheKey, data);
  return data;
}

export async function getConfig(): Promise<ConfigRow[]> {
  const cacheKey = "config";
  const cached = getCached<ConfigRow[]>(cacheKey);
  if (cached) return cached;

  const rows = await readRange(`${TAB.CONFIG}!A2:B`);
  const data = rows.map(toConfigRow).filter((c) => c.key);
  setCache(cacheKey, data);
  return data;
}

export async function getPipelineStages(): Promise<string[]> {
  const config = await getConfig();
  const row = config.find((c) => c.key === "pipeline_stages");
  if (!row) return ["Target", "Contacted", "Meeting Scheduled", "Meeting Done", "Next Steps", "Passed", "Closed"];
  return row.value.split("|").map((s) => s.trim());
}

// ============================================
// ID generation
// ============================================

export function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${ts}_${rand}`;
}

// ============================================
// WRITE operations
// ============================================

// Find the 1-based row number (in the sheet) for a given id in column A.
// Returns the sheet row number (header is row 1, first data row is row 2).
async function findRowById(tab: string, id: string): Promise<number> {
  const rows = await readRange(`${tab}!A:A`);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === id) return i + 1; // 1-based
  }
  throw new Error(`Row with id "${id}" not found in tab "${tab}"`);
}

// --- Tasks ---

export async function createTask(task: Task): Promise<void> {
  await appendRows(`${TAB.TASKS}!A:J`, [
    [
      task.task_id,
      task.startup_id,
      task.title,
      task.owner_id,
      task.due_date,
      task.status,
      task.priority,
      task.notes,
      task.created_at,
      task.updated_at,
    ],
  ]);
  invalidateCache("tasks");
}

export async function updateTask(task: Task): Promise<void> {
  const rowNum = await findRowById(TAB.TASKS, task.task_id);
  await updateRange(`${TAB.TASKS}!A${rowNum}:J${rowNum}`, [
    [
      task.task_id,
      task.startup_id,
      task.title,
      task.owner_id,
      task.due_date,
      task.status,
      task.priority,
      task.notes,
      task.created_at,
      task.updated_at,
    ],
  ]);
  invalidateCache("tasks");
}

// --- Startups ---

export async function createStartup(startup: Startup): Promise<void> {
  await appendRows(`${TAB.STARTUPS}!A:H`, [
    [
      startup.startup_id,
      startup.startup_name,
      startup.status,
      startup.pitch_deck_url,
      startup.data_room_url,
      startup.pl_url,
      startup.investment_memo_url,
      startup.notes,
    ],
  ]);
  invalidateCache("startups");
}

export async function updateStartup(startup: Startup): Promise<void> {
  const rowNum = await findRowById(TAB.STARTUPS, startup.startup_id);
  await updateRange(`${TAB.STARTUPS}!A${rowNum}:H${rowNum}`, [
    [
      startup.startup_id,
      startup.startup_name,
      startup.status,
      startup.pitch_deck_url,
      startup.data_room_url,
      startup.pl_url,
      startup.investment_memo_url,
      startup.notes,
    ],
  ]);
  invalidateCache("startups");
}

// --- Investors ---

export async function createInvestor(investor: Investor): Promise<void> {
  await appendRows(`${TAB.INVESTORS}!A:F`, [
    [
      investor.investor_id,
      investor.investor_name,
      investor.tags,
      investor.email,
      investor.linkedin,
      investor.notes,
    ],
  ]);
  invalidateCache("investors");
}

export async function updateInvestor(investor: Investor): Promise<void> {
  const rowNum = await findRowById(TAB.INVESTORS, investor.investor_id);
  await updateRange(`${TAB.INVESTORS}!A${rowNum}:F${rowNum}`, [
    [
      investor.investor_id,
      investor.investor_name,
      investor.tags,
      investor.email,
      investor.linkedin,
      investor.notes,
    ],
  ]);
  invalidateCache("investors");
}

// --- Startup-Investors ---

export async function createStartupInvestor(si: StartupInvestor): Promise<void> {
  await appendRows(`${TAB.STARTUP_INVESTORS}!A:G`, [
    [
      si.link_id,
      si.startup_id,
      si.investor_id,
      si.stage,
      si.last_update,
      si.next_action,
      si.notes,
    ],
  ]);
  invalidateCache("startup_investors");
}

export async function updateStartupInvestor(si: StartupInvestor): Promise<void> {
  const rowNum = await findRowById(TAB.STARTUP_INVESTORS, si.link_id);
  await updateRange(`${TAB.STARTUP_INVESTORS}!A${rowNum}:G${rowNum}`, [
    [
      si.link_id,
      si.startup_id,
      si.investor_id,
      si.stage,
      si.last_update,
      si.next_action,
      si.notes,
    ],
  ]);
  invalidateCache("startup_investors");
}

// ============================================
// Health check
// ============================================

export async function healthCheck(): Promise<{
  connected: boolean;
  counts: Record<string, number>;
  error?: string;
}> {
  try {
    const [team, startups, tasks, investors, startupInvestors, config] =
      await Promise.all([
        getTeam(),
        getStartups(),
        getTasks(),
        getInvestors(),
        getStartupInvestors(),
        getConfig(),
      ]);

    return {
      connected: true,
      counts: {
        team: team.length,
        startups: startups.length,
        tasks: tasks.length,
        investors: investors.length,
        startup_investors: startupInvestors.length,
        config: config.length,
      },
    };
  } catch (err) {
    return {
      connected: false,
      counts: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
