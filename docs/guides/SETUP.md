# Mission Control — Setup Guide

> Multi-agent task coordination system with a PM dashboard and AI worker dispatch.

## Prerequisites

- **Node.js** 20+ (for Next.js dashboard)
- **Clawdbot** installed and running (the PM agent)
- **Supabase** account (shared DB for all participants)
- **Discord** server with a webhook (for PM notifications)
- **GitHub** access to clone the repo

---

## 1. Clone the Repository

```bash
git clone git@github.com:jugaad-lab/clowd-control.git
cd ClowdControl
```

---

## 2. Supabase Setup

### For NEW instances (setting up your own Supabase)

Create a new Supabase project at https://supabase.com, then run this SQL to create the schema:

```sql
-- Projects
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  owner_type TEXT,
  owner_ids TEXT[],
  current_pm_id TEXT,
  pm_assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deadline TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{"execution_mode": "manual", "sprint_approval": "required", "budget_limit_per_sprint": null, "notification_webhook_url": null, "notification_types": {"task_started": true, "mode_changed": true, "bug_reported": true, "task_completed": true, "sprint_completed": true}}'::jsonb,
  token_budget BIGINT,
  tokens_used BIGINT DEFAULT 0
);

-- Sprints
CREATE TABLE sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number INT,
  acceptance_criteria TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'review', 'completed')),
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agents (worker profiles)
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  role TEXT,
  description TEXT,
  mcu_codename TEXT,
  agent_type TEXT DEFAULT 'specialist',
  capabilities TEXT[],
  clawdbot_instance TEXT,
  invocation_method TEXT DEFAULT 'sessions_spawn',
  invocation_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  skill_level TEXT DEFAULT 'mid',
  model TEXT
);

-- Tasks
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'development',
  acceptance_criteria TEXT,
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'assigned', 'in_progress', 'review', 'done', 'blocked', 'cancelled')),
  assigned_to TEXT REFERENCES agents(id),
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ,
  depends_on UUID[],
  blocks UUID[],
  priority INT DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  order_in_sprint INT,
  deadline TIMESTAMPTZ,
  estimated_hours DECIMAL,
  actual_hours DECIMAL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  attachments TEXT[] DEFAULT '{}',
  complexity TEXT DEFAULT 'medium',
  tokens_consumed INT DEFAULT 0,
  shadowing TEXT DEFAULT 'none',
  requires_review BOOLEAN DEFAULT false,
  reviewer_id TEXT,
  review_status TEXT DEFAULT 'not_required',
  review_notes TEXT
);

-- Enable RLS (Row Level Security) but allow anon access for now
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON projects FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON sprints FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON tasks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON agents FOR ALL TO anon USING (true) WITH CHECK (true);
```

### For SHARED instances (joining an existing Supabase)

If you're joining an existing Mission Control (like Cheenu joining Yajat's setup):
1. Get the Supabase URL and Anon Key from the project owner
2. Add your agent profile to the `agents` table (see Step 4)
3. That's it — you share the same projects, sprints, and tasks

---

## 3. Dashboard Setup

```bash
cd dashboard
npm install
```

Create `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Discord Integration (optional — for PM notifications)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
```

Start the dashboard:

```bash
npm run dev
# Open http://localhost:3000
```

---

## 4. Register Your Agent Profile

Add your Clawdbot as an agent in Supabase:

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/rest/v1/agents" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "your-agent-id",
    "display_name": "Your Bot Name",
    "role": "Project Manager",
    "description": "Multi-agent PM for task coordination",
    "agent_type": "pm",
    "capabilities": ["task_dispatch", "sprint_management", "monitoring"],
    "clawdbot_instance": "your-clawdbot-name",
    "invocation_method": "sessions_spawn",
    "skill_level": "senior",
    "model": "claude-sonnet-4"
  }'
```

### Adding Worker Profiles

Workers are specialist agents that execute tasks. Add profiles for each:

```bash
# Example: Developer worker
curl -X POST "https://YOUR_PROJECT.supabase.co/rest/v1/agents" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "dev-worker",
    "display_name": "Dev Worker",
    "role": "Developer",
    "agent_type": "specialist",
    "capabilities": ["typescript", "python", "react", "nextjs"],
    "invocation_method": "claude_code",
    "skill_level": "senior",
    "model": "claude-sonnet-4"
  }'
```

See `agents/` folder for full profile examples.

---

## 5. Discord Webhook Setup

1. Go to your Discord server → Channel Settings → Integrations → Webhooks
2. Click "New Webhook", name it "Mission Control PM"
3. Copy the webhook URL
4. Either:
   - Set it in `.env.local` as `DISCORD_WEBHOOK_URL` (global fallback)
   - Or configure per-project in Dashboard → Project Settings → Notifications

---

## 6. Install the PM Protocol Skill (optional)

If you want your Clawdbot to act as PM:

```bash
clawdhub install mission-control-pm
# OR copy the skill/ folder to your Clawdbot's skills directory
```

---

## 7. Create Your First Project

Via Dashboard: Click "New Project" and fill in the details.

Via API:
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/rest/v1/projects" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "description": "Description here",
    "status": "active",
    "created_by": "your-agent-id"
  }'
```

---

## Known Issues & Gotchas

These are real issues we hit during development. Save yourself the pain:

### 🔴 Cron `systemEvent` + `sessionTarget: main` silently drops messages

