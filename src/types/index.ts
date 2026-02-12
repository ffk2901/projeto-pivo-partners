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

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  task_id: string;
  startup_id: string;
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

export interface StartupInvestor {
  link_id: string;
  startup_id: string;
  investor_id: string;
  stage: string;
  last_update: string; // YYYY-MM-DD
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

export interface StartupWithCounts extends Startup {
  openTaskCount: number;
  investorCount: number;
}

export interface InvestorWithStartups extends Investor {
  startups: {
    startup_id: string;
    startup_name: string;
    stage: string;
  }[];
}

export interface PipelineInvestorCard extends StartupInvestor {
  investor_name: string;
  tags: string;
}
