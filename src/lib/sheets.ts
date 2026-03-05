import { google, sheets_v4 } from "googleapis";
import type {
  TeamMember,
  Startup,
  Project,
  Task,
  Investor,
  ProjectInvestor,
  StartupInvestor,
  ConfigRow,
  TaskStatus,
  TaskPriority,
  ProjectNote,
} from "@/types";
import { FUNNEL_STAGES } from "@/types";

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
// Cache
// ============================================

interface CacheEntry<T> { data: T; expiresAt: number; }
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 30_000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) { cache.clear(); return; }
  const keys = Array.from(cache.keys());
  for (const key of keys) { if (key.startsWith(prefix)) cache.delete(key); }
}

// ============================================
// Generic read/write
// ============================================

async function ensureTabExists(tabName: string, headers: string[]): Promise<void> {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  try {
    // Check if tab exists by trying to read it
    await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A1` });
  } catch {
    // Tab doesn't exist — create it
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tabName } } }],
        },
      });
      // Write header row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabName}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    } catch (createErr) {
      // If creation also fails (e.g., already exists due to race condition), ignore
      console.warn(`ensureTabExists(${tabName}):`, createErr);
    }
  }
}

const TAB_HEADERS: Record<string, string[]> = {
  PROJECT_INVESTORS: ["link_id", "project_id", "investor_id", "stage", "last_update", "next_action", "notes", "position_index"],
  PROJECT_NOTES: ["note_id", "project_id", "author_id", "title", "content", "created_at", "updated_at"],
};

async function readRange(range: string): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: getSpreadsheetId(), range });
  return (res.data.values as string[][]) || [];
}

async function appendRows(range: string, rows: string[][]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(), range, valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

async function updateRange(range: string, rows: string[][]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(), range, valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

// ============================================
// Tab names
// ============================================

const TAB = {
  TEAM: "TEAM",
  STARTUPS: "STARTUPS",
  PROJECTS: "PROJECTS",
  TASKS: "TASKS",
  INVESTORS: "INVESTORS",
  PROJECT_INVESTORS: "PROJECT_INVESTORS",
  STARTUP_INVESTORS: "STARTUP_INVESTORS",
  CONFIG: "CONFIG",
  PROJECT_NOTES: "PROJECT_NOTES",
} as const;

// ============================================
// Row mappers
// ============================================

function toTeamMember(row: string[]): TeamMember {
  return { team_id: row[0] || "", name: row[1] || "", email: row[2] || "" };
}

function toStartup(row: string[]): Startup {
  return {
    startup_id: row[0] || "", startup_name: row[1] || "",
    status: (row[2] as Startup["status"]) || "active",
    pitch_deck_url: row[3] || "", data_room_url: row[4] || "",
    pl_url: row[5] || "", investment_memo_url: row[6] || "", notes: row[7] || "",
  };
}

function toProject(row: string[]): Project {
  return {
    project_id: row[0] || "", startup_id: row[1] || "",
    project_name: row[2] || "", status: (row[3] as Project["status"]) || "active",
    created_at: row[4] || "", notes: row[5] || "",
  };
}

// TASKS now has project_id at column C (index 2), plus calendar fields
function toTask(row: string[]): Task {
  return {
    task_id: row[0] || "", startup_id: row[1] || "", project_id: row[2] || "",
    title: row[3] || "", owner_id: row[4] || "", due_date: row[5] || "",
    status: (row[6] as TaskStatus) || "todo", priority: (row[7] as TaskPriority) || "medium",
    notes: row[8] || "", created_at: row[9] || "", updated_at: row[10] || "",
    due_time: row[11] || "", calendar_event_id: row[12] || "",
    sync_status: (row[13] as Task["sync_status"]) || "none",
  };
}

function toProjectNote(row: string[]): ProjectNote {
  return {
    note_id: row[0] || "", project_id: row[1] || "", author_id: row[2] || "",
    title: row[3] || "", content: row[4] || "", created_at: row[5] || "",
    updated_at: row[6] || "",
  };
}

function toInvestor(row: string[]): Investor {
  return {
    investor_id: row[0] || "", investor_name: row[1] || "",
    tags: row[2] || "", email: row[3] || "", linkedin: row[4] || "", notes: row[5] || "",
  };
}

function toProjectInvestor(row: string[]): ProjectInvestor {
  return {
    link_id: row[0] || "", project_id: row[1] || "", investor_id: row[2] || "",
    stage: row[3] || "", last_update: row[4] || "", next_action: row[5] || "", notes: row[6] || "",
    position_index: row[7] ? parseInt(row[7], 10) : 0,
  };
}

function toStartupInvestor(row: string[]): StartupInvestor {
  return {
    link_id: row[0] || "", startup_id: row[1] || "", investor_id: row[2] || "",
    stage: row[3] || "", last_update: row[4] || "", next_action: row[5] || "", notes: row[6] || "",
  };
}

function toConfigRow(row: string[]): ConfigRow {
  return { key: row[0] || "", value: row[1] || "" };
}

// ============================================
// READ operations
// ============================================

export async function getTeam(): Promise<TeamMember[]> {
  const k = "team"; const c = getCached<TeamMember[]>(k); if (c) return c;
  const rows = await readRange(`${TAB.TEAM}!A2:C`);
  const data = rows.map(toTeamMember).filter((m) => m.team_id);
  setCache(k, data); return data;
}

export async function getStartups(): Promise<Startup[]> {
  const k = "startups"; const c = getCached<Startup[]>(k); if (c) return c;
  const rows = await readRange(`${TAB.STARTUPS}!A2:H`);
  const data = rows.map(toStartup).filter((s) => s.startup_id);
  setCache(k, data); return data;
}

export async function getProjects(): Promise<Project[]> {
  const k = "projects"; const c = getCached<Project[]>(k); if (c) return c;
  try {
    const rows = await readRange(`${TAB.PROJECTS}!A2:F`);
    const data = rows.map(toProject).filter((p) => p.project_id);
    setCache(k, data); return data;
  } catch { return []; }
}

export async function getTasks(): Promise<Task[]> {
  const k = "tasks"; const c = getCached<Task[]>(k); if (c) return c;
  const rows = await readRange(`${TAB.TASKS}!A2:N`);
  const data = rows.map(toTask).filter((t) => t.task_id);
  setCache(k, data); return data;
}

export async function getInvestors(): Promise<Investor[]> {
  const k = "investors"; const c = getCached<Investor[]>(k); if (c) return c;
  try {
    const rows = await readRange(`${TAB.INVESTORS}!A2:F`);
    const data = rows.map(toInvestor).filter((i) => i.investor_id);
    setCache(k, data); return data;
  } catch { return []; }
}

export async function getProjectInvestors(): Promise<ProjectInvestor[]> {
  const k = "project_investors"; const c = getCached<ProjectInvestor[]>(k); if (c) return c;
  try {
    const rows = await readRange(`${TAB.PROJECT_INVESTORS}!A2:H`);
    const data = rows.map(toProjectInvestor).filter((pi) => pi.link_id);
    setCache(k, data); return data;
  } catch { return []; }
}

export async function getStartupInvestors(): Promise<StartupInvestor[]> {
  const k = "startup_investors"; const c = getCached<StartupInvestor[]>(k); if (c) return c;
  try {
    const rows = await readRange(`${TAB.STARTUP_INVESTORS}!A2:G`);
    const data = rows.map(toStartupInvestor).filter((si) => si.link_id);
    setCache(k, data); return data;
  } catch { return []; }
}

export async function getConfig(): Promise<ConfigRow[]> {
  const k = "config"; const c = getCached<ConfigRow[]>(k); if (c) return c;
  const rows = await readRange(`${TAB.CONFIG}!A2:B`);
  const data = rows.map(toConfigRow).filter((r) => r.key);
  setCache(k, data); return data;
}

export async function getPipelineStages(): Promise<string[]> {
  const config = await getConfig();
  const row = config.find((c) => c.key === "pipeline_stages");
  if (!row) return [...FUNNEL_STAGES];
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

async function findRowById(tab: string, id: string): Promise<number> {
  const rows = await readRange(`${tab}!A:A`);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === id) return i + 1;
  }
  throw new Error(`Row with id "${id}" not found in tab "${tab}"`);
}

// Tasks (14 columns: A-N including calendar fields)
export async function createTask(task: Task): Promise<void> {
  await appendRows(`${TAB.TASKS}!A:N`, [[
    task.task_id, task.startup_id, task.project_id, task.title, task.owner_id,
    task.due_date, task.status, task.priority, task.notes, task.created_at, task.updated_at,
    task.due_time, task.calendar_event_id, task.sync_status,
  ]]);
  invalidateCache("tasks");
}

export async function updateTask(task: Task): Promise<void> {
  const rowNum = await findRowById(TAB.TASKS, task.task_id);
  await updateRange(`${TAB.TASKS}!A${rowNum}:N${rowNum}`, [[
    task.task_id, task.startup_id, task.project_id, task.title, task.owner_id,
    task.due_date, task.status, task.priority, task.notes, task.created_at, task.updated_at,
    task.due_time, task.calendar_event_id, task.sync_status,
  ]]);
  invalidateCache("tasks");
}

// Startups
export async function createStartup(startup: Startup): Promise<void> {
  await appendRows(`${TAB.STARTUPS}!A:H`, [[
    startup.startup_id, startup.startup_name, startup.status,
    startup.pitch_deck_url, startup.data_room_url, startup.pl_url,
    startup.investment_memo_url, startup.notes,
  ]]);
  invalidateCache("startups");
}

export async function updateStartup(startup: Startup): Promise<void> {
  const rowNum = await findRowById(TAB.STARTUPS, startup.startup_id);
  await updateRange(`${TAB.STARTUPS}!A${rowNum}:H${rowNum}`, [[
    startup.startup_id, startup.startup_name, startup.status,
    startup.pitch_deck_url, startup.data_room_url, startup.pl_url,
    startup.investment_memo_url, startup.notes,
  ]]);
  invalidateCache("startups");
}

// Projects
export async function createProject(project: Project): Promise<void> {
  await appendRows(`${TAB.PROJECTS}!A:F`, [[
    project.project_id, project.startup_id, project.project_name,
    project.status, project.created_at, project.notes,
  ]]);
  invalidateCache("projects");
}

export async function updateProject(project: Project): Promise<void> {
  const rowNum = await findRowById(TAB.PROJECTS, project.project_id);
  await updateRange(`${TAB.PROJECTS}!A${rowNum}:F${rowNum}`, [[
    project.project_id, project.startup_id, project.project_name,
    project.status, project.created_at, project.notes,
  ]]);
  invalidateCache("projects");
}

// Investors
export async function createInvestor(investor: Investor): Promise<void> {
  await appendRows(`${TAB.INVESTORS}!A:F`, [[
    investor.investor_id, investor.investor_name, investor.tags,
    investor.email, investor.linkedin, investor.notes,
  ]]);
  invalidateCache("investors");
}

export async function updateInvestor(investor: Investor): Promise<void> {
  const rowNum = await findRowById(TAB.INVESTORS, investor.investor_id);
  await updateRange(`${TAB.INVESTORS}!A${rowNum}:F${rowNum}`, [[
    investor.investor_id, investor.investor_name, investor.tags,
    investor.email, investor.linkedin, investor.notes,
  ]]);
  invalidateCache("investors");
}

// Project-Investors (8 columns: A-H with position_index)
export async function createProjectInvestor(pi: ProjectInvestor): Promise<void> {
  await ensureTabExists(TAB.PROJECT_INVESTORS, TAB_HEADERS.PROJECT_INVESTORS);
  await appendRows(`${TAB.PROJECT_INVESTORS}!A:H`, [[
    pi.link_id, pi.project_id, pi.investor_id, pi.stage,
    pi.last_update, pi.next_action, pi.notes, String(pi.position_index),
  ]]);
  invalidateCache("project_investors");
}

export async function updateProjectInvestor(pi: ProjectInvestor): Promise<void> {
  const rowNum = await findRowById(TAB.PROJECT_INVESTORS, pi.link_id);
  await updateRange(`${TAB.PROJECT_INVESTORS}!A${rowNum}:H${rowNum}`, [[
    pi.link_id, pi.project_id, pi.investor_id, pi.stage,
    pi.last_update, pi.next_action, pi.notes, String(pi.position_index),
  ]]);
  invalidateCache("project_investors");
}

// Startup-Investors (legacy / backward compat)
export async function createStartupInvestor(si: StartupInvestor): Promise<void> {
  await appendRows(`${TAB.STARTUP_INVESTORS}!A:G`, [[
    si.link_id, si.startup_id, si.investor_id, si.stage,
    si.last_update, si.next_action, si.notes,
  ]]);
  invalidateCache("startup_investors");
}

export async function updateStartupInvestor(si: StartupInvestor): Promise<void> {
  const rowNum = await findRowById(TAB.STARTUP_INVESTORS, si.link_id);
  await updateRange(`${TAB.STARTUP_INVESTORS}!A${rowNum}:G${rowNum}`, [[
    si.link_id, si.startup_id, si.investor_id, si.stage,
    si.last_update, si.next_action, si.notes,
  ]]);
  invalidateCache("startup_investors");
}

// Team update
export async function updateTeamMember(member: TeamMember): Promise<void> {
  const rowNum = await findRowById(TAB.TEAM, member.team_id);
  await updateRange(`${TAB.TEAM}!A${rowNum}:C${rowNum}`, [[
    member.team_id, member.name, member.email,
  ]]);
  invalidateCache("team");
}

// Project Notes (7 columns: A-G)
export async function getProjectNotes(): Promise<ProjectNote[]> {
  const k = "project_notes"; const c = getCached<ProjectNote[]>(k); if (c) return c;
  try {
    const rows = await readRange(`${TAB.PROJECT_NOTES}!A2:G`);
    const data = rows.map(toProjectNote).filter((n) => n.note_id);
    setCache(k, data); return data;
  } catch { return []; }
}

export async function createProjectNote(note: ProjectNote): Promise<void> {
  await ensureTabExists(TAB.PROJECT_NOTES, TAB_HEADERS.PROJECT_NOTES);
  await appendRows(`${TAB.PROJECT_NOTES}!A:G`, [[
    note.note_id, note.project_id, note.author_id, note.title,
    note.content, note.created_at, note.updated_at,
  ]]);
  invalidateCache("project_notes");
}

export async function updateProjectNote(note: ProjectNote): Promise<void> {
  const rowNum = await findRowById(TAB.PROJECT_NOTES, note.note_id);
  await updateRange(`${TAB.PROJECT_NOTES}!A${rowNum}:G${rowNum}`, [[
    note.note_id, note.project_id, note.author_id, note.title,
    note.content, note.created_at, note.updated_at,
  ]]);
  invalidateCache("project_notes");
}

export async function deleteProjectNote(noteId: string): Promise<void> {
  // Clear the row content (Google Sheets doesn't support row deletion via values API)
  const rowNum = await findRowById(TAB.PROJECT_NOTES, noteId);
  await updateRange(`${TAB.PROJECT_NOTES}!A${rowNum}:G${rowNum}`, [[
    "", "", "", "", "", "", "",
  ]]);
  invalidateCache("project_notes");
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
    const [team, startups, projects, tasks, investors, pi, config] = await Promise.all([
      getTeam(), getStartups(), getProjects(), getTasks(),
      getInvestors(), getProjectInvestors(), getConfig(),
    ]);
    return {
      connected: true,
      counts: {
        team: team.length, startups: startups.length, projects: projects.length,
        tasks: tasks.length, investors: investors.length,
        project_investors: pi.length, config: config.length,
      },
    };
  } catch (err) {
    return { connected: false, counts: {}, error: err instanceof Error ? err.message : String(err) };
  }
}
