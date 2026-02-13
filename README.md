# Pivo Partners — Internal Fundraising CRM

A lightweight internal web app (Notion-like + CRM) for a small fundraising consultancy team. Built with Next.js 14, TypeScript, and Tailwind CSS, backed by a single Google Sheets spreadsheet as the database.

## Features

- **Dashboard** — Today's tasks grouped by team member, with Today/This Week/Overdue filters
- **Startups List** — All startups with open task counts, project counts, and materials completeness
- **Startup Detail** — Shows all projects for the startup, plus startup-level tasks and materials
- **Projects List** — All projects across startups, filterable by startup and status
- **Project Detail** with 3 tabs:
  - **Pipeline (Kanban)** — Drag-and-drop investor cards between pipeline stages, with stage dropdown on each card
  - **Tasks** — Create/edit/complete tasks (project-scoped, with toggle to include startup-level tasks)
  - **Materials** — Startup-level material links (Pitch Deck, Data Room, P&L, Investment Memo)
- **Investors Directory** — Global investor list with search, tags, contact info, and project relationships
- **Sidebar Navigation** — Home, Startups, Projects, Investors

### Pipeline Stages (Global)

Configured in the `CONFIG` tab. Default stages:

1. Potentials
2. Initial Contact
3. Advanced Contact
4. Due Diligence
5. Negotiation
6. Declined
7. Accepted

---

## Setup

### 1. Create the Google Sheet

Create a new Google Sheets spreadsheet with **exactly these tab names and column headers** (row 1 = headers):

#### Tab: `TEAM`
| team_id | name |
|---------|------|
| 1       | Alice |
| 2       | Bob   |

#### Tab: `STARTUPS`
| startup_id | startup_name | status | pitch_deck_url | data_room_url | pl_url | investment_memo_url | notes |
|------------|-------------|--------|---------------|--------------|--------|-------------------|-------|

`status` must be one of: `active`, `paused`, `closed`

#### Tab: `PROJECTS`
| project_id | startup_id | project_name | status | created_at | notes |
|-----------|-----------|-------------|--------|-----------|-------|

- `status`: `active`, `paused`, or `closed`
- `created_at`: ISO timestamp (auto-set by app)

#### Tab: `TASKS`
| task_id | startup_id | project_id | title | owner_id | due_date | status | priority | notes | created_at | updated_at |
|---------|-----------|-----------|-------|----------|----------|--------|----------|-------|------------|------------|

- `project_id`: optional — leave blank for startup-level tasks
- `due_date`: `YYYY-MM-DD`
- `status`: `todo`, `doing`, or `done`
- `priority`: `low`, `medium`, or `high`
- `owner_id`: references `TEAM.team_id`

#### Tab: `INVESTORS`
| investor_id | investor_name | tags | email | linkedin | notes |
|------------|--------------|------|-------|----------|-------|

`tags`: semicolon-separated, e.g. `VC;Angel;FO;CVC`

#### Tab: `PROJECT_INVESTORS`
| link_id | project_id | investor_id | stage | last_update | next_action | notes |
|---------|-----------|-------------|-------|-------------|------------|-------|

- `stage`: must be one of the pipeline stages from CONFIG
- `last_update`: `YYYY-MM-DD` (auto-updated on stage change)

#### Tab: `STARTUP_INVESTORS` (Legacy — for migration)
| link_id | startup_id | investor_id | stage | last_update | next_action | notes |
|---------|-----------|-------------|-------|-------------|------------|-------|

This tab is kept for backward compatibility. The app primarily uses `PROJECT_INVESTORS`. See migration instructions below.

#### Tab: `CONFIG`
| key | value |
|-----|-------|
| pipeline_stages | Potentials\|Initial Contact\|Advanced Contact\|Due Diligence\|Negotiation\|Declined\|Accepted |

The `pipeline_stages` value uses `|` as separator. You can customize the stages by editing this value.

### 2. Create a Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Sheets API**:
   - Go to APIs & Services > Library
   - Search for "Google Sheets API" and enable it
4. Create a **Service Account**:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Give it a name (e.g. `pivo-sheets`)
   - Click "Create and Continue" > "Done"
5. Create a key:
   - Click on the service account
   - Go to Keys > Add Key > Create new key > JSON
   - Download the JSON file

### 3. Share the Sheet with the Service Account

Open your Google Sheet, click "Share", and add the service account email (found in the JSON key file as `client_email`). Give it **Editor** access.

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

```env
# From the JSON key file
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# From the Google Sheet URL: https://docs.google.com/spreadsheets/d/{THIS_ID}/edit
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here

# Simple auth (optional, for v1)
APP_PASSWORD=changeme123
```

**Important:** The `GOOGLE_PRIVATE_KEY` value must have `\n` for newlines (as shown in the JSON file).

### 5. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Visit [http://localhost:3000/health](http://localhost:3000/health) to verify the Google Sheets connection.

### 6. Deploy (Cheap Options)

- **Vercel** (free tier): `npx vercel` — set env vars in the Vercel dashboard
- **Railway** / **Render** (free/cheap): Push to GitHub, connect the repo
- **VPS** (e.g. $5/mo DigitalOcean): `npm run build && npm start`

---

## Migration: STARTUP_INVESTORS to PROJECT_INVESTORS

If you have existing data in a `STARTUP_INVESTORS` tab, run the migration script to move it to the new project-based pipeline:

### Prerequisites

