-- ============================================
-- Pivo Partners CRM — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. team
CREATE TABLE team (
  team_id    TEXT PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. startups
CREATE TABLE startups (
  startup_id          TEXT PRIMARY KEY,
  startup_name        TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'closed')),
  pitch_deck_url      TEXT NOT NULL DEFAULT '',
  data_room_url       TEXT NOT NULL DEFAULT '',
  pl_url              TEXT NOT NULL DEFAULT '',
  investment_memo_url TEXT NOT NULL DEFAULT '',
  notes               TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. projects
CREATE TABLE projects (
  project_id   TEXT PRIMARY KEY,
  startup_id   TEXT NOT NULL REFERENCES startups(startup_id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'paused', 'closed')),
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_startup_id ON projects(startup_id);

-- 4. investors
CREATE TABLE investors (
  investor_id   TEXT PRIMARY KEY,
  investor_name TEXT NOT NULL,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  email         TEXT NOT NULL DEFAULT '',
  linkedin      TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. project_investors (fundraising funnel)
CREATE TABLE project_investors (
  link_id        TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  investor_id    TEXT NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  stage          TEXT NOT NULL DEFAULT 'Pipeline',
  position_index INTEGER NOT NULL DEFAULT 0,
  last_update    TEXT NOT NULL DEFAULT '',
  next_action    TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(project_id, investor_id)
);

CREATE INDEX idx_pi_project_id ON project_investors(project_id);
CREATE INDEX idx_pi_investor_id ON project_investors(investor_id);
CREATE INDEX idx_pi_stage ON project_investors(project_id, stage);

-- 6. tasks
CREATE TABLE tasks (
  task_id           TEXT PRIMARY KEY,
  startup_id        TEXT NOT NULL DEFAULT '',
  project_id        TEXT NOT NULL DEFAULT '',
  title             TEXT NOT NULL,
  owner_id          TEXT NOT NULL DEFAULT '',
  due_date          TEXT NOT NULL DEFAULT '',
  due_time          TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'todo'
                      CHECK (status IN ('todo', 'doing', 'done')),
  priority          TEXT NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('low', 'medium', 'high')),
  notes             TEXT NOT NULL DEFAULT '',
  calendar_event_id TEXT NOT NULL DEFAULT '',
  sync_status       TEXT NOT NULL DEFAULT 'none'
                      CHECK (sync_status IN ('none', 'pending', 'synced', 'failed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_startup_id ON tasks(startup_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- 7. project_notes
CREATE TABLE project_notes (
  note_id    TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL DEFAULT '',
  title      TEXT NOT NULL DEFAULT '',
  content    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pnotes_project_id ON project_notes(project_id);

-- 8. investor_notes (NEW — schema only, API coming later)
CREATE TABLE investor_notes (
  note_id     TEXT PRIMARY KEY,
  investor_id TEXT NOT NULL REFERENCES investors(investor_id) ON DELETE CASCADE,
  project_id  TEXT NOT NULL DEFAULT '',
  author_id   TEXT NOT NULL DEFAULT '',
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  note_type   TEXT NOT NULL DEFAULT 'General Update',
  meeting_id  TEXT,
  task_id     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inotes_investor_id ON investor_notes(investor_id);

-- 9. meetings (NEW — schema only, API coming later)
CREATE TABLE meetings (
  meeting_id  TEXT PRIMARY KEY,
  project_id  TEXT REFERENCES projects(project_id) ON DELETE SET NULL,
  investor_id TEXT REFERENCES investors(investor_id) ON DELETE SET NULL,
  title       TEXT NOT NULL DEFAULT '',
  meeting_date TEXT NOT NULL DEFAULT '',
  meeting_time TEXT NOT NULL DEFAULT '',
  participants TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'manual',
  summary     TEXT NOT NULL DEFAULT '',
  next_steps  TEXT NOT NULL DEFAULT '',
  calendar_event_id TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_project_id ON meetings(project_id);
CREATE INDEX idx_meetings_investor_id ON meetings(investor_id);
CREATE INDEX idx_meetings_date ON meetings(meeting_date);

-- 10. config (key-value store)
CREATE TABLE config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Seed default pipeline stages
INSERT INTO config (key, value)
VALUES ('pipeline_stages', 'Pipeline|On Hold|Trying to reach|Active|Advanced|Declined');

-- ============================================
-- Auto-update updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_team_updated BEFORE UPDATE ON team FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_startups_updated BEFORE UPDATE ON startups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_investors_updated BEFORE UPDATE ON investors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pi_updated BEFORE UPDATE ON project_investors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pnotes_updated BEFORE UPDATE ON project_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inotes_updated BEFORE UPDATE ON investor_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_meetings_updated BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
