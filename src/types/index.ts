// ============================================
// Data types matching Google Sheets tab columns
// ============================================

export interface TeamMember {
  team_id: string;
  name: string;
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
  title: string;
  owner_id: string;
  due_date: string; // YYYY-MM-DD
  status: TaskStatus;
  priority: TaskPriority;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Investor {
  investor_id: string;
  investor_name: string;
  tags: string; // semicolon-separated
  email: string;
  linkedin: string;
  notes: string;
}

// NEW — pipeline is per-project now
export interface ProjectInvestor {
  link_id: string;
  project_id: string;
  investor_id: string;
  stage: string;
  last_update: string; // YYYY-MM-DD
  next_action: string;
  notes: string;
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
