-- =============================================
-- Migration: ensure all columns exist for Pivo Partners
-- Run this in the Supabase SQL Editor
-- Uses ADD COLUMN IF NOT EXISTS (safe to re-run)
-- =============================================

-- TEAM
CREATE TABLE IF NOT EXISTS team (
  team_id TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  email TEXT DEFAULT ''
);

-- STARTUPS
CREATE TABLE IF NOT EXISTS startups (
  startup_id TEXT PRIMARY KEY,
  startup_name TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  pitch_deck_url TEXT DEFAULT '',
  data_room_url TEXT DEFAULT '',
  pl_url TEXT DEFAULT '',
  investment_memo_url TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

-- PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  startup_id TEXT DEFAULT '',
  project_name TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

-- TASKS
CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  startup_id TEXT DEFAULT '',
  project_id TEXT DEFAULT '',
  investor_id TEXT DEFAULT '',
  title TEXT DEFAULT '',
  owner_id TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT '',
  due_time TEXT DEFAULT '',
  calendar_event_id TEXT DEFAULT '',
  sync_status TEXT DEFAULT 'none'
);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS investor_id TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS calendar_event_id TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'none';

-- INVESTORS
CREATE TABLE IF NOT EXISTS investors (
  investor_id TEXT PRIMARY KEY,
  investor_name TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

-- PROJECT_INVESTORS (extended 19-column schema)
CREATE TABLE IF NOT EXISTS project_investors (
  link_id TEXT PRIMARY KEY,
  project_id TEXT DEFAULT '',
  investor_id TEXT DEFAULT '',
  stage TEXT DEFAULT '',
  position_index INTEGER DEFAULT 0,
  owner_id TEXT DEFAULT '',
  priority TEXT DEFAULT '',
  last_interaction_date TEXT DEFAULT '',
  last_interaction_type TEXT DEFAULT '',
  next_step TEXT DEFAULT '',
  follow_up_date TEXT DEFAULT '',
  latest_update TEXT DEFAULT '',
  fit_summary TEXT DEFAULT '',
  source TEXT DEFAULT '',
  last_update TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS position_index INTEGER DEFAULT 0;
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS owner_id TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS last_interaction_date TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS last_interaction_type TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS next_step TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS follow_up_date TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS latest_update TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS fit_summary TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS source TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS last_update TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS next_action TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS created_at TEXT DEFAULT '';
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS updated_at TEXT DEFAULT '';

-- STARTUP_INVESTORS (legacy)
CREATE TABLE IF NOT EXISTS startup_investors (
  link_id TEXT PRIMARY KEY,
  startup_id TEXT DEFAULT '',
  investor_id TEXT DEFAULT '',
  stage TEXT DEFAULT '',
  last_update TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

-- CONFIG
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

-- PROJECT_NOTES
CREATE TABLE IF NOT EXISTS project_notes (
  note_id TEXT PRIMARY KEY,
  project_id TEXT DEFAULT '',
  investor_id TEXT DEFAULT '',
  author_id TEXT DEFAULT '',
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  note_type TEXT DEFAULT 'general_update',
  next_step TEXT DEFAULT '',
  follow_up_date TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  meeting_id TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
ALTER TABLE project_notes ADD COLUMN IF NOT EXISTS investor_id TEXT DEFAULT '';
ALTER TABLE project_notes ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'general_update';
ALTER TABLE project_notes ADD COLUMN IF NOT EXISTS next_step TEXT DEFAULT '';
ALTER TABLE project_notes ADD COLUMN IF NOT EXISTS follow_up_date TEXT DEFAULT '';
ALTER TABLE project_notes ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';
ALTER TABLE project_notes ADD COLUMN IF NOT EXISTS meeting_id TEXT DEFAULT '';

-- MEETINGS
CREATE TABLE IF NOT EXISTS meetings (
  meeting_id TEXT PRIMARY KEY,
  project_id TEXT DEFAULT '',
  investor_id TEXT DEFAULT '',
  title TEXT DEFAULT '',
  date TEXT DEFAULT '',
  time TEXT DEFAULT '',
  participants TEXT DEFAULT '',
  status TEXT DEFAULT 'scheduled',
  source TEXT DEFAULT 'manual',
  summary TEXT DEFAULT '',
  next_steps TEXT DEFAULT '',
  calendar_event_id TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);

-- INVESTORS: origin column (br / intl)
ALTER TABLE investors ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT '';

-- PROJECT_INVESTORS: wave column (1 / 2 / 3 / 4)
ALTER TABLE project_investors ADD COLUMN IF NOT EXISTS wave TEXT DEFAULT '';

-- ACTIVITY_LOG
CREATE TABLE IF NOT EXISTS activity_log (
  activity_id TEXT PRIMARY KEY,
  project_id TEXT DEFAULT '',
  investor_id TEXT DEFAULT '',
  activity_type TEXT DEFAULT '',
  description TEXT DEFAULT '',
  metadata TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  created_by TEXT DEFAULT ''
);
