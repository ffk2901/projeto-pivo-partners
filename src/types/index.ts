// ============================================
// Data types matching Google Sheets tab columns
// ============================================

export interface TeamMember {
  team_id: string;
  name: string;
  email: string;
}

export interface Startup {
  startup_id: string;
  startup_name: string;
  status: "active" | "paused" | "closed";
  pitch_deck_url: string;
  data_room_url: string;
  pl_url: string;
  investment_memo_url: string;
  notes: string;
}

export interface Project {
  project_id: string;
  startup_id: string;
  project_name: string;
  status: "active" | "paused" | "closed";
  created_at: string;
  notes: string;
}

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  task_id: string;
  startup_id: string;
  project_id: string; // blank = startup-level task
  investor_id: string; // optional: links task to investor in project
  title: string;
  owner_id: string;
  due_date: string; // YYYY-MM-DD
  due_time: string; // HH:MM (24h)
  status: TaskStatus;
  priority: TaskPriority;
  notes: string;
  created_at: string;
  updated_at: string;
  calendar_event_id: string;
  sync_status: "none" | "pending" | "synced" | "failed";
}

// Note types for filtering and classification
export type NoteType = "meeting_note" | "general_update" | "strategic_note" | "follow_up_note" | "internal_comment";

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  meeting_note: "Meeting Note",
  general_update: "General Update",
  strategic_note: "Strategic Note",
  follow_up_note: "Follow-up Note",
  internal_comment: "Internal Comment",
};

export interface ProjectNote {
  note_id: string;
  project_id: string;
  investor_id: string; // optional: links note to investor in project
  author_id: string;
  title: string;
  content: string;
  note_type: NoteType;
  next_step: string;
  follow_up_date: string; // YYYY-MM-DD
  tags: string; // semicolon-separated
  meeting_id: string; // optional: links note to a meeting
  created_at: string;
  updated_at: string;
}

export interface Investor {
  investor_id: string;
  investor_name: string;
  investor_type: "fund" | "individual" | "";
  tags: string; // semicolon-separated
  email: string;
  notes: string;
  origin: "br" | "intl" | "";
  company_affiliation: string;
  description: string;
}

// Funnel stages
export const FUNNEL_STAGES = [
  "Pipeline",
  "Trying to reach",
  "Active",
  "Advanced",
  "On Hold",
  "Declined",
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];

// Pipeline is per-project — with extended operational fields
export interface ProjectInvestor {
  link_id: string;
  project_id: string;
  investor_id: string;
  stage: string;
  position_index: number;
  owner_id: string;
  priority: "low" | "medium" | "high" | "";
  last_interaction_date: string; // YYYY-MM-DD
  last_interaction_type: string; // e.g. "email", "call", "meeting"
  next_step: string;
  follow_up_date: string; // YYYY-MM-DD
  latest_update: string;
  fit_summary: string; // thesis / fit
  source: string; // intro source
  last_update: string; // YYYY-MM-DD (legacy, still tracked)
  next_action: string; // legacy alias for next_step
  notes: string;
  wave: "" | "1" | "2" | "3" | "4";
  created_at: string;
  updated_at: string;
}

// Derived follow-up status
export type FollowUpStatus = "overdue" | "due_soon" | "scheduled" | "no_follow_up" | "stalled";

export function getFollowUpStatus(pi: ProjectInvestor): FollowUpStatus {
  if (!pi.follow_up_date) return "no_follow_up";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fDate = new Date(pi.follow_up_date + "T00:00:00");
  const diffDays = Math.ceil((fDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "due_soon";
  return "scheduled";
}

export function getStalledStatus(pi: ProjectInvestor, thresholdDays = 14): boolean {
  const activeStages = ["Trying to reach", "Active", "Advanced"];
  if (!activeStages.includes(pi.stage)) return false;
  const lastDate = pi.last_interaction_date || pi.last_update;
  if (!lastDate) return true;
  const today = new Date();
  const last = new Date(lastDate + "T00:00:00");
  const diffDays = Math.ceil((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > thresholdDays;
}

// Meetings
export interface Meeting {
  meeting_id: string;
  project_id: string;
  investor_id: string; // optional but recommended
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  participants: string; // semicolon-separated emails/names
  status: "scheduled" | "completed" | "cancelled";
  source: "manual" | "calendar";
  summary: string;
  next_steps: string;
  calendar_event_id: string;
  created_at: string;
  updated_at: string;
}

// Activity log for timeline
export interface ActivityLogEntry {
  activity_id: string;
  project_id: string;
  investor_id: string; // optional
  activity_type: string; // stage_change, note_created, task_created, meeting_scheduled, etc.
  description: string;
  metadata: string; // JSON string with extra data
  created_at: string;
  created_by: string; // team_id
}

// Keep for backward compat / migration
export interface StartupInvestor {
  link_id: string;
  startup_id: string;
  investor_id: string;
  stage: string;
  last_update: string;
  next_action: string;
  notes: string;
}

export interface ConfigRow {
  key: string;
  value: string;
}

// Auth types
export interface User {
  user_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: "admin" | "client";
  status: "active" | "inactive" | "pending";
  created_at: string;
  last_login: string;
}

export interface UserProjectAccess {
  access_id: string;
  user_id: string;
  project_id: string;
  permission_level: "view" | "edit";
  granted_by: string;
  granted_at: string;
}

// ============================================
// Derived / UI types
// ============================================

export interface ProjectWithCounts extends Project {
  startup_name: string;
  openTaskCount: number;
  investorCount: number;
}

export interface StartupWithCounts extends Startup {
  openTaskCount: number;
  projectCount: number;
}

// Funnel Hub summary per project
export interface FunnelSummary {
  project: Project;
  startup_name: string;
  stageCounts: Record<string, number>;
  totalInvestors: number;
}

// Follow-up status labels and colors
export const FOLLOW_UP_STATUS_CONFIG: Record<FollowUpStatus, { label: string; color: string; bg: string }> = {
  overdue: { label: "Overdue", color: "text-red-700", bg: "bg-red-100" },
  due_soon: { label: "Due Soon", color: "text-amber-700", bg: "bg-amber-100" },
  scheduled: { label: "Scheduled", color: "text-blue-700", bg: "bg-blue-100" },
  no_follow_up: { label: "No Follow-up", color: "text-ink-500", bg: "bg-ink-100" },
  stalled: { label: "Stalled", color: "text-orange-700", bg: "bg-orange-100" },
};