1. Ensure `PROJECTS` and `PROJECT_INVESTORS` tabs exist in your spreadsheet (with headers in row 1)
2. Install `dotenv` and `tsx` for running the script:

```bash
npm install -D dotenv tsx
```

### Run Migration

```bash
npx tsx scripts/migrate_to_projects.ts
```

### What it does

1. **Creates default projects** — For each startup with no projects, creates a "Default Project"
2. **Migrates investor links** — Copies rows from `STARTUP_INVESTORS` to `PROJECT_INVESTORS`, mapped to the default project
3. **Maps pipeline stages** — Automatically maps old stages to new ones (e.g. "Target" → "Potentials", "Contacted" → "Initial Contact", "Passed" → "Declined")
4. **Is idempotent** — Safe to run multiple times. Skips already-migrated data.

### Migration Report

The script outputs a report showing:
- Number of startups found
- Number of default projects created
- Number of links migrated
- Number of skipped duplicates
- Any stage mapping issues

---

## Project Structure

```
src/
  app/
    page.tsx                     # Home dashboard
    layout.tsx                   # App layout with sidebar
    health/page.tsx              # System health check
    startups/
      page.tsx                   # Startups list
      [id]/page.tsx              # Startup detail (projects + tasks + materials)
    projects/
      page.tsx                   # Projects list (with filters)
      [id]/page.tsx              # Project detail (pipeline + tasks + materials)
    investors/
      page.tsx                   # Investors directory
    api/
      health/route.ts            # GET health check
      team/route.ts              # GET team members
      startups/route.ts          # GET/POST/PUT startups
      projects/route.ts          # GET/POST/PUT projects
      tasks/route.ts             # GET/POST/PUT tasks
      investors/route.ts         # GET/POST/PUT investors
      project-investors/route.ts # GET/POST/PUT project-investor pipeline links
      startup-investors/route.ts # GET/POST/PUT legacy startup-investor links
      config/route.ts            # GET config + pipeline stages
  components/
    Sidebar.tsx                  # Navigation sidebar (Home, Startups, Projects, Investors)
    Modal.tsx                    # Reusable modal
    TaskForm.tsx                 # Task create/edit form
    PipelineTab.tsx              # Kanban board with drag-and-drop + stage dropdown
    TasksTab.tsx                 # Tasks by person / list view
    MaterialsTab.tsx             # Materials link editor
  lib/
    sheets.ts                    # Google Sheets data layer (read/write/cache)
    api.ts                       # Client-side fetch helpers
  types/
    index.ts                     # TypeScript types for all entities
scripts/
  migrate_to_projects.ts         # Migration: STARTUP_INVESTORS -> PROJECT_INVESTORS
```

---

## How It Works

- **All data** lives in Google Sheets. The app reads and writes rows directly.
- **Projects** belong to Startups. Each startup can have multiple projects. The investor pipeline is per-project.
- **Tasks** can be startup-level (no project_id) or project-level. The project detail page can toggle to show both.
- **Caching**: Reads are cached for 30 seconds to reduce API calls. Writes invalidate the relevant cache.
- **IDs**: Generated as `{prefix}_{timestamp36}_{random}` (e.g. `tsk_m5x2a_9f3k`) — collision-safe for low traffic.
- **Pipeline stages**: Configured in the `CONFIG` tab. The Kanban board reads stages from there.
- **Drag-and-drop**: Uses native HTML drag events. Dropping an investor card on a new stage column updates `PROJECT_INVESTORS.stage` and sets `last_update` to today.
- **Stage dropdown**: Each investor card also has an inline dropdown for quick stage changes.
- **Optimistic UI**: Stage changes update immediately in the UI, then persist to Sheets. On failure, the UI reverts and shows an error message.

---

## Troubleshooting

### "Connection Failed" on /health

- Check that `GOOGLE_SHEETS_SPREADSHEET_ID` is correct (it's the long ID in the Sheet URL)
- Check that `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` are set correctly
- Ensure the Google Sheet is shared with the service account email (Editor access)
- Ensure the Google Sheets API is enabled in your Google Cloud project

### "Row with id not found"

- The ID you're trying to update doesn't exist in the sheet
- Check that the tab names match exactly: `TEAM`, `STARTUPS`, `PROJECTS`, `TASKS`, `INVESTORS`, `PROJECT_INVESTORS`, `STARTUP_INVESTORS`, `CONFIG`

### "Invalid stage" error

- The stage value must match one of the `pipeline_stages` in the `CONFIG` tab
- Check for extra spaces or typos in the CONFIG value

### Missing CONFIG or pipeline_stages

- If the `CONFIG` tab doesn't exist or doesn't have a `pipeline_stages` row, the app falls back to the default stages: Potentials, Initial Contact, Advanced Contact, Due Diligence, Negotiation, Declined, Accepted

### Malformed private key

- The `GOOGLE_PRIVATE_KEY` must include the full key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Use `\n` for newlines within the key string
- Wrap the entire value in double quotes in `.env`

### Sheets API rate limits

- Google Sheets API has a limit of ~100 requests per 100 seconds per user
- The app caches reads for 30 seconds, which is sufficient for a small team
- If you hit limits, increase the cache TTL in `src/lib/sheets.ts`

### Changes not appearing

- The cache TTL is 30 seconds. Wait or refresh after a few seconds.
- Direct edits in Google Sheets will show up after the cache expires.
