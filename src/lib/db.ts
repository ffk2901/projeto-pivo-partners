import { getSupabase } from "./supabase";
import type {
  TeamMember,
  Startup,
  Project,
  Task,
  Investor,
  ProjectInvestor,
  StartupInvestor,
  ConfigRow,
  ProjectNote,
  Meeting,
  ActivityLogEntry,
} from "@/types";
import { FUNNEL_STAGES } from "@/types";

// ============================================
// ID generation
// ============================================

export function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${ts}_${rand}`;
}

// ============================================
// Cache (keep same 30s TTL for performance)
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
// Null → "" sanitizer (Supabase returns null, app expects "")
// ============================================

function sanitizeRows<T>(rows: T[]): T[] {
  return rows.map((row) => {
    const out = { ...row } as Record<string, unknown>;
    for (const key of Object.keys(out)) {
      if (out[key] === null || out[key] === undefined) {
        out[key] = "";
      }
    }
    return out as T;
  });
}

// ============================================
// READ operations
// ============================================

export async function getTeam(): Promise<TeamMember[]> {
  const k = "team"; const c = getCached<TeamMember[]>(k); if (c) return c;
  const { data, error } = await getSupabase().from("team").select("*");
  if (error) throw new Error(error.message);
  const result = sanitizeRows((data || []) as TeamMember[]);
  setCache(k, result);
  return result;
}

export async function getStartups(): Promise<Startup[]> {
  const k = "startups"; const c = getCached<Startup[]>(k); if (c) return c;
  const { data, error } = await getSupabase().from("startups").select("*");
  if (error) throw new Error(error.message);
  const result = sanitizeRows((data || []) as Startup[]);
  setCache(k, result);
  return result;
}

export async function getProjects(): Promise<Project[]> {
  const k = "projects"; const c = getCached<Project[]>(k); if (c) return c;
  const { data, error } = await getSupabase().from("projects").select("*");
  if (error) throw new Error(error.message);
  const result = sanitizeRows((data || []) as Project[]);
  setCache(k, result);
  return result;
}

export async function getTasks(): Promise<Task[]> {
  const k = "tasks"; const c = getCached<Task[]>(k); if (c) return c;
  const { data, error } = await getSupabase().from("tasks").select("*");
  if (error) throw new Error(error.message);
  const result = sanitizeRows((data || []) as Task[]);
  setCache(k, result);
  return result;
}

export async function getInvestors(): Promise<Investor[]> {
  const k = "investors"; const c = getCached<Investor[]>(k); if (c) return c;
  const { data, error } = await getSupabase().from("investors").select("*");
  if (error) throw new Error(error.message);
  const result = sanitizeRows((data || []) as Investor[]);
  setCache(k, result);
  return result;
}

export async function getProjectInvestors(): Promise<ProjectInvestor[]> {
  const k = "project_investors"; const c = getCached<ProjectInvestor[]>(k); if (c) return c;
  const { data, error } = await getSupabase().from("project_investors").select("*");
  if (error) throw new Error(error.message);
  const result = sanitizeRows((data || []) as ProjectInvestor[]);
  setCache(k, result);
  return result;
}

export async function getStartupInvestors(): Promise<StartupInvestor[]> {
  const k = "startup_investors"; const c = getCached<StartupInvestor[]>(k); if (c) return c;
  const { data, error } = await getSupabase().from("startup_investors").select("*");
  if (error) throw new Error(error.message);
  const result = sanitizeRows((data || []) as StartupInvestor[]);
  setCache(k, result);
  return result;
}

export async function getConfig(): Promise<ConfigRow[]> {
  const k = "config"; const c = getCached<ConfigRow[]>(k); if (c) return c;
  const { data, error } = await getSupabase().from("config").select("*");
  if (error) throw new Error(error.message);
  const result = sanitizeRows((data || []) as ConfigRow[]);
  setCache(k, result);
  return result;
}

export async function getPipelineStages(): Promise<string[]> {
  const config = await getConfig();
  const row = config.find((c) => c.key === "pipeline_stages");
  if (!row) return [...FUNNEL_STAGES];
  return row.value.split("|").map((s) => s.trim());
}

export async function getProjectNotes(): Promise<ProjectNote[]> {
  const k = "project_notes"; const c = getCached<ProjectNote[]>(k); if (c) return c;
  const { data, error } = await getSupabase().from("project_notes").select("*");
  if (error) throw new Error(error.message);
  const result = sanitizeRows((data || []) as ProjectNote[]);
  setCache(k, result);
  return result;
}

export async function getMeetings(): Promise<Meeting[]> {
  const k = "meetings"; const c = getCached<Meeting[]>(k); if (c) return c;
  const { data, error } = await getSupabase().from("meetings").select("*");
  if (error) throw new Error(error.message);
  const result = sanitizeRows((data || []) as Meeting[]);
  setCache(k, result);
  return result;
}

export async function getActivityLog(): Promise<ActivityLogEntry[]> {
  const k = "activity_log"; const c = getCached<ActivityLogEntry[]>(k); if (c) return c;
  const { data, error } = await getSupabase().from("activity_log").select("*");
  if (error) throw new Error(error.message);
  const result = sanitizeRows((data || []) as ActivityLogEntry[]);
  setCache(k, result);
  return result;
}

// ============================================
// WRITE operations
// ============================================

// Tasks
export async function createTask(task: Task): Promise<void> {
  const { error } = await getSupabase().from("tasks").insert(task);
  if (error) throw new Error(error.message);
  invalidateCache("tasks");
}

export async function updateTask(task: Task): Promise<void> {
  const { error } = await getSupabase().from("tasks").update(task).eq("task_id", task.task_id);
  if (error) throw new Error(error.message);
  invalidateCache("tasks");
}

// Startups
export async function createStartup(startup: Startup): Promise<void> {
  const { error } = await getSupabase().from("startups").insert(startup);
  if (error) throw new Error(error.message);
  invalidateCache("startups");
}

export async function updateStartup(startup: Startup): Promise<void> {
  const { error } = await getSupabase().from("startups").update(startup).eq("startup_id", startup.startup_id);
  if (error) throw new Error(error.message);
  invalidateCache("startups");
}

// Projects
export async function createProject(project: Project): Promise<void> {
  const { error } = await getSupabase().from("projects").insert(project);
  if (error) throw new Error(error.message);
  invalidateCache("projects");
}

export async function updateProject(project: Project): Promise<void> {
  const { error } = await getSupabase().from("projects").update(project).eq("project_id", project.project_id);
  if (error) throw new Error(error.message);
  invalidateCache("projects");
}

// Investors
export async function createInvestor(investor: Investor): Promise<void> {
  const { error } = await getSupabase().from("investors").insert(investor);
  if (error) throw new Error(error.message);
  invalidateCache("investors");
}

export async function updateInvestor(investor: Investor): Promise<void> {
  const { error } = await getSupabase().from("investors").update(investor).eq("investor_id", investor.investor_id);
  if (error) throw new Error(error.message);
  invalidateCache("investors");
}

export async function deleteInvestor(investorId: string): Promise<void> {
  const { error } = await getSupabase().from("investors").delete().eq("investor_id", investorId);
  if (error) throw new Error(error.message);
  invalidateCache("investors");
}

// Project-Investors
export async function createProjectInvestor(pi: ProjectInvestor): Promise<void> {
  const now = new Date().toISOString();
  const record = { ...pi, created_at: pi.created_at || now, updated_at: pi.updated_at || now };
  const { error } = await getSupabase().from("project_investors").insert(record);
  if (error) throw new Error(error.message);
  invalidateCache("project_investors");
}

export async function updateProjectInvestor(pi: ProjectInvestor): Promise<void> {
  const now = new Date().toISOString();
  const record = { ...pi, updated_at: now };
  const { error } = await getSupabase().from("project_investors").update(record).eq("link_id", pi.link_id);
  if (error) throw new Error(error.message);
  invalidateCache("project_investors");
}

export async function deleteProjectInvestor(linkId: string): Promise<void> {
  const { error } = await getSupabase().from("project_investors").delete().eq("link_id", linkId);
  if (error) throw new Error(error.message);
  invalidateCache("project_investors");
}

// Startup-Investors (legacy)
export async function createStartupInvestor(si: StartupInvestor): Promise<void> {
  const { error } = await getSupabase().from("startup_investors").insert(si);
  if (error) throw new Error(error.message);
  invalidateCache("startup_investors");
}

export async function updateStartupInvestor(si: StartupInvestor): Promise<void> {
  const { error } = await getSupabase().from("startup_investors").update(si).eq("link_id", si.link_id);
  if (error) throw new Error(error.message);
  invalidateCache("startup_investors");
}

// Team
export async function updateTeamMember(member: TeamMember): Promise<void> {
  const { error } = await getSupabase().from("team").update(member).eq("team_id", member.team_id);
  if (error) throw new Error(error.message);
  invalidateCache("team");
}

// Project Notes
export async function createProjectNote(note: ProjectNote): Promise<void> {
  const { error } = await getSupabase().from("project_notes").insert(note);
  if (error) throw new Error(error.message);
  invalidateCache("project_notes");
}

export async function updateProjectNote(note: ProjectNote): Promise<void> {
  const { error } = await getSupabase().from("project_notes").update(note).eq("note_id", note.note_id);
  if (error) throw new Error(error.message);
  invalidateCache("project_notes");
}

export async function deleteProjectNote(noteId: string): Promise<void> {
  const { error } = await getSupabase().from("project_notes").delete().eq("note_id", noteId);
  if (error) throw new Error(error.message);
  invalidateCache("project_notes");
}

// Meetings
export async function createMeeting(meeting: Meeting): Promise<void> {
  const { error } = await getSupabase().from("meetings").insert(meeting);
  if (error) throw new Error(error.message);
  invalidateCache("meetings");
}

export async function updateMeeting(meeting: Meeting): Promise<void> {
  const { error } = await getSupabase().from("meetings").update(meeting).eq("meeting_id", meeting.meeting_id);
  if (error) throw new Error(error.message);
  invalidateCache("meetings");
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  const { error } = await getSupabase().from("meetings").delete().eq("meeting_id", meetingId);
  if (error) throw new Error(error.message);
  invalidateCache("meetings");
}

// Activity Log
export async function createActivityLog(entry: ActivityLogEntry): Promise<void> {
  const { error } = await getSupabase().from("activity_log").insert(entry);
  if (error) throw new Error(error.message);
  invalidateCache("activity_log");
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
