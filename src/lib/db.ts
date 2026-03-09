import { getSupabase } from "./supabase";
import type {
  TeamMember,
  Startup,
  Project,
  Task,
  Investor,
  ProjectInvestor,
  ConfigRow,
  ProjectNote,
} from "@/types";
import { FUNNEL_STAGES } from "@/types";

// ============================================
// ID generation (same logic as sheets.ts)
// ============================================

export function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${ts}_${rand}`;
}

// ============================================
// Cache no-op (kept for import compatibility)
// ============================================

export function invalidateCache(_prefix?: string): void {
  // No-op: Supabase queries are always fresh.
}

// ============================================
// READ operations
// ============================================

export async function getTeam(): Promise<TeamMember[]> {
  const { data, error } = await getSupabase()
    .from("team")
    .select("team_id, name, email")
    .order("name");

  if (error) throw new Error(`Failed to fetch team: ${error.message}`);
  return data ?? [];
}

export async function getStartups(): Promise<Startup[]> {
  const { data, error } = await getSupabase()
    .from("startups")
    .select("startup_id, startup_name, status, pitch_deck_url, data_room_url, pl_url, investment_memo_url, notes")
    .order("startup_name");

  if (error) throw new Error(`Failed to fetch startups: ${error.message}`);
  return data ?? [];
}

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select("project_id, startup_id, project_name, status, created_at, notes")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
  // Convert timestamptz to ISO string for API compat
  return (data ?? []).map((row) => ({
    ...row,
    created_at: row.created_at ?? "",
  }));
}

export async function getTasks(): Promise<Task[]> {
  const { data, error } = await getSupabase()
    .from("tasks")
    .select("task_id, startup_id, project_id, title, owner_id, due_date, due_time, status, priority, notes, created_at, updated_at, calendar_event_id, sync_status")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
  return (data ?? []).map((row) => ({
    ...row,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  }));
}

export async function getInvestors(): Promise<Investor[]> {
  const { data, error } = await getSupabase()
    .from("investors")
    .select("investor_id, investor_name, tags, email, linkedin, notes")
    .order("investor_name");

  if (error) throw new Error(`Failed to fetch investors: ${error.message}`);
  // Convert TEXT[] back to semicolon-separated string for API compat
  return (data ?? []).map((row) => ({
    ...row,
    tags: Array.isArray(row.tags) ? row.tags.join(";") : (row.tags ?? ""),
  }));
}

export async function getProjectInvestors(): Promise<ProjectInvestor[]> {
  const { data, error } = await getSupabase()
    .from("project_investors")
    .select("link_id, project_id, investor_id, stage, position_index, last_update, next_action, notes")
    .order("position_index");

  if (error) throw new Error(`Failed to fetch project investors: ${error.message}`);
  return data ?? [];
}

export async function getProjectNotes(): Promise<ProjectNote[]> {
  const { data, error } = await getSupabase()
    .from("project_notes")
    .select("note_id, project_id, author_id, title, content, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch project notes: ${error.message}`);
  return (data ?? []).map((row) => ({
    ...row,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  }));
}

export async function getConfig(): Promise<ConfigRow[]> {
  const { data, error } = await getSupabase()
    .from("config")
    .select("key, value");

  if (error) throw new Error(`Failed to fetch config: ${error.message}`);
  return data ?? [];
}

export async function getPipelineStages(): Promise<string[]> {
  const config = await getConfig();
  const row = config.find((c) => c.key === "pipeline_stages");
  if (!row) return [...FUNNEL_STAGES];
  return row.value.split("|").map((s) => s.trim());
}

// ============================================
// WRITE operations — Team
// ============================================

export async function updateTeamMember(member: TeamMember): Promise<void> {
  const { error } = await getSupabase()
    .from("team")
    .update({ name: member.name, email: member.email })
    .eq("team_id", member.team_id);

  if (error) throw new Error(`Failed to update team member: ${error.message}`);
}

// ============================================
// WRITE operations — Startups
// ============================================

export async function createStartup(startup: Startup): Promise<void> {
  const { error } = await getSupabase()
    .from("startups")
    .insert({
      startup_id: startup.startup_id,
      startup_name: startup.startup_name,
      status: startup.status,
      pitch_deck_url: startup.pitch_deck_url,
      data_room_url: startup.data_room_url,
      pl_url: startup.pl_url,
      investment_memo_url: startup.investment_memo_url,
      notes: startup.notes,
    });

  if (error) throw new Error(`Failed to create startup: ${error.message}`);
}

export async function updateStartup(startup: Startup): Promise<void> {
  const { error } = await getSupabase()
    .from("startups")
    .update({
      startup_name: startup.startup_name,
      status: startup.status,
      pitch_deck_url: startup.pitch_deck_url,
      data_room_url: startup.data_room_url,
      pl_url: startup.pl_url,
      investment_memo_url: startup.investment_memo_url,
      notes: startup.notes,
    })
    .eq("startup_id", startup.startup_id);

  if (error) throw new Error(`Failed to update startup: ${error.message}`);
}

// ============================================
// WRITE operations — Projects
// ============================================

export async function createProject(project: Project): Promise<void> {
  const { error } = await getSupabase()
    .from("projects")
    .insert({
      project_id: project.project_id,
      startup_id: project.startup_id,
      project_name: project.project_name,
      status: project.status,
      notes: project.notes,
      created_at: project.created_at || new Date().toISOString(),
    });

  if (error) throw new Error(`Failed to create project: ${error.message}`);
}

