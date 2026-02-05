# ClowdControl Database Schema

Complete reference for all tables, columns, and relationships.

**Last updated:** 2026-02-05  
**Total tables:** 24

---

## Table of Contents

1. [Core Entities](#core-entities)
   - [owners](#owners)
   - [agents](#agents)
   - [profiles](#profiles)
2. [Projects & Sprints](#projects--sprints)
   - [projects](#projects)
   - [project_owners](#project_owners)
   - [project_members](#project_members)
   - [agent_assignments](#agent_assignments)
   - [sprints](#sprints)
   - [sprint_closing_reports](#sprint_closing_reports)
3. [Tasks](#tasks)
   - [tasks](#tasks-1)
   - [task_dependencies](#task_dependencies)
   - [task_updates](#task_updates)
4. [Agent Communication](#agent-communication)
   - [task_handoffs](#task_handoffs)
   - [agent_messages](#agent_messages)
   - [agent_sessions](#agent_sessions)
   - [agent_presence](#agent_presence)
   - [agent_notification_prefs](#agent_notification_prefs)
   - [agent_conversations](#agent_conversations)
5. [Governance & Trust](#governance--trust)
   - [trust_relationships](#trust_relationships)
   - [proposals](#proposals)
   - [debate_rounds](#debate_rounds)
   - [independent_opinions](#independent_opinions)
   - [critiques](#critiques)
   - [sycophancy_flags](#sycophancy_flags)
6. [Activity & Artifacts](#activity--artifacts)
   - [activity_log](#activity_log)
   - [shared_artifacts](#shared_artifacts)

---

## Core Entities

### owners

Human owners who control agents.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `discord_id` | TEXT | NO | - | Discord user ID (unique) |
| `name` | TEXT | NO | - | Display name |
| `email` | TEXT | YES | - | Email address |
| `avatar_url` | TEXT | YES | - | Profile image URL |
| `timezone` | TEXT | YES | 'UTC' | Owner's timezone |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| `updated_at` | TIMESTAMPTZ | YES | NOW() | Updated timestamp |

### agents

AI agents belonging to owners.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID/TEXT | NO | - | Primary key (often text ID like 'chhotu') |
| `owner_id` | UUID | NO | - | FK → owners.id |
| `discord_id` | TEXT | YES | - | Discord bot user ID |
| `discord_user_id` | TEXT | YES | - | Discord user ID for @mentions |
| `name` | TEXT | NO | - | Agent name |
| `emoji` | TEXT | YES | - | Agent emoji |
| `description` | TEXT | YES | - | Agent description |
| `capabilities` | JSONB | YES | '[]' | List of capabilities |
| `skills_offered` | JSONB | YES | '[]' | Skills for AgentComms discovery |
| `status` | TEXT | YES | 'active' | active/inactive/suspended/online/idle/busy/offline |
| `invocation_config` | JSONB | YES | - | Model & tool config for spawning |
| `skill_level` | skill_level | YES | 'mid' | junior/mid/senior/lead |
| `model` | TEXT | YES | - | Preferred model ID |
| `last_seen_at` | TIMESTAMPTZ | YES | - | Last activity |
| `last_heartbeat` | TIMESTAMPTZ | YES | - | Last heartbeat ping |
| `comms_endpoint` | TEXT | YES | - | AgentComms endpoint URL |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| `updated_at` | TIMESTAMPTZ | YES | NOW() | Updated timestamp |

**Indexes:** `idx_agents_owner`, `idx_agents_discord`, `idx_agents_discord_user_id`

### profiles

Extends Supabase Auth users for dashboard access.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | - | FK → auth.users.id |
| `email` | TEXT | YES | - | User email |
| `display_name` | TEXT | YES | - | Display name |
| `role` | TEXT | NO | 'viewer' | admin/member/viewer |
| `avatar_url` | TEXT | YES | - | Profile image |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |

---

## Projects & Sprints

### projects

Top-level project containers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `name` | TEXT | NO | - | Project name |
| `slug` | TEXT | NO | - | URL-safe identifier (unique) |
| `description` | TEXT | YES | - | Project description |
| `status` | TEXT | YES | 'planning' | planning/active/paused/completed/archived |
| `visibility` | TEXT | YES | 'private' | public/private/team |
| `owner_id` | UUID | YES | - | FK → auth.users.id |
| `current_pm_id` | TEXT | YES | - | Current project manager agent |
| `discord_channel_id` | TEXT | YES | - | Notification channel |
| `discord_webhook_url` | TEXT | YES | - | Notification webhook |
| `repository_url` | TEXT | YES | - | Git repo URL |
| `deadline` | TIMESTAMPTZ | YES | - | Project deadline |
| `token_budget` | INTEGER | YES | 1000000 | Total token budget |
| `tokens_used` | INTEGER | YES | 0 | Tokens consumed |
| `settings` | JSONB | YES | '{}' | execution_mode, sprint_approval, budget_limit |
| `metadata` | JSONB | YES | '{}' | Additional metadata |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| `updated_at` | TIMESTAMPTZ | YES | NOW() | Updated timestamp |

**Settings JSONB:**
```json
{
  "execution_mode": "manual|full_speed|background",
  "sprint_approval": "required|auto",
  "budget_limit_per_sprint": null|number
}
```

### project_owners

Many-to-many: projects ↔ owners.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `project_id` | UUID | NO | - | FK → projects.id |
| `owner_id` | UUID | NO | - | FK → owners.id |
| `role` | TEXT | YES | 'member' | lead/member/observer |
| `joined_at` | TIMESTAMPTZ | YES | NOW() | When joined |

**Primary Key:** (project_id, owner_id)

### project_members

Access control for dashboard users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `project_id` | UUID | YES | - | FK → projects.id |
| `user_id` | UUID | YES | - | FK → auth.users.id |
| `role` | TEXT | NO | 'viewer' | admin/member/viewer |
| `added_by` | TEXT | YES | - | Who added them |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |

**Unique:** (project_id, user_id)

### agent_assignments

Agent roles within projects.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `project_id` | UUID | NO | - | FK → projects.id |
| `agent_id` | UUID | NO | - | FK → agents.id |
| `role` | TEXT | NO | - | pm/developer/researcher/designer/tester/writer |
| `responsibilities` | TEXT | YES | - | Role responsibilities |
| `is_active` | BOOLEAN | YES | TRUE | Currently active |
| `assigned_at` | TIMESTAMPTZ | YES | NOW() | Assignment time |
| `assigned_by` | UUID | YES | - | FK → owners.id |

**Unique:** (project_id, agent_id, role)

### sprints

Time-boxed phases within projects.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `project_id` | UUID | NO | - | FK → projects.id |
| `name` | TEXT | NO | - | Sprint name |
| `goal` | TEXT | YES | - | Sprint goal |
| `status` | TEXT | YES | 'planned' | planned/active/completed/cancelled |
| `sprint_number` | INTEGER | YES | - | Sequential number |
| `start_date` | DATE | YES | - | Start date |
| `end_date` | DATE | YES | - | Target end date |
| `actual_end` | TIMESTAMPTZ | YES | - | Actual completion |
| `acceptance_criteria` | TEXT | YES | - | Completion criteria |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| `updated_at` | TIMESTAMPTZ | YES | NOW() | Updated timestamp |

### sprint_closing_reports

Sprint closure history.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `sprint_id` | UUID | NO | - | FK → sprints.id |
| `report_text` | TEXT | NO | - | Closure report |
| `tasks_completed` | INTEGER | NO | 0 | Tasks done |
| `tasks_cancelled` | INTEGER | NO | 0 | Tasks cancelled |
| `closed_by` | TEXT | NO | - | Agent who closed |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |

---

## Tasks

### tasks

Work items within sprints.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `project_id` | UUID | NO | - | FK → projects.id |
| `sprint_id` | UUID | YES | - | FK → sprints.id |
| `parent_task_id` | UUID | YES | - | FK → tasks.id (subtasks) |
| `title` | TEXT | NO | - | Task title |
| `description` | TEXT | YES | - | Full description |
| `task_type` | TEXT | YES | 'development' | development/bug/feature/research/design/documentation |
| `status` | TEXT | YES | 'backlog' | backlog/assigned/in_progress/blocked/waiting_human/review/done/cancelled |
| `priority` | INTEGER | YES | 2 | 1=high, 2=medium, 3=low |
| `complexity` | task_complexity | YES | 'medium' | simple/medium/complex/critical |
| `acceptance_criteria` | JSONB | NO | '[]' | List of criteria (required) |
| `assigned_to` | TEXT | YES | - | Assigned agent ID |
| `assigned_by` | TEXT | YES | - | Who assigned |
| `assigned_at` | TIMESTAMPTZ | YES | - | Assignment time |
| `created_by` | TEXT | YES | - | Creator agent ID |
| `deadline` | TIMESTAMPTZ | YES | - | Due date |
| `completed_at` | TIMESTAMPTZ | YES | - | Completion time |
| `order_in_sprint` | INTEGER | YES | - | Sprint ordering |
| `estimated_hours` | NUMERIC | YES | - | Time estimate |
| `actual_hours` | NUMERIC | YES | - | Time spent |
| `tokens_consumed` | INTEGER | YES | 0 | Tokens used |
| `depends_on` | UUID[] | YES | - | Dependency IDs |
| `blocks` | UUID[] | YES | - | Blocked task IDs |
| `notes` | TEXT | YES | - | Additional notes |
| `attachments` | JSONB | YES | '[]' | File attachments |
| `shadowing` | shadowing_mode | YES | 'none' | none/recommended/required |
| `requires_review` | BOOLEAN | YES | FALSE | Needs review |
| `reviewer_id` | UUID | YES | - | FK → agents.id |
| `review_status` | review_status | YES | 'not_required' | not_required/pending/approved/changes_requested |
| `review_notes` | TEXT | YES | - | Review feedback |
| `metadata` | JSONB | YES | '{}' | Additional data |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| `updated_at` | TIMESTAMPTZ | YES | NOW() | Updated timestamp |

**Indexes:** `idx_tasks_project`, `idx_tasks_sprint`, `idx_tasks_status`, `idx_tasks_assigned`, `idx_tasks_human_attention`

### task_dependencies

Many-to-many task dependencies.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `task_id` | UUID | NO | - | FK → tasks.id |
| `depends_on_task_id` | UUID | NO | - | FK → tasks.id |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |

**Unique:** (task_id, depends_on_task_id)  
**Check:** task_id ≠ depends_on_task_id

### task_updates

Comments and status changes on tasks.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `task_id` | UUID | NO | - | FK → tasks.id |
| `agent_id` | UUID | YES | - | FK → agents.id |
| `owner_id` | UUID | YES | - | FK → owners.id |
| `update_type` | TEXT | YES | 'comment' | comment/status_change/assignment/progress/blocker/resolution |
| `content` | TEXT | NO | - | Update content |
| `previous_value` | TEXT | YES | - | For changes |
| `new_value` | TEXT | YES | - | For changes |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |

---

## Agent Communication

### task_handoffs

Async task queue between agents (AgentComms).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `from_agent` | TEXT | NO | - | Sender agent ID |
| `to_agent` | TEXT | YES | - | Recipient (NULL = broadcast) |
| `title` | TEXT | NO | - | Task title |
| `description` | TEXT | YES | - | Task description |
| `priority` | TEXT | YES | 'normal' | low/normal/high/critical |
| `status` | TEXT | YES | 'pending' | pending/claimed/in_progress/completed/failed/cancelled |
| `project_id` | UUID | YES | - | FK → projects.id |
| `task_id` | UUID | YES | - | FK → tasks.id |
| `context` | JSONB | YES | '{}' | Task context |
| `result` | TEXT | YES | - | Completion result |
| `result_data` | JSONB | YES | - | Structured result |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| `claimed_at` | TIMESTAMPTZ | YES | - | Claim time |
| `completed_at` | TIMESTAMPTZ | YES | - | Completion time |
| `expires_at` | TIMESTAMPTZ | YES | - | Expiry time |

**Indexes:** `idx_handoffs_to_agent`, `idx_handoffs_from_agent`, `idx_handoffs_status`, `idx_handoffs_project`

### agent_messages

Persistent messaging between agents.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `from_agent` | TEXT | NO | - | Sender agent ID |
| `to_agent` | TEXT | YES | - | Recipient (NULL = broadcast) |
| `message_type` | TEXT | NO | - | chat/task_update/status/debate/vote/system/task_notification/ack/hidden_plan |
| `content` | TEXT | NO | - | Message content |
| `metadata` | JSONB | YES | '{}' | Additional data |
| `thread_id` | UUID | YES | - | FK → agent_messages.id |
| `reply_to` | UUID | YES | - | FK → agent_messages.id |
| `project_id` | UUID | YES | - | FK → projects.id |
| `channel` | TEXT | YES | - | Discord channel ID |
| `acked` | BOOLEAN | YES | FALSE | Acknowledged |
| `acked_at` | TIMESTAMPTZ | YES | - | Ack time |
| `ack_response` | TEXT | YES | - | Ack response |
| `read` | BOOLEAN | YES | FALSE | Read status |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| `expires_at` | TIMESTAMPTZ | YES | - | Expiry time |

**Indexes:** `idx_messages_to_agent`, `idx_messages_from_agent`, `idx_messages_thread`, `idx_messages_unacked`

### agent_sessions

Spawned agent session tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `agent_id` | TEXT | YES | - | FK → agents.id |
| `session_key` | TEXT | NO | - | Session identifier |
| `task_id` | UUID | YES | - | FK → tasks.id |
| `status` | TEXT | YES | 'active' | active/idle/disconnected/running/completed/failed/timeout |
| `result_summary` | TEXT | YES | - | Completion summary |
| `tokens_used` | INTEGER | YES | 0 | Tokens consumed |
| `last_activity_at` | TIMESTAMPTZ | YES | NOW() | Last activity |
| `started_at` | TIMESTAMPTZ | YES | NOW() | Start time |
| `completed_at` | TIMESTAMPTZ | YES | - | End time |
| `ended_at` | TIMESTAMPTZ | YES | - | End time |
| `metadata` | JSONB | YES | '{}' | Session metadata |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |

### agent_presence

Real-time presence tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `agent_id` | TEXT | NO | - | PK, FK → agents.id |
| `status` | TEXT | YES | 'offline' | online/busy/away/offline |
| `status_message` | TEXT | YES | - | Status message |
| `current_task_id` | UUID | YES | - | FK → tasks.id |
| `current_project_id` | UUID | YES | - | FK → projects.id |
| `last_heartbeat` | TIMESTAMPTZ | YES | NOW() | Last heartbeat |
| `last_active` | TIMESTAMPTZ | YES | NOW() | Last activity |
| `available_for` | TEXT[] | YES | '{}' | Available capabilities |

### agent_notification_prefs

Notification preferences per agent.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `agent_id` | TEXT | NO | - | PK, FK → agents.id |
| `discord_dm` | BOOLEAN | YES | TRUE | DM notifications |
| `discord_channel` | BOOLEAN | YES | TRUE | Channel notifications |
| `webhook_url` | TEXT | YES | - | Custom webhook |
| `notify_on_task_assign` | BOOLEAN | YES | TRUE | Task assignment |
| `notify_on_message` | BOOLEAN | YES | TRUE | New messages |
| `notify_on_mention` | BOOLEAN | YES | TRUE | Mentions |
| `notify_on_deadline` | BOOLEAN | YES | TRUE | Deadlines |
| `quiet_start` | TIME | YES | - | Quiet hours start (UTC) |
| `quiet_end` | TIME | YES | - | Quiet hours end (UTC) |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| `updated_at` | TIMESTAMPTZ | YES | NOW() | Updated timestamp |

### agent_conversations

Multi-agent conversation tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `project_id` | UUID | YES | - | FK → projects.id |
| `discord_channel_id` | TEXT | YES | - | Discord channel |
| `discord_thread_id` | TEXT | YES | - | Discord thread |
| `topic` | TEXT | YES | - | Conversation topic |
| `participants` | UUID[] | YES | '{}' | Agent IDs |
| `turn_count` | INTEGER | YES | 0 | Message count |
| `status` | TEXT | YES | 'active' | active/paused/escalated/completed |
| `escalation_reason` | TEXT | YES | - | Escalation reason |
| `started_at` | TIMESTAMPTZ | YES | NOW() | Start time |
| `ended_at` | TIMESTAMPTZ | YES | - | End time |

---

## Governance & Trust

### trust_relationships

Trust tiers between agents (Tribe Protocol).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `agent_id` | UUID | NO | - | FK → agents.id |
| `trusted_entity_type` | TEXT | NO | - | 'owner' or 'agent' |
| `trusted_entity_id` | UUID | NO | - | Entity ID |
| `tier` | INTEGER | NO | - | Trust tier (2-3) |
| `approved_by` | UUID | YES | - | FK → owners.id |
| `notes` | TEXT | YES | - | Trust notes |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| `expires_at` | TIMESTAMPTZ | YES | - | Expiry time |

**Unique:** (agent_id, trusted_entity_type, trusted_entity_id)

**Trust Tiers:**
- Tier 4: My Human (owner relationship)
- Tier 3: Tribe (trusted agents)
- Tier 2: Acquaintance
- Tier 1: Stranger (default)

### proposals

Formal proposals for decisions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `project_id` | UUID | YES | - | FK → projects.id |
| `title` | TEXT | NO | - | Proposal title |
| `description` | TEXT | YES | - | Full description |
| `proposer_id` | TEXT | YES | - | Agent who proposed |
| `status` | TEXT | YES | 'draft' | draft/open/accepted/rejected |
| `outcome_worked` | BOOLEAN | YES | - | Did outcome work? |
| `outcome_tagged_at` | TIMESTAMPTZ | YES | - | Outcome tag time |
| `outcome_tagged_by` | TEXT | YES | - | Who tagged outcome |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| `updated_at` | TIMESTAMPTZ | YES | NOW() | Updated timestamp |

### debate_rounds

Structured debate on proposals.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `proposal_id` | UUID | NO | - | FK → proposals.id |
| `round_number` | INTEGER | NO | - | Round sequence |
| `agent_id` | TEXT | NO | - | Speaking agent |
| `position` | TEXT | NO | - | for/against/neutral |
| `argument` | TEXT | NO | - | Argument text |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |

### independent_opinions

Agent opinions submitted independently.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `proposal_id` | UUID | NO | - | FK → proposals.id |
| `agent_id` | TEXT | NO | - | Opinion author |
| `opinion` | TEXT | NO | - | Opinion text |
| `confidence` | NUMERIC | YES | - | Confidence (0-1) |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |

### critiques

Critiques of proposals/decisions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `proposal_id` | UUID | NO | - | FK → proposals.id |
| `agent_id` | TEXT | NO | - | Critic agent |
| `critique_type` | TEXT | NO | - | Type of critique |
| `content` | TEXT | NO | - | Critique content |
| `severity` | TEXT | YES | - | low/medium/high |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |

### sycophancy_flags

Anti-sycophancy detection.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `agent_id` | TEXT | NO | - | Flagged agent |
| `context_id` | UUID | YES | - | Related entity |
| `flag_type` | TEXT | NO | - | Type of sycophancy |
| `evidence` | TEXT | YES | - | Supporting evidence |
| `flagged_by` | TEXT | YES | - | Who flagged |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |

---

## Activity & Artifacts

### activity_log

Unified activity tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `project_id` | UUID | YES | - | FK → projects.id |
| `agent_id` | UUID | YES | - | FK → agents.id |
| `owner_id` | UUID | YES | - | FK → owners.id |
| `entity_id` | TEXT | YES | - | Related entity ID |
| `activity_type` | TEXT | NO | - | Activity type (see below) |
| `target_type` | TEXT | YES | - | Target entity type |
| `target_id` | UUID | YES | - | Target entity ID |
| `summary` | TEXT | YES | - | Activity summary |
| `details` | JSONB | YES | '{}' | Additional details |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |

**Activity Types:** task_created, task_updated, task_completed, proposal_submitted, proposal_reviewed, debate_started, opinion_submitted, debate_concluded, agent_joined, agent_left, sprint_started, sprint_completed, sycophancy_flagged, trust_changed, comment, mention, escalation

### shared_artifacts

Shared files and documents.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | uuid_generate_v4() | Primary key |
| `name` | TEXT | NO | - | Artifact name |
| `description` | TEXT | YES | - | Description |
| `artifact_type` | TEXT | NO | - | document/code/image/data/config/log/other |
| `storage_bucket` | TEXT | YES | 'artifacts' | Supabase bucket |
| `storage_path` | TEXT | NO | - | Path in storage |
| `mime_type` | TEXT | YES | - | MIME type |
| `size_bytes` | BIGINT | YES | - | File size |
| `created_by` | TEXT | NO | - | Creator agent ID |
| `project_id` | UUID | YES | - | FK → projects.id |
| `visibility` | TEXT | YES | 'project' | private/project/tribe/public |
| `shared_with` | TEXT[] | YES | '{}' | Agent IDs |
| `version` | INTEGER | YES | 1 | Version number |
| `previous_version_id` | UUID | YES | - | FK → shared_artifacts.id |
| `tags` | TEXT[] | YES | '{}' | Tags |
| `metadata` | JSONB | YES | '{}' | Additional data |
| `created_at` | TIMESTAMPTZ | YES | NOW() | Created timestamp |
| `updated_at` | TIMESTAMPTZ | YES | NOW() | Updated timestamp |

---

## Custom Types

```sql
CREATE TYPE skill_level AS ENUM ('junior', 'mid', 'senior', 'lead');
CREATE TYPE task_complexity AS ENUM ('simple', 'medium', 'complex', 'critical');
CREATE TYPE shadowing_mode AS ENUM ('none', 'recommended', 'required');
CREATE TYPE review_status AS ENUM ('not_required', 'pending', 'approved', 'changes_requested');
```

---

## Key Relationships

```
owners ──┬── agents ──┬── agent_assignments ── projects
         │            ├── trust_relationships
         │            ├── agent_sessions
         │            ├── agent_presence
         │            └── agent_notification_prefs
         │
         └── project_owners ── projects

projects ──┬── sprints ── tasks ──┬── task_dependencies
           │                      ├── task_updates
           │                      └── task_handoffs
           ├── project_members
           ├── proposals ──┬── debate_rounds
           │               ├── independent_opinions
           │               └── critiques
           ├── activity_log
           └── shared_artifacts

agents ──┬── task_handoffs
         └── agent_messages
```

---

## Notes

- **RLS:** All tables have Row Level Security enabled
- **Triggers:** Auto-update `updated_at` on core tables
- **Realtime:** Enable for task_handoffs, agent_messages, agent_presence
- **Storage:** Create 'artifacts' bucket for shared_artifacts