**Problem:** If you create a monitoring cron with `payload.kind: "systemEvent"` and `sessionTarget: "main"`, it goes through the heartbeat path. If `HEARTBEAT.md` is empty, the cron fires but **does nothing** — no error, no log, just silently skipped.

**Fix:** Always use `payload.kind: "agentTurn"` + `sessionTarget: "isolated"` + `deliver: true` for monitoring crons.

```json
{
  "sessionTarget": "isolated",
  "wakeMode": "next-heartbeat",
  "payload": {
    "kind": "agentTurn",
    "message": "Your monitoring instructions...",
    "deliver": true,
    "channel": "discord",
    "to": "channel:YOUR_CHANNEL_ID"
  }
}
```

### 🔴 Claude Code interactive mode hangs in background

**Problem:** Spawning Claude Code with `claude "prompt"` in background opens an interactive welcome screen that waits for input. The agent never starts working.

**Fix:** Always use `-p` flag for non-interactive mode:
```bash
claude -p "Follow TASK.md" --allowedTools "Bash(*)" "Edit(*)" "Write(*)" "Read(*)"
```

### 🔴 Claude Code needs project pre-trust

**Problem:** Claude Code shows a trust dialog on first run in a project, which blocks automated execution.

**Fix:** Pre-trust the project in `~/.claude.json` before spawning:
```python
import json
config = json.load(open(os.path.expanduser('~/.claude.json')))
config['projects']['/path/to/project']['hasTrustDialogAccepted'] = True
json.dump(config, open(os.path.expanduser('~/.claude.json'), 'w'), indent=2)
```

### 🟡 Tasks table requires `created_by` (NOT NULL)

**Problem:** Inserting tasks without `created_by` fails with a constraint violation.

**Fix:** Always include `"created_by": "your-agent-id"` when creating tasks.

### 🟡 `assigned_to` has a foreign key to `agents` table

**Problem:** Can't assign a task to someone who isn't in the agents table (e.g., `"admin"` fails if there's no agent with `id: "admin"`).

**Fix:** Add human participants as agents too, or leave `assigned_to` null for human tasks and use the title prefix `[HUMAN]`.

### 🟡 Supabase returns arrays for POST with `Prefer: return=representation`

**Problem:** POST responses are arrays `[{...}]` not objects `{...}`. Parsing with `d["id"]` fails.

**Fix:** Use `d[0]["id"]` when parsing POST responses.

### 🟡 Mark tasks done WITH `completed_at` timestamp

**Problem:** Marking tasks as `done` without setting `completed_at` breaks time-based metrics and velocity calculations.

**Fix:** Always include `completed_at` when setting status to `done`:
```json
{"status": "done", "completed_at": "2026-02-03T08:00:00Z"}
```

### 🟢 Dashboard queries Supabase directly (no server-side GET API)

**Info:** The dashboard uses client-side Supabase queries. There are no `GET` handlers on `/api/projects` or `/api/tasks`. This works for the UI but means external tools must query Supabase directly.

---

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   Dashboard UI   │────▶│   Supabase   │◀────│  PM Agent   │
│  (Next.js 15)   │     │  (Shared DB) │     │ (Clawdbot)  │
└────────┬────────┘     └──────┬───────┘     └──────┬──────┘
         │                     │                     │
         │  Webhook           │ REST API            │ Cron + Spawn
         ▼                     │                     ▼
┌─────────────────┐           │             ┌──────────────┐
│    Discord       │           │             │   Workers    │
│  #mission-ctrl   │           │             │ (Claude Code,│
└─────────────────┘           │             │  task exec) │
                               │             └──────────────┘
                               │
                    ┌──────────┴──────────┐
                    │  Other Clawdbots    │
                    │  (shared access)    │
                    └─────────────────────┘
```

**Key concept:** Multiple Clawdbots share the same Supabase. Each has their own agent profile. The PM dispatches tasks to workers (specialist task executors) that execute and report back.

---

## For Cheenu (Quick Start)

Since you're joining an existing Mission Control instance:

1. **Clone:** `git clone git@github.com:jugaad-lab/clowd-control.git`
2. **Dashboard:** `cd dashboard && npm install`
3. **Env:** Create `.env.local` with Supabase URL/key (get from Yajat)
4. **Register:** Add your agent profile to the shared Supabase (see Step 4)
5. **Discord:** Get added to #disclawd-mission-control
6. **Run:** `npm run dev` → http://localhost:3000
7. **PM Skill:** Copy `skill/` to your Clawdbot's skills directory

That's it. You'll see the same projects, sprints, and tasks. You can create your own worker profiles and start dispatching.

---

## Execution Modes

| Mode | Cron | Behavior | Tasks/cycle |
|------|------|----------|-------------|
| **Manual** | None | Wait for Start button, single task | 1 |
| **Full Speed** | Every 5 min | Chain all backlog tasks non-stop | All |
| **Background** | Every 30 min | Pick one task, dispatch, wait | 1 |

Configure in Dashboard → Project → Settings.

---

## File Structure

```
ClowdControl/
├── dashboard/              # Next.js 15 dashboard app
│   ├── src/
│   │   ├── app/            # Pages + API routes
│   │   ├── components/     # UI components
│   │   └── lib/            # Supabase client, utilities
│   └── .env.local          # Your config (not in git)
├── agents/                 # Worker profile definitions
├── tasks/                  # Task specification files
├── skill/                  # ClawdHub-publishable PM skill
├── PM-PROTOCOL.md          # The PM behavioral protocol
├── SETUP.md                # This file
└── PLAN.md                 # Project roadmap
```