export async function updateProject(project: Project): Promise<void> {
  const { error } = await getSupabase()
    .from("projects")
    .update({
      startup_id: project.startup_id,
      project_name: project.project_name,
      status: project.status,
      notes: project.notes,
    })
    .eq("project_id", project.project_id);

  if (error) throw new Error(`Failed to update project: ${error.message}`);
}

// ============================================
// WRITE operations — Investors
// ============================================

function tagsStringToArray(tags: string): string[] {
  if (!tags) return [];
  return tags.split(";").map((t) => t.trim()).filter(Boolean);
}

export async function createInvestor(investor: Investor): Promise<void> {
  const { error } = await getSupabase()
    .from("investors")
    .insert({
      investor_id: investor.investor_id,
      investor_name: investor.investor_name,
      tags: tagsStringToArray(investor.tags),
      email: investor.email,
      linkedin: investor.linkedin,
      notes: investor.notes,
    });

  if (error) throw new Error(`Failed to create investor: ${error.message}`);
}

export async function updateInvestor(investor: Investor): Promise<void> {
  const { error } = await getSupabase()
    .from("investors")
    .update({
      investor_name: investor.investor_name,
      tags: tagsStringToArray(investor.tags),
      email: investor.email,
      linkedin: investor.linkedin,
      notes: investor.notes,
    })
    .eq("investor_id", investor.investor_id);

  if (error) throw new Error(`Failed to update investor: ${error.message}`);
}

// ============================================
// WRITE operations — Project Investors (funnel)
// ============================================

export async function createProjectInvestor(pi: ProjectInvestor): Promise<void> {
  const { error } = await getSupabase()
    .from("project_investors")
    .insert({
      link_id: pi.link_id,
      project_id: pi.project_id,
      investor_id: pi.investor_id,
      stage: pi.stage,
      position_index: pi.position_index,
      last_update: pi.last_update,
      next_action: pi.next_action,
      notes: pi.notes,
    });

  if (error) throw new Error(`Failed to create project investor: ${error.message}`);
}

export async function updateProjectInvestor(pi: ProjectInvestor): Promise<void> {
  const { error } = await getSupabase()
    .from("project_investors")
    .update({
      project_id: pi.project_id,
      investor_id: pi.investor_id,
      stage: pi.stage,
      position_index: pi.position_index,
      last_update: pi.last_update,
      next_action: pi.next_action,
      notes: pi.notes,
    })
    .eq("link_id", pi.link_id);

  if (error) throw new Error(`Failed to update project investor: ${error.message}`);
}

export async function deleteProjectInvestor(linkId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("project_investors")
    .delete()
    .eq("link_id", linkId);

  if (error) throw new Error(`Failed to delete project investor: ${error.message}`);
}

// ============================================
// WRITE operations — Tasks
// ============================================

export async function createTask(task: Task): Promise<void> {
  const { error } = await getSupabase()
    .from("tasks")
    .insert({
      task_id: task.task_id,
      startup_id: task.startup_id,
      project_id: task.project_id,
      title: task.title,
      owner_id: task.owner_id,
      due_date: task.due_date,
      due_time: task.due_time,
      status: task.status,
      priority: task.priority,
      notes: task.notes,
      created_at: task.created_at || new Date().toISOString(),
      updated_at: task.updated_at || new Date().toISOString(),
      calendar_event_id: task.calendar_event_id,
      sync_status: task.sync_status,
    });

  if (error) throw new Error(`Failed to create task: ${error.message}`);
}

export async function updateTask(task: Task): Promise<void> {
  const { error } = await getSupabase()
    .from("tasks")
    .update({
      startup_id: task.startup_id,
      project_id: task.project_id,
      title: task.title,
      owner_id: task.owner_id,
      due_date: task.due_date,
      due_time: task.due_time,
      status: task.status,
      priority: task.priority,
      notes: task.notes,
      updated_at: task.updated_at || new Date().toISOString(),
      calendar_event_id: task.calendar_event_id,
      sync_status: task.sync_status,
    })
    .eq("task_id", task.task_id);

  if (error) throw new Error(`Failed to update task: ${error.message}`);
}

// ============================================
// WRITE operations — Project Notes
// ============================================

export async function createProjectNote(note: ProjectNote): Promise<void> {
  const { error } = await getSupabase()
    .from("project_notes")
    .insert({
      note_id: note.note_id,
      project_id: note.project_id,
      author_id: note.author_id,
      title: note.title,
      content: note.content,
      created_at: note.created_at || new Date().toISOString(),
      updated_at: note.updated_at || new Date().toISOString(),
    });

  if (error) throw new Error(`Failed to create project note: ${error.message}`);
}

export async function updateProjectNote(note: ProjectNote): Promise<void> {
  const { error } = await getSupabase()
    .from("project_notes")
    .update({
      project_id: note.project_id,
      author_id: note.author_id,
      title: note.title,
      content: note.content,
      updated_at: note.updated_at || new Date().toISOString(),
    })
    .eq("note_id", note.note_id);

  if (error) throw new Error(`Failed to update project note: ${error.message}`);
}

export async function deleteProjectNote(noteId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("project_notes")
    .delete()
    .eq("note_id", noteId);

  if (error) throw new Error(`Failed to delete project note: ${error.message}`);
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
    const sb = getSupabase();
    const tables = [
      "team", "startups", "projects", "tasks",
      "investors", "project_investors", "config",
    ] as const;

    const results = await Promise.all(
      tables.map(async (t) => {
        const { count, error } = await sb
          .from(t)
          .select("*", { count: "exact", head: true });
        if (error) throw error;
        return [t, count ?? 0] as const;
      })
    );

    return {
      connected: true,
      counts: Object.fromEntries(results),
    };
  } catch (err) {
    return {
      connected: false,
      counts: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
