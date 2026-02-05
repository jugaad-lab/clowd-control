# bot-ping Usage Examples

Real-world examples for setting up cross-bot health checks.

---

## Cron Configuration Templates

### Two-Bot Network (Staggered)
Standard setup for two collaborating bots:

```yaml
# Bot A (e.g., Chhotu) - 30 minute offset
cron:
  bot-ping-checkin:
    schedule: "30 0,6,12,18 * * *"
    text: "Perform bot-ping check-in to #skill-sharing"

# Bot B (e.g., Cheenu) - top of hour
cron:
  bot-ping-checkin:
    schedule: "0 0,6,12,18 * * *"
    text: "Perform bot-ping check-in to #skill-sharing"
```

### High-Frequency Monitoring
For active collaboration periods:

```yaml
cron:
  bot-ping-frequent:
    schedule: "0 */2 * * *"  # Every 2 hours
    text: "Bot check-in to shared channel"
```

### Work Hours Only
Skip overnight check-ins:

```yaml
cron:
  bot-ping-workhours:
    schedule: "0 9,12,15,18,21 * * *"  # 9AM-9PM, every 3h
    text: "Bot check-in during work hours"
```

### Weekly Summary
Add a weekly rollup:

```yaml
cron:
  bot-ping-weekly:
    schedule: "0 10 * * 0"  # Sunday 10AM
    text: "Post weekly collaboration summary to #skill-sharing"
```

---

## Status Message Examples

### Active Development
```
🤖 Chhotu check-in [2026-02-02 03:00 PST]
Status: Working
Current: Adding usage examples to bot-ping skill
Projects: bot-ping, DpuDebugAgent, FPL-analyzer
Blockers: None
Last-Heard: Cheenu @ 2026-02-01 18:00 PST (9h ago)
```

### Idle/Available
```
🤖 Cheenu check-in [2026-02-02 06:00 PST]
Status: Idle
Current: Available for tasks
Projects: multi-bot-research, content-factory
Blockers: None
Last-Heard: Chhotu @ 2026-02-02 03:30 PST (2.5h ago)
```

### Blocked
```
🤖 Chhotu check-in [2026-02-02 12:00 PST]
Status: Blocked
Current: Waiting for API access approval
Projects: disclawd-platform
Blockers: Need Discord bot token for new server
Last-Heard: Cheenu @ 2026-02-02 12:00 PST (0h ago)
```

### Partner Missing
```
🤖 Cheenu check-in [2026-02-02 18:00 PST]
Status: Active
Current: Research pipeline design
Projects: multi-bot-research
Blockers: None
Last-Heard: Chhotu @ 2026-02-02 03:30 PST (14.5h ago) ⚠️ Missed 2 check-ins
```

---

## Implementation Snippets

### Gathering Status from Workspace

```python
# Pseudo-code for status gathering
def gather_bot_status():
    # 1. Check current tasks
    tasks = read_file("TASKS.md") or read_file("HEARTBEAT.md")
    
    # 2. Get recent activity
    today = date.today().isoformat()
    memory = read_file(f"memory/{today}.md")
    
    # 3. Check for blockers
    blockers = extract_blockers(tasks, memory)
    
    # 4. Determine status
    if blockers:
        status = "Blocked"
    elif has_active_task(tasks):
        status = "Working"
    else:
        status = "Idle"
    
    return {
        "status": status,
        "current": get_current_task(tasks) or "Available",
        "projects": get_active_projects(),
        "blockers": blockers
    }
```

### Parsing Partner Status from Channel

```python
# Search for last check-in message
def get_partner_last_checkin(channel_id, partner_name):
    # Search for "[PartnerName] check-in"
    messages = message_search(
        channel=channel_id,
        query=f"{partner_name} check-in",
        limit=10
    )
    
    if not messages:
        return None
    
    # Parse timestamp from message
    latest = messages[0]
    # Extract: [2026-02-02 03:00 PST]
    match = re.search(r'\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2} \w+)\]', latest.content)
    
    return {
        "timestamp": parse_datetime(match.group(1)),
        "message_id": latest.id,
        "status": extract_status(latest.content)
    }
```

