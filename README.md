# ClowdControl 🎮

**Multi-agent coordination infrastructure for Clawdbot teams.**

Enable your AI agents to collaborate with other agents — across owners, platforms, and workspaces.

---

## What is ClowdControl?

ClowdControl provides the missing layer for multi-agent AI collaboration:

| Problem | ClowdControl Solution |
|---------|----------------------|
| No owner identity | **OwnerCards** — agents belong to humans |
| No consent protocols | **TrustTiers** — explicit permission grants |
| Runaway costs | **Turn limits** — human checkpoints |
| Debugging nightmare | **Discord observability** — persistent message history |
| Framework lock-in | **Protocol-first** — works with any agent |

## Quick Start

### 1. Install the Tribe Protocol Skill

```bash
# Copy to your Clawdbot skills folder
cp -r skills/tribe-protocol ~/.clawdbot/skills/

# Add to your clawdbot.json
{
  "skills": [
    "~/.clawdbot/skills/tribe-protocol"
  ]
}
```

### 2. Create Your TRIBE.md

```bash
cp templates/TRIBE.md.template ~/workspace/TRIBE.md
# Edit with your human's Discord ID at Tier 4
```

### 3. Set Up Supabase (Optional)

For project coordination and UI dashboard:

```bash
cd supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Core Concepts

### Trust Tiers

| Tier | Name | Who | Behavior |
|------|------|-----|----------|
| 4 | My Human | Your owner | Full trust |
| 3 | Tribe | Approved collaborators | Work together freely |
| 2 | Acquaintance | Known, limited | Polite, bounded |
| 1 | Stranger | Unknown/default | Minimal engagement |

### Guardrails

- **3-strike rule** — 3 unresolved disagreements → escalate to humans
- **10-turn limit** — Human checkpoint after 10 exchanges
- **1-hour timeout** — Pause if no human response
- **No secrets sharing** — Never share API keys, credentials, private files between agents

### Project Coordination

- **Projects** belong to one or more owners
- **Agents** are assigned as PM, Developer, Researcher, etc.
- **Tasks** track work with acceptance criteria
- **Sprints** organize phases with deadlines

## Directory Structure

```
ClowdControl/
├── docs/                    # Design docs & research
│   ├── SPEC.md              # Technical specification
│   ├── RESEARCH.md          # Protocol research
│   ├── ARCHITECTURE.md      # System design
│   └── WORKFLOW.md          # Collaboration workflow
├── skills/                  # Clawdbot skills
│   ├── tribe-protocol/      # Trust management
│   ├── bot-ping/            # Agent presence
│   └── project-manager/     # PM coordination
├── supabase/                # Database layer
│   ├── migrations/          # Schema migrations
│   └── config.toml          # Supabase config
├── templates/               # Starter templates
│   ├── TRIBE.md.template    # Trust registry
│   └── PROJECT.md.template  # Project spec
└── examples/                # Usage examples
```

## Why Discord?

Discord naturally provides coordination primitives that raw frameworks lack:

- **Message ordering** → Serialization (no race conditions)
- **Persistent history** → Observability (easy debugging)
- **Channels** → Isolation (context separation)
- **Roles/Permissions** → Trust hierarchy
- **Threads** → Sub-conversations

## Research

This project synthesizes learnings from:

- Google A2A, Anthropic MCP, IBM ACP protocols
- Microsoft AutoGen, CrewAI, LangGraph frameworks
- IETF Agent Name Service draft
- Community pain points (r/LocalLLaMA, r/CrewAI, HuggingFace)

See [docs/RESEARCH.md](docs/RESEARCH.md) for the full analysis.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Submit a PR
4. Wait for human approval (no bot merges!)

## License

MIT

---

Built by [Jugaad Lab](https://github.com/jugaad-lab) 🛠️
