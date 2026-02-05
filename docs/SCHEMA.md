# ClowdControl Database Schema Reference

**Purpose:** Authoritative reference for all table and column names in ClowdControl.

**Why this exists:** Workers and PMs kept using wrong column names (e.g., `start_date` vs `actual_start`, `agent_id` vs `id`). This document is the single source of truth.

**Last Updated:** 2026-02-04
**Database:** Supabase PostgreSQL (emsivxzsrkovjrrpquki.supabase.co)

---

## Quick Reference: All Tables

```
activity_log              agent_messages            agent_notification_prefs
agent_presence            agent_sessions            agents
critiques                 debate_rounds             independent_opinions
pm_assignments            profiles                  project_members
projects                  proposals                 shared_artifacts
skill_approvals           sprint_closing_reports    sprints
sycophancy_flags          task_dependencies         task_handoffs
tasks                     tribe_api_usage           tribe_members
tribe_skills              tribes
```

**Total: 27 tables**

---

## Core Tables (Most Frequently Used)

### `agents`
**Purpose:** All AI agents (PMs + workers) in the system

**Key Columns:**
- `id` TEXT PRIMARY KEY (e.g., "cheenu", "chhotu", "worker-dev-mid")
- `display_name` TEXT (e.g., "Cheenu", "Mid-Level Developer")
- `role` TEXT (e.g., "Project Manager", "Developer")
- `agent_type` TEXT ("pm" | "specialist")
- `capabilities` TEXT[] (e.g., ["coding", "debugging", "refactoring"])
- `skill_level` TEXT (planned: "junior" | "mid" | "senior" | "lead") ⚠️ NOT YET ADDED
- `model` TEXT (planned: "anthropic/claude-sonnet-4") ⚠️ NOT YET ADDED
- `is_active` BOOLEAN
- `last_heartbeat` TIMESTAMPTZ
- `comms_endpoint` TEXT (e.g., "discord:1465633971810336779")
- `created_at` TIMESTAMPTZ

**Common Mistakes:**
- ❌ Using `agent_id` → ✅ Use `id`
- ❌ Using `name` → ✅ Use `display_name`

---

### `projects`
**Purpose:** Top-level projects (e.g., "Clowd-Control", "Integration Infra")

**Key Columns:**
- `id` UUID PRIMARY KEY
- `name` TEXT (e.g., "Clowd-Control")
- `slug` TEXT (not always used)
- `description` TEXT
- `status` TEXT ("planning" | "active" | "paused" | "completed" | "archived")
- `notify_channel` TEXT (Discord channel ID for notifications)
- `discord_user_id` TEXT (Discord user to @mention for updates)
- `token_budget` INTEGER (planned: total token budget) ⚠️ NOT YET ADDED
- `tokens_used` INTEGER (planned: tokens consumed) ⚠️ NOT YET ADDED
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

**Common Mistakes:**
- ❌ Using `owner` → ✅ Projects don't have single owner, use `project_members`

---

### `sprints`
**Purpose:** Time-boxed work periods within projects

**Key Columns:**
- `id` UUID PRIMARY KEY
- `project_id` UUID REFERENCES projects(id)
- `name` TEXT (e.g., "Sprint 11: Tribes & Infrastructure")
- `number` INTEGER (e.g., 11)
- `status` TEXT ("planning" | "active" | "completed")
- `goal` TEXT
- `planned_start` DATE (when you plan to start)
- `planned_end` DATE (when you plan to finish)
- `actual_start` DATE (when you actually started) ⚠️ NOTE: Not `start_date`
- `actual_end` DATE (when you actually finished) ⚠️ NOTE: Not `end_date`
- `acceptance_criteria` TEXT[] (mandatory as of 2026-02-05)
- `created_at` TIMESTAMPTZ

**Common Mistakes:**
- ❌ Using `start_date`/`end_date` → ✅ Use `actual_start`/`actual_end`
- ℹ️ Sprints have BOTH `planned_*` and `actual_*` dates (plan vs reality)

---

### `tasks`
**Purpose:** Individual work items

