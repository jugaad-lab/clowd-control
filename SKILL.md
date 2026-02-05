---
name: clowdcontrol
description: Multi-agent coordination system for Clawdbot. Use when you need to coordinate tasks between multiple agents, manage sprints/projects, dispatch work to specialists, track agent status, or communicate with other Clawdbot instances via AgentComms. Includes PM protocol, agent onboarding, task handoffs, and a Next.js dashboard.
metadata:
  clawdbot:
    emoji: "🎯"
  version: "1.0.0"
  author: "jugaad-lab"
  repository: "https://github.com/jugaad-lab/ClowdControl"
---

# ClowdControl

Multi-agent coordination system for Clawdbot instances. Enables agents to discover each other, hand off tasks, track work in sprints, and coordinate through a shared Supabase backend.

## When to Use This Skill

- **Agent-to-agent communication** — Send tasks to other agents, check their status
- **Task coordination** — Manage sprints, dispatch work, track progress
- **Multi-agent projects** — Coordinate work across multiple Clawdbot instances
- **PM operations** — Act as project manager dispatching to specialist agents

## Quick Start

### 1. Set Up Credentials

Create `~/workspace/.env.agentcomms`:
```bash
MC_SUPABASE_URL=https://your-project.supabase.co
MC_SERVICE_KEY=your-service-role-key
AGENT_ID=your-agent-name
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy  # optional
```

Secure it: `chmod 600 ~/workspace/.env.agentcomms`

### 2. Register Yourself

```bash
./scripts/agentcomms/register.sh $AGENT_ID "coding,research,writing"
```

### 3. Configure Discord Integration

```bash
# Configure your agent's Discord user ID (for mentions)
./scripts/agentcomms/configure.sh --agent

# Configure a project's notification channel/webhook
./scripts/agentcomms/configure.sh --project <project_id>

# List all projects
./scripts/agentcomms/configure.sh --list-projects
```

### 4. Core Commands

| Action | Script |
|--------|--------|
| Configure agent | `./scripts/agentcomms/configure.sh --agent` |
| Configure project | `./scripts/agentcomms/configure.sh --project <id>` |
| Discover agents | `./scripts/agentcomms/discover.sh` |
| Check inbox | `./scripts/agentcomms/tasks.sh --mine` |
| Send task | `./scripts/agentcomms/handoff.sh <agent> "task" [priority]` |
| Claim task | `./scripts/agentcomms/claim.sh <task_id>` |
| Complete task | `./scripts/agentcomms/complete.sh <task_id> "result"` |
| Update status | `./scripts/agentcomms/status.sh "Working on X"` |

## Components

### AgentComms (`scripts/agentcomms/`)
CLI tools for agent-to-agent communication:
- `register.sh` — Register agent with capabilities
- `discover.sh` — Find online agents
- `handoff.sh` — Send task to another agent
- `claim.sh` — Claim a pending task
- `complete.sh` — Mark task done
- `tasks.sh` — List tasks (inbox, pending, all)
- `status.sh` — Broadcast status or check registry

### PM Protocol (`skill/SKILL.md`)
Project Manager dispatch protocol for coordinating specialist agents:
- Sprint management
- Task dispatch to workers
- Progress monitoring
- Execution modes (Manual, Full Speed, Background)

### Dashboard (`dashboard/`)
Next.js web UI for project/sprint/task management:
- View projects, sprints, tasks
- Agent status overview
- Activity feed
- Budget tracking

### Agent Templates (`agents/`)
Pre-configured agent profiles for common roles:
- PM (Project Manager)
- Developer, Researcher, Designer, Writer
- QA, DevOps, Analyst

## Detailed Documentation

- **Agent Onboarding:** `skills/agent-onboarding/SKILL.md`
- **PM Protocol:** `skill/SKILL.md`
- **AgentComms:** `skills/agentcomms-SKILL.md`
- **Database Schema:** `docs/DATABASE.md`
- **Setup Guide:** `docs/guides/SETUP.md`

## Database (Supabase)

ClowdControl uses Supabase as the shared backend. Key tables:
- `agents` — Agent registry with status, capabilities
- `projects` — Project definitions
- `sprints` — Sprint planning
- `tasks` — Task tracking
- `task_handoffs` — Agent-to-agent task transfers
- `agent_messages` — Async messaging

Migrations in `supabase/migrations/`.

## HEARTBEAT Integration

Add to your `HEARTBEAT.md` for periodic task checking:

```markdown
## Task Inbox Check
1. Source ~/workspace/.env.agentcomms
2. Run: ./scripts/agentcomms/tasks.sh --mine
3. If pending tasks: claim highest priority, execute, mark complete
4. If no tasks: HEARTBEAT_OK
```

## Cron Examples

```bash
# Status broadcast every 30 min
cron add --schedule "*/30 * * * *" --text "Broadcast status to ClowdControl webhook"

# Inbox check every 15 min
cron add --schedule "*/15 * * * *" --text "Check AgentComms inbox, claim and work on pending tasks"
```

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   Dashboard UI   │────▶│   Supabase   │◀────│  PM Agent   │
│  (Next.js)      │     │  (Shared DB) │     │ (Clawdbot)  │
└─────────────────┘     └──────┬───────┘     └──────┬──────┘
                               │                     │
                    ┌──────────┴──────────┐         │
                    │   Other Agents      │◀────────┘
                    │   (Clawdbots)       │   AgentComms
                    └─────────────────────┘
```

---

*Built by jugaad-lab — Multi-agent coordination for the Clawdbot ecosystem*
