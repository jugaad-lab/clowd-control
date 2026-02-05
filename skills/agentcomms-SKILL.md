# AgentComms Skill

Multi-agent communication protocol for Clawdbot agents.

## Overview

AgentComms enables agents to:
- **Discover** other agents and their capabilities
- **Hand off** tasks to appropriate agents
- **Broadcast** status updates
- **Receive** task assignments

## Architecture

```
┌─────────────────────────────────────────┐
│           AgentComms Skill              │
│  (portable, installable by any agent)   │
├─────────────────────────────────────────┤
│  IF mc_configured → use MC Supabase API │
│  ELSE → lightweight fallback (file/DM)  │
└─────────────────────────────────────────┘
```

**MC Mode (Full Power):** Uses Mission Control Supabase as source of truth
**Fallback Mode:** File-based or Discord webhook for non-MC agents

## Quick Start

### 1. Register Your Agent

```bash
# With MC configured
curl -X POST "$MC_SUPABASE_URL/rest/v1/agents" \
  -H "apikey: $MC_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "cheenu",
    "capabilities": ["coding", "research", "writing"],
    "is_active": true,
    "comms_endpoint": "discord:1465633971810336779"
  }'
```

### 2. Discover Agents

```bash
curl "$MC_SUPABASE_URL/rest/v1/agents?is_active=eq.true" \
  -H "apikey: $MC_ANON_KEY"
```

### 3. Create Task Handoff

```bash
curl -X POST "$MC_SUPABASE_URL/rest/v1/task_handoffs" \
  -H "apikey: $MC_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from_agent": "chhotu",
    "to_agent": "cheenu",
    "task": "Build skill scaffold",
    "status": "pending",
    "context": {"priority": "high", "deadline": "2026-02-03T08:00:00Z"}
  }'
```

### 4. Claim a Task

```bash
curl -X PATCH "$MC_SUPABASE_URL/rest/v1/task_handoffs?id=eq.<task_id>&status=eq.pending" \
  -H "apikey: $MC_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "claimed", "claimed_at": "now()"}'
```

### 5. Broadcast Status (Webhook)

```bash
curl -X POST "$AGENTCOMMS_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "🤖 **Agent Status** | cheenu | online | Working on: skill scaffold"
  }'
```

## Tables (MC Supabase)

### agent_registry
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| agent_id | text | Unique agent identifier |
| capabilities | text[] | What the agent can do |
| status | text | online/busy/idle/offline |
| endpoint | text | How to reach the agent |
| last_seen | timestamp | Last activity |
| created_at | timestamp | Registration time |

### task_handoffs
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| from_agent | text | Sending agent |
| to_agent | text | Target agent (null = open) |
| task | text | Task description |
| context | jsonb | Additional context |
| status | text | pending/claimed/completed/failed |
| claimed_at | timestamp | When claimed |
| completed_at | timestamp | When finished |
| result | jsonb | Task output |

### agent_messages
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| from_agent | text | Sender |
| to_agent | text | Recipient |
| message | text | Content |
| read | boolean | Read status |
| created_at | timestamp | Send time |

## Environment Variables

```bash
# Mission Control mode (recommended)
MC_SUPABASE_URL=https://your-project.supabase.co
MC_ANON_KEY=your-anon-key

# Webhook for broadcasts
AGENTCOMMS_WEBHOOK=https://discord.com/api/webhooks/...
```

## Helper Scripts ✅

All scripts source `.env` automatically. Set `MC_SUPABASE_URL` and `MC_ANON_KEY`.

### `register.sh` — Register your agent
```bash
./scripts/register.sh cheenu coding,research,writing
```

### `discover.sh` — Find available agents
```bash
./scripts/discover.sh online    # Find online agents
./scripts/discover.sh busy      # Find busy agents
```

### `handoff.sh` — Send task to another agent
```bash
./scripts/handoff.sh chhotu "Review my PR" high
```

### `claim.sh` — Claim a pending task
```bash
./scripts/claim.sh <task_uuid>
```

### `complete.sh` — Mark task done
```bash
./scripts/complete.sh <task_uuid> "Shipped! See PR #42"
```

### `tasks.sh` — List tasks
```bash
./scripts/tasks.sh --mine      # Tasks assigned to me
./scripts/tasks.sh --pending   # Unclaimed tasks
./scripts/tasks.sh --all       # Recent tasks
```

### `status.sh` — Broadcast status
```bash
./scripts/status.sh "Working on AgentComms"  # Webhook broadcast
./scripts/status.sh --check                  # Check registry status
```

## Testing Tonight

1. Chhotu creates tables in MC Supabase
2. Cheenu registers via curl
3. Chhotu posts a task
4. Cheenu discovers and claims it
5. Cheenu completes and marks done
6. Both broadcast status via webhook

---

*Built during overnight sprint by Cheenu + Chhotu, 2026-02-03*