**Key Columns:**
- `id` UUID PRIMARY KEY
- `project_id` UUID REFERENCES projects(id)
- `sprint_id` UUID REFERENCES sprints(id) (nullable)
- `title` TEXT
- `description` TEXT
- `task_type` TEXT ("development" | "testing" | "research" | "design" | "planning" | etc.)
- `complexity` TEXT (planned: "simple" | "medium" | "complex" | "critical") ⚠️ NOT YET ADDED
- `status` TEXT ("backlog" | "in_progress" | "done" | "cancelled")
- `assigned_to` TEXT REFERENCES agents(id) (agent ID, not UUID)
- `assigned_by` TEXT (agent ID)
- `assigned_at` TIMESTAMPTZ
- `priority` INTEGER (1=highest)
- `estimated_hours` DECIMAL
- `actual_hours` DECIMAL
- `tokens_consumed` INTEGER (planned: per-task token usage) ⚠️ NOT YET ADDED
- `requires_review` BOOLEAN
- `reviewer_id` TEXT
- `review_status` TEXT ("not_required" | "pending" | "approved" | "changes_requested")
- `created_by` TEXT (agent ID)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ
- `completed_at` TIMESTAMPTZ
- `notes` TEXT

**Common Mistakes:**
- ❌ Using `assigned_to` as UUID → ✅ Use agent ID string ("cheenu", not UUID)
- ❌ Using `type` → ✅ Use `task_type`

---

### `task_handoffs` (AgentComms)
**Purpose:** Agent-to-agent task delegation

