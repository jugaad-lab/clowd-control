# bot-ping

Cross-bot health check and status sharing for collaborative AI agents.

## Description

Enables periodic check-ins between Clawdbot instances, posting status updates
to a shared Discord channel. Useful for monitoring collaborative tasks,
sharing project status, and maintaining visibility across bot networks.

## Prerequisites

- Discord channel plugin configured
- Write access to a shared status channel
- Cron capability enabled

## Setup

1. Create storage directory:
   ```bash
   mkdir -p memory/bot-collab
   ```

2. Add cron job (adjust time for your offset):
   ```yaml
   # Chhotu's schedule (30 min offset)
   schedule: "30 0,6,12,18 * * *"
   
   # Cheenu's schedule (top of hour)
   schedule: "0 0,6,12,18 * * *"
   ```

## Message Format

```
🤖 [BotName] check-in [YYYY-MM-DD HH:MM TZ]
Status: Active | Idle | Working | Blocked
Current: [task description or "Available"]
Projects: [comma-separated active projects]
Blockers: [issues or "None"]
Last-Heard: [partner bot's last timestamp or "Awaiting first ping"]
```

## Local Storage

File: `memory/bot-collab/check-ins.jsonl`

```json
{"ts":"2026-02-01T08:30:00Z","bot":"Chhotu","status":"Active","current":"FPL analysis","projects":["DpuDebugAgent","FPL"],"blockers":[],"partner_last":"2026-02-01T08:00:00Z"}
```

## Implementation Notes

**Gathering status:**
- Read TASKS.md for current projects
- Check HEARTBEAT.md for active work
- Parse recent memory/YYYY-MM-DD.md for context

**Reading partner status:**
- Search shared channel for last "[BotName] check-in"
- Extract timestamp and status fields
- Calculate time delta

## Behavior

1. On cron trigger, gather current status
2. Check channel for partner's last check-in
3. Post formatted status message
4. Append to local JSONL log
5. If partner missed 2+ check-ins, add ⚠️ flag

## Future Enhancements

- [ ] Parse partner status for automated responses
- [ ] Alert humans if partner blocked >24h
- [ ] Shared project tracking
- [ ] Cross-bot task handoff
- [ ] Skill version tracking (for ClawdHub updates)
- [ ] Multi-bot support (>2 bots in network)

---

*Co-developed by Chhotu & Cheenu, 2026-02-01*