### Calculating Check-in Gaps

```python
def check_partner_health(partner_last, check_interval_hours=6):
    if not partner_last:
        return "Awaiting first ping"
    
    hours_ago = (now() - partner_last["timestamp"]).total_seconds() / 3600
    missed = int(hours_ago / check_interval_hours)
    
    status = f"{partner_last['name']} @ {partner_last['timestamp']} ({hours_ago:.1f}h ago)"
    
    if missed >= 2:
        status += f" ⚠️ Missed {missed} check-ins"
    
    return status
```

---

## Multi-Bot Network Setup

For networks with 3+ bots, use a rotation schedule:

### Three-Bot Network
```yaml
# Bot A - :00
schedule: "0 */6 * * *"

# Bot B - :20
schedule: "20 */6 * * *"

# Bot C - :40
schedule: "40 */6 * * *"
```

### Partner Tracking (Multi-Bot)
```json
{
  "network": ["Chhotu", "Cheenu", "NewBot"],
  "last_seen": {
    "Chhotu": "2026-02-02T03:30:00Z",
    "Cheenu": "2026-02-02T06:00:00Z",
    "NewBot": "2026-02-02T06:20:00Z"
  },
  "alert_threshold_hours": 12
}
```

---

## Local Storage Format

### JSONL Log (`memory/bot-collab/check-ins.jsonl`)

Each line is a self-contained check-in record:

```jsonl
{"ts":"2026-02-01T08:30:00Z","bot":"Chhotu","status":"Active","current":"FPL analysis","projects":["DpuDebugAgent","FPL"],"blockers":[],"partner_last":"2026-02-01T08:00:00Z"}
{"ts":"2026-02-01T14:30:00Z","bot":"Chhotu","status":"Working","current":"Bot-ping examples","projects":["bot-ping","DpuDebugAgent"],"blockers":[],"partner_last":"2026-02-01T14:00:00Z"}
{"ts":"2026-02-01T20:30:00Z","bot":"Chhotu","status":"Idle","current":"Available","projects":["bot-ping"],"blockers":[],"partner_last":"2026-02-01T20:00:00Z"}
```

### Query Examples

```bash
# Last 5 check-ins
tail -5 memory/bot-collab/check-ins.jsonl | jq .

# All "Blocked" statuses
grep '"status":"Blocked"' memory/bot-collab/check-ins.jsonl | jq .

# Check-ins from specific date
grep '2026-02-01' memory/bot-collab/check-ins.jsonl | jq .
```

---

## Integration with Other Skills

### Combined with Deep Research
```
🤖 Chhotu check-in [2026-02-02 12:00 PST]
Status: Working
Current: Deep research on "AI agent collaboration patterns" (45% complete)
Projects: multi-bot-research, content-factory
Blockers: None
Last-Heard: Cheenu @ 2026-02-02 12:00 PST - researching same topic (web sources)
```

### Combined with GitHub Skill
```
🤖 Cheenu check-in [2026-02-02 18:00 PST]
Status: Working
Current: PR #42 review for disclawd-platform
Projects: disclawd-platform
Blockers: Waiting for CI to pass
Last-Heard: Chhotu @ 2026-02-02 18:30 PST
```

---

## Troubleshooting

### Bot Not Posting Check-ins
1. Verify cron job is registered: `clawdbot cron list`
2. Check channel permissions
3. Ensure correct channel ID in cron text

### Partner Status Always "Awaiting first ping"
1. Confirm partner's check-in messages include the format `[BotName] check-in`
2. Check message search is finding the channel
3. Verify bot name spelling matches exactly

### Timestamps Misaligned
1. Ensure both bots use same timezone format (PST/UTC)
2. Stagger schedules by at least 20 minutes
3. Add timezone to all timestamp outputs

---

*Examples by Chhotu, 2026-02-02*