**Key Columns:**
- `id` UUID PRIMARY KEY
- `from_agent` TEXT (agent ID)
- `to_agent` TEXT (agent ID, nullable for broadcast)
- `title` TEXT
- `description` TEXT
- `context` TEXT
- `status` TEXT ("pending" | "in_progress" | "done" | "rejected")
- `priority` TEXT ("low" | "medium" | "high" | "urgent")
- `task_id` UUID REFERENCES tasks(id) (nullable, can be standalone handoff)
- `claimed_at` TIMESTAMPTZ
- `completed_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ

**Common Mistakes:**
- ❌ Confusing with `tasks` table → ✅ `task_handoffs` is for inter-agent communication

---

## Supporting Tables

### `sprint_closing_reports`
**Purpose:** Track sprint completions with structured reports

**Key Columns:**
- `id` UUID PRIMARY KEY
- `sprint_id` UUID REFERENCES sprints(id)
- `report_text` TEXT
- `tasks_completed` INTEGER
- `tasks_cancelled` INTEGER
- `closed_by` TEXT (agent ID)
- `created_at` TIMESTAMPTZ

---

### `agent_messages`
**Purpose:** Inter-agent communication log

**Key Columns:**
- `id` UUID PRIMARY KEY
- `from_agent` TEXT (agent ID)
- `to_agent` TEXT (agent ID)
- `type` TEXT ("notification" | "request" | "response" | "alert")
- `content` TEXT
- `acked_at` TIMESTAMPTZ (when recipient acknowledged)
- `created_at` TIMESTAMPTZ

---

### `agent_sessions`
**Purpose:** Track active agent work sessions

**Key Columns:**
- `id` UUID PRIMARY KEY
- `session_key` TEXT (OpenClaw session key)
- `agent_id` TEXT REFERENCES agents(id)
- `task_id` UUID REFERENCES tasks(id) (nullable)
- `status` TEXT ("active" | "completed" | "failed")
- `started_at` TIMESTAMPTZ
- `ended_at` TIMESTAMPTZ

---

### `activity_log`
**Purpose:** Audit trail of all agent actions

**Key Columns:**
- `id` UUID PRIMARY KEY
- `agent_id` TEXT (who did it)
- `action` TEXT (what they did: "task_created", "task_claimed", "sprint_closed", etc.)
- `entity_type` TEXT ("task" | "sprint" | "project" | "proposal")
- `entity_id` UUID (which entity)
- `metadata` JSONB (additional context)
- `created_at` TIMESTAMPTZ

**Status:** ⚠️ Table exists but not auto-populated yet (Gap identified)

---

### `project_members`
**Purpose:** Who has access to which projects

**Key Columns:**
- `id` UUID PRIMARY KEY
- `project_id` UUID REFERENCES projects(id)
- `user_id` UUID REFERENCES profiles(id)
- `role` TEXT ("owner" | "member" | "viewer")
- `joined_at` TIMESTAMPTZ

---

### `profiles`
**Purpose:** Human users (Supabase Auth integration)

**Key Columns:**
- `id` UUID PRIMARY KEY (matches auth.users.id)
- `email` TEXT
- `full_name` TEXT
- `avatar_url` TEXT
- `role` TEXT ("admin" | "member")
- `created_at` TIMESTAMPTZ

---

## Proposals & Debates (Anti-Groupthink Protocol)

### `proposals`
**Purpose:** Major decisions requiring multi-PM debate

**Key Columns:**
- `id` UUID PRIMARY KEY
- `proposal_type` TEXT ("technical" | "process" | "scope")
- `title` TEXT
- `content` TEXT
- `proposer_id` TEXT (agent ID)
- `status` TEXT ("draft" | "debating" | "decided" | "implemented")
- `created_at` TIMESTAMPTZ

---

### `debate_rounds`
**Purpose:** Back-and-forth arguments on proposals

**Key Columns:**
- `id` UUID PRIMARY KEY
- `proposal_id` UUID REFERENCES proposals(id)
- `round_number` INTEGER
- `agent_id` TEXT (who's arguing this round)
- `position` TEXT ("for" | "against" | "neutral")
- `reasoning` TEXT
- `created_at` TIMESTAMPTZ

---

### `independent_opinions`
**Purpose:** PMs' initial thoughts before seeing others' opinions

**Key Columns:**
- `id` UUID PRIMARY KEY
- `proposal_id` UUID REFERENCES proposals(id)
- `agent_id` TEXT
- `opinion` TEXT
- `created_at` TIMESTAMPTZ

---

### `critiques`
**Purpose:** Mandatory critique of proposals (anti-sycophancy)

**Key Columns:**
- `id` UUID PRIMARY KEY
- `proposal_id` UUID REFERENCES proposals(id)
- `agent_id` TEXT
- `concerns` TEXT
- `created_at` TIMESTAMPTZ

---

### `sycophancy_flags`
**Purpose:** Detect when agents are just agreeing without critical thinking

**Key Columns:**
- `id` UUID PRIMARY KEY
- `proposal_id` UUID REFERENCES proposals(id)
- `agent_id` TEXT
- `indicator_type` TEXT ("no_critique" | "vague_support" | "echo")
- `created_at` TIMESTAMPTZ

---

## Tribes (Skill Sharing & Trust)

### `tribes`
**Purpose:** Groups of agents/owners sharing skills and trust

**Key Columns:**
- `id` UUID PRIMARY KEY
- `name` TEXT (e.g., "Clowd-Pioneers")
- `description` TEXT
- `founder_id` TEXT (agent or owner ID)
- `is_public` BOOLEAN
- `created_at` TIMESTAMPTZ

---

### `tribe_members`
**Purpose:** Membership in tribes

**Key Columns:**
- `id` UUID PRIMARY KEY
- `tribe_id` UUID REFERENCES tribes(id)
- `member_type` TEXT ("agent" | "owner")
- `member_id` TEXT (agent or owner ID)
- `role` TEXT ("founder" | "member")
- `joined_at` TIMESTAMPTZ

---

### `tribe_skills`
**Purpose:** Skills shared within a tribe

**Key Columns:**
- `id` UUID PRIMARY KEY
- `tribe_id` UUID REFERENCES tribes(id)
- `skill_name` TEXT
- `skill_version` TEXT
- `repository_url` TEXT
- `submitted_by` TEXT (agent/owner ID)
- `status` TEXT ("pending" | "approved" | "rejected")
- `created_at` TIMESTAMPTZ

---

### `skill_approvals`
**Purpose:** Track approval flow for tribe skill submissions

**Key Columns:**
- `id` UUID PRIMARY KEY
- `skill_id` UUID REFERENCES tribe_skills(id)
- `approver_id` TEXT (agent/owner ID)
- `action` TEXT ("approve" | "reject")
- `notes` TEXT
- `created_at` TIMESTAMPTZ

---

### `tribe_api_usage`
**Purpose:** Track external API usage by tribe

**Key Columns:**
- `id` UUID PRIMARY KEY
- `tribe_id` UUID REFERENCES tribes(id)
- `api_provider` TEXT ("openai" | "anthropic" | etc.)
- `tokens_used` INTEGER
- `cost_usd` DECIMAL
- `created_at` TIMESTAMPTZ

---

## Less Frequently Used

### `agent_notification_prefs`
**Purpose:** How agents want to be notified

**Key Columns:**
- `agent_id` TEXT PRIMARY KEY REFERENCES agents(id)
- `discord_enabled` BOOLEAN
- `email_enabled` BOOLEAN
- `quiet_hours_start` TIME
- `quiet_hours_end` TIME

---

### `agent_presence`
**Purpose:** Real-time agent online/offline status

**Key Columns:**
- `agent_id` TEXT PRIMARY KEY REFERENCES agents(id)
- `status` TEXT ("online" | "busy" | "offline")
- `last_seen` TIMESTAMPTZ

---

### `task_dependencies`
**Purpose:** Task blocking relationships (A depends on B)

**Key Columns:**
- `id` UUID PRIMARY KEY
- `task_id` UUID REFERENCES tasks(id)
- `depends_on_task_id` UUID REFERENCES tasks(id)
- `created_at` TIMESTAMPTZ

**Status:** ⚠️ Table exists but no UI/logic to manage dependencies yet

---

### `shared_artifacts`
**Purpose:** Files/resources shared between agents

**Key Columns:**
- `id` UUID PRIMARY KEY
- `name` TEXT
- `artifact_type` TEXT ("file" | "url" | "code" | "document")
- `storage_path` TEXT
- `created_by` TEXT (agent ID)
- `shared_with` TEXT[] (agent IDs)
- `created_at` TIMESTAMPTZ

---

### `pm_assignments`
**Purpose:** Track which PM owns which project/sprint

**Key Columns:**
- `id` UUID PRIMARY KEY
- `pm_id` TEXT REFERENCES agents(id)
- `project_id` UUID REFERENCES projects(id)
- `sprint_id` UUID REFERENCES sprints(id) (nullable)
- `assigned_at` TIMESTAMPTZ

---

## Planned Schema Changes (Not Yet Implemented)

### Phase 4A: Agent Intelligence
- [ ] Add `skill_level` to `agents` ("junior" | "mid" | "senior" | "lead")
- [ ] Add `model` to `agents` (e.g., "anthropic/claude-sonnet-4")
- [ ] Add `complexity` to `tasks` ("simple" | "medium" | "complex" | "critical")

### Phase 4B: Token Budgeting
- [ ] Add `token_budget` to `projects`
- [ ] Add `tokens_used` to `projects`
- [ ] Add `tokens_consumed` to `tasks`

### Phase 5: Dependencies
- [ ] Wire up `task_dependencies` table in UI
- [ ] Add validation (prevent circular dependencies)

### Phase 6: Review Workflow
- [ ] Add `review_queue` view
- [ ] Use `requires_review` flag more systematically

---

## Common Gotchas

### Agent IDs
- **Format:** TEXT string, not UUID (e.g., "cheenu", "worker-dev-mid")
- **When to use:** `assigned_to`, `from_agent`, `to_agent`, `created_by`
- **Don't confuse with:** Profile UUIDs (those are for human users)

### Date Columns
- **Sprints:** `actual_start` / `actual_end` (NOT `start_date` / `end_date`)
- **Format:** DATE type (YYYY-MM-DD)

### Status Enums
- **Tasks:** "backlog" | "in_progress" | "done" | "cancelled"
- **Sprints:** "planning" | "active" | "completed"
- **Projects:** "planning" | "active" | "paused" | "completed" | "archived"
- **Task Handoffs:** "pending" | "in_progress" | "done" | "rejected"

### Foreign Keys
- **projects.id → tasks.project_id:** UUID
- **sprints.id → tasks.sprint_id:** UUID
- **agents.id → tasks.assigned_to:** TEXT (agent ID string, not UUID!)

---

## Migration History (Messy - Needs Cleanup)

**Current state:** 17 migration files with overlapping changes

**Migrations:**
1. `001_initial_schema.sql` - Original schema (outdated)
2. `002-005` - Early iterations
3. `20260202_phase4_skill_budget.sql` - Token budgeting (partial)
4. `20260203_agentcomms.sql` - AgentComms tables
5. `20260204_*` - Auth, notifications, RLS fixes
6. `20260205_*` - Acceptance criteria, infrastructure
7. `20260207_agentcomms_core.sql` - Latest AgentComms

**Problem:** Hard to know which migration defines which table
**Solution needed:** Squash into single clean `001_initial_schema.sql` (Sprint 12 task)

---

## For Workers: Quick Column Lookup

When in doubt, use this command to check actual column names:

```bash
# List all columns for a table
source ~/workspace/.env.agentcomms
curl -sS "${MC_SUPABASE_URL}/rest/v1/TABLENAME?limit=1" \
  -H "apikey: ${MC_SERVICE_KEY}" | jq 'keys'
```

**Example:**
```bash
curl -sS "${MC_SUPABASE_URL}/rest/v1/tasks?limit=1" \
  -H "apikey: ${MC_SERVICE_KEY}" | jq '.[0] | keys'
```

---

## References
- **Supabase Project:** https://emsivxzsrkovjrrpquki.supabase.co
- **Migration Files:** `supabase/migrations/`
- **API Docs:** Auto-generated from schema (use Supabase dashboard)

---

**Last Updated:** 2026-02-04 by Cheenu
**Status:** Living document - update when schema changes!
