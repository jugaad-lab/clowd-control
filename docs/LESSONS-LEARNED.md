# Mission Control — Lessons Learned

**Document Version:** 1.0  
**Date:** February 3, 2026  
**Covers:** Sprint 9 & early Sprint 10 findings  
**Author:** Wong, Documentation Specialist

---

## Overview

This document captures real-world findings from running Mission Control — a multi-agent PM system where Clawdbots coordinate specialized workers through automated task dispatch. These lessons come from actual sprint execution, not theoretical design.

**Key insight:** Multi-agent coordination requires bulletproof monitoring, careful session management, and defensive patterns against silent failures.

---

## 1. Cron Monitoring Pitfalls

### The Silent Drop Bug

**Problem:** Monitoring crons silently fail when using wrong session configuration.

**What happened:**
```json
{
  "sessionTarget": "main",
  "payload": {
    "kind": "systemEvent",
    "text": "Monitor sprint progress..."
  }
}
```

This configuration routes through the heartbeat system. If `HEARTBEAT.md` is empty, the cron fires but **does nothing** — no error logs, no indication of failure. Agents run unsupervised and the PM thinks everything is fine.

**Root cause:** `systemEvent` + `main` session = hits heartbeat path, which returns `HEARTBEAT_OK` without executing the monitoring logic.

**The fix:**
```json
{
  "sessionTarget": "isolated",
  "wakeMode": "next-heartbeat", 
  "payload": {
    "kind": "agentTurn",
    "message": "🔄 Monitor sprint agents: check status, update DB, chain next task",
    "deliver": true,
    "channel": "discord",
    "to": "channel:1467611351751987263"
  }
}
```

**Why this works:**
- `sessionTarget: "isolated"` = fresh session, no heartbeat interference
- `payload.kind: "agentTurn"` = direct agent instruction, not system event
- `deliver: true` = forced output to channel (can't be silently dropped)

### Auto-Disable Trigger Conditions

**When crons get auto-disabled:**
- All monitored tasks reach terminal state (`done`, `cancelled`, `blocked`)
- Sprint completion detected
- Budget limits exceeded
- Manual mode switch (disables processing crons, keeps single-task monitors)

**Best practice:** Always log when auto-disabling and why:
```
"🛑 Auto-disabling sprint3-monitor: all 7 tasks complete, sprint marked done"
```

### Monitoring Scope Patterns

**Single-task monitoring:** Created for Manual mode, one-off Start button presses
- Cron name: `task-monitor-{slug}`
- Monitors: Just that task
- Auto-disable: When task reaches terminal state

**Sprint-level monitoring:** Created for Full Speed and Background modes
- Cron name: `sprint{N}-fullspeed-monitor` or `sprint{N}-background-processor`
- Monitors: All tasks in the sprint
- Auto-disable: When sprint is complete

---

## 2. Claude Code Spawning Issues

### Interactive Mode Hangs

**Problem:** Spawning Claude Code without non-interactive flag opens welcome screen that waits for user input. Agent session hangs indefinitely.

**Wrong way:**
```bash
# This hangs in background
claude "Follow TASK.md and implement the auth system"
```

**Right way:**
```bash
# Always use -p for non-interactive
claude -p "Follow TASK.md" --allowedTools "Bash(*)" "Edit(*)" "Write(*)" "Read(*)"
```

**Why it happens:** Claude Code defaults to interactive mode, showing welcome prompts and asking for confirmation. Background processes can't respond to these prompts.

### Pre-Trust Requirement

**Problem:** First run in a new project shows trust dialog: "This directory contains files. Trust this project?" Automated spawning blocks waiting for user input.

**The fix:** Pre-trust in `~/.claude.json` before spawning:
```python
import json
import os

config_path = os.path.expanduser('~/.claude.json')
config = json.load(open(config_path))

# Pre-trust the project
project_path = '/path/to/project'
if 'projects' not in config:
    config['projects'] = {}
if project_path not in config['projects']:
    config['projects'][project_path] = {}
    
config['projects'][project_path]['hasTrustDialogAccepted'] = True

json.dump(config, open(config_path, 'w'), indent=2)
```

**When to pre-trust:** Every time before spawning Claude Code on a new project directory.

### Session Death with No Artifacts

**Pattern we observed:** Claude Code session starts, runs for 2-3 minutes, then dies silently. No code changes, no error messages, no completion signal.

**Likely causes:**
1. Permission dialogs (GitHub fetch, file access)
2. Bypass mode confirmations 
3. Long command prompts getting mangled by shell
4. Timeout while waiting for user input on interactive prompts

**Recovery pattern:**
- If Claude Code fails 2x on the same task → PM should build it directly
- Don't keep retrying the same broken approach
- Notify user immediately (within 1 minute) of session death
- Include error context: "Session died after 3 min, no artifacts produced"

### The TASK.md Pattern

**Best practice for complex instructions:** Write detailed specs to `TASK.md` instead of command-line arguments.

**Why it works:**
- Avoids shell quoting issues with long prompts
- Provides persistent reference during execution  
- Easier to debug and reproduce
- Handles multi-line requirements cleanly

```markdown
# TASK.md Template

## Objective
Clear, specific goal

## Requirements  
1. Functional requirement
2. Technical constraint
3. Quality standard

## Files to Modify
- `src/auth.ts` — Add JWT validation
- `src/routes.ts` — Protect routes

## Acceptance Criteria
- [ ] User can log in
- [ ] Protected routes reject invalid tokens
- [ ] All tests pass
```

---

## 3. Worker Dispatch Patterns

### What Worked: Round 2 Approach

**Successful pattern from Sprint 9:**

**Development tasks:** TASK.md + `claude -p` with explicit tool allowlist
```bash
cd /project/root
echo "Detailed spec here" > TASK.md  
claude -p "Follow TASK.md" --allowedTools "Bash(*)" "Edit(*)" "Write(*)" "Read(*)"
```

**QA/Documentation tasks:** `sessions_spawn` with isolated sessions
```python
sessions_spawn(
    task="Read /path/to/TASK-qa.md and complete testing",
    label="hawkeye-qa-auth",
    model="claude-sonnet-4"
)
```

**Why this worked:**
- Different invocation methods for different task types
- Clear separation between development (Claude Code) and other work (sub-agents)
- Pre-trusted projects eliminated permission dialogs
- Isolated sessions prevented cross-contamination

### What Failed: Round 1 Silent Deaths

**Sprint 9, Round 1:** Dispatched 3 workers simultaneously — all died silently within 10 minutes.

**What we tried:**
```python
# All used sessions_spawn with main session target
friday_session = sessions_spawn(task="Build auth", label="friday-auth")
hawkeye_session = sessions_spawn(task="Test auth", label="hawkeye-test")  
wong_session = sessions_spawn(task="Document auth", label="wong-docs")
```

**Why they failed:**
1. **No pre-trust setup** for Claude Code portions
2. **Interactive prompts** not handled
3. **No monitoring** for first 15 minutes
4. **Session target conflicts** (all using `main` session context)

**Recovery:** Switched to Round 2 approach with proper pre-trust, monitoring crons, and different methods per task type.

### Parallel vs Sequential Dispatch

**What works well in parallel:**
- Independent tasks (different components)
- Different agent types (dev + QA + docs simultaneously)
- Tasks with clear boundaries

**What needs sequential:**
- Dependent tasks (build → test → deploy)
- Shared file modifications
- Tasks requiring feedback between agents

**Pattern:** Use dependency mapping in Supabase `tasks.depends_on` field to control dispatch order.

---

## 4. Supabase Gotchas

### NOT NULL Constraint Violations

**Issue:** `tasks.created_by` field has NOT NULL constraint. Inserting without this field fails.

**Error:**
```
null value in column "created_by" violates not-null constraint
```

**Fix:** Always include `created_by` when creating tasks:
```python
task_data = {
    "title": "Implement user auth",
    "project_id": project_id,
    "created_by": "chhotu",  # REQUIRED
    "status": "backlog"
}
```

### Foreign Key Dependencies  

**Issue:** `tasks.assigned_to` references `agents.id`. Can't assign to someone not in agents table.

**Common failure:**
```python
# This fails if "admin" isn't in agents table
{"assigned_to": "admin"}
```

**Solutions:**
1. **Add humans as agents:** Insert human participants with `agent_type: "human"`
2. **Use null assignment:** Leave `assigned_to: null` for human tasks
3. **Title prefixing:** Use `[HUMAN] Task title` to indicate human tasks

### POST Response Array Format

**Issue:** Supabase POST with `Prefer: return=representation` returns arrays, not objects.

**Wrong parsing:**
```python
response = supabase.table('tasks').insert(task_data).execute()
task_id = response.data["id"]  # ❌ Fails — data is array
```

**Right parsing:**
```python
response = supabase.table('tasks').insert(task_data).execute() 
task_id = response.data[0]["id"]  # ✅ Works — access first array element
```

**Why:** Supabase always returns arrays for consistency, even for single-row operations.

### completed_at Backfill Requirement

**Issue:** Marking tasks as `done` without setting `completed_at` breaks time-based queries and velocity calculations.

**Incomplete update:**
```sql
UPDATE tasks SET status = 'done' WHERE id = '...';
-- Missing completed_at = breaks metrics
```

**Complete update:**
```sql  
UPDATE tasks SET 
  status = 'done',
  completed_at = NOW()
WHERE id = '...';
```

**Sprint velocity depends on this:** Analytics queries use `completed_at` for burndown charts and velocity tracking.

---

## 5. Execution Mode Design

### Manual vs Full Speed vs Background Tradeoffs

| Mode | Task/Cycle | Monitoring | Human Control | Best For |
|------|------------|------------|---------------|----------|
| **Manual** | 1 | Single-task cron | High | Learning, debugging, risky tasks |
| **Full Speed** | All backlog | 5-min sprint cron | Low | Trusted sprints, urgent delivery |
| **Background** | 1 per 30 min | 30-min processor | Medium | Long-term maintenance, low priority |

### Monitoring Cron Behavior by Mode

**Manual Mode:**
```json
{
  "name": "task-monitor-auth-impl",
  "schedule": {"kind": "cron", "expr": "*/5 * * * *"},
  "payload": {"kind": "agentTurn", "message": "Monitor task {task_id} only"}
}
```

**Full Speed Mode:**
```json
{
  "name": "sprint3-fullspeed-monitor", 
  "schedule": {"kind": "cron", "expr": "*/5 * * * *"},
  "payload": {
    "kind": "agentTurn",
    "message": "Check ALL sprint 3 tasks. If any done → mark in DB, dispatch next backlog task"
  }
}
```

**Background Mode:**
```json
{
  "name": "sprint3-background-processor",
  "schedule": {"kind": "cron", "expr": "*/30 * * * *"},  
  "payload": {
    "kind": "agentTurn",
    "message": "Pick ONE highest-priority backlog task, dispatch, monitor until done"
  }
}
```

### Mode Switch Protocol

**→ Manual Mode:**
- Disable all active processing crons
- Keep single-task monitors for in-progress work
- No new dispatches until explicit Start button

**→ Full Speed Mode:**
- Create 5-min sprint monitor cron immediately
- If backlog exists → start dispatching now (don't wait for first cron)
- Chain through all backlog tasks without pause

**→ Background Mode:**
- Create 30-min processor cron
- First run happens at next cycle (not immediately)
- Process one task per cycle

**Critical:** Mode switches must be atomic — disable old crons before creating new ones.

---

## 6. Multi-Agent Coordination

### Parallel Dispatch Success Pattern

**Sprint 9 Round 2 success:** 3 workers dispatched simultaneously, all completed successfully.

**What made it work:**
- **Proper pre-setup:** Pre-trusted projects, clear task boundaries
- **Different methods:** claude_code for dev, sessions_spawn for QA/docs
- **Independent work:** No shared files or dependencies
- **Active monitoring:** 5-min cron checking all 3 agents

**Dispatch sequence:**
```python
# 1. All task files written
write_task_file("tasks/TASK-auth-impl.md", dev_spec)
write_task_file("tasks/TASK-auth-test.md", qa_spec)  
write_task_file("tasks/TASK-auth-docs.md", doc_spec)

# 2. Pre-trust for Claude Code
update_claude_trust(project_path, trusted=True)

# 3. Parallel spawn (different methods)
friday = claude_code_spawn(project_path, "Follow TASK-auth-impl.md")
hawkeye = sessions_spawn(task="Follow TASK-auth-test.md", label="hawkeye")
wong = sessions_spawn(task="Follow TASK-auth-docs.md", label="wong")

# 4. Monitor all 3
create_monitoring_cron(["friday", "hawkeye", "wong"])
```

### Task Chaining (finish one → auto-start next)

**Full Speed mode behavior:** When monitoring detects task completion, immediately dispatch next backlog task.

**Chaining logic:**
```python
def check_completed_tasks():
    completed = get_tasks_by_status("in_progress", "done")
    for task in completed:
        mark_task_done(task.id)
        
        # Chain next task if Full Speed mode
        if execution_mode == "fullspeed":
            next_task = get_next_backlog_task(task.sprint_id)
            if next_task:
                dispatch_task(next_task)
```

**Dependency handling:** Check `task.depends_on` before dispatching. Only chain if all dependencies are satisfied.

### Sprint Completion Detection

**Triggers for "sprint complete":**
- All backlog tasks reach terminal state (`done`, `cancelled`, `blocked`)
- No more tasks with `status = 'backlog'` in the sprint
- All in-progress tasks finish (none stuck in `assigned` or `in_progress`)

**Completion actions:**
1. Mark sprint status: `completed`
2. Post summary to mission-control channel
3. Disable all monitoring crons for that sprint
4. Calculate sprint metrics (velocity, burndown, time spent)

### Human Tasks in Automated Pipeline

**Pattern:** Automated pipeline hitting human dependencies.

**Example:** Sprint has 8 tasks, 6 automated + 2 human review tasks.

**Solution approaches:**

**Option 1: [HUMAN] prefix**
```
Title: "[HUMAN] Review auth implementation"
assigned_to: null
```

**Option 2: Human agents**
```sql
INSERT INTO agents (id, display_name, agent_type) 
VALUES ('admin', 'Admin', 'human');
```

**Option 3: Blocking dependencies**
```
Task 7 depends_on [task_6_auth_impl]
Task 8 depends_on [task_7_human_review]
```

**Best practice:** Use Option 3 — dependency blocking. Automated tasks complete, human tasks block the chain, sprint completes when all dependencies resolved.

---

## 7. Naming Convention Decision

### The Confusion Around "Sub-Agent"

**Initial naming:**
- Main agent = PM (Chhotu, Cheenu)
- Sub-agent = Temporary worker (Friday, Wong, Hawkeye)

**Why this was confusing:**
1. "Agent" implies persistent identity + memory + autonomy
2. "Sub" implies hierarchy rather than specialization
3. Users expected sub-agents to persist between sessions
4. Unclear relationship to skills vs agents

### Naming Resolution

**Final taxonomy:**

| Term | Definition | Examples | Lifespan |
|------|------------|----------|----------|
| **Agent** | Persistent identity with memory/personality | Chhotu, Cheenu, Yajat | Indefinite |
| **Worker** | Temporary specialist for specific tasks | Friday-dev, Wong-docs | Task duration |
| **Skill** | Reusable capability package | mission-control-pm, claude-code | Versioned |

**Agent = who you are**  
**Worker = what you do**  
**Skill = how you do it**

**In practice:**
- "Spawn a worker to handle this task"
- "Friday is our dev worker"  
- "Worker finished, task complete"
- "Workers use skills to execute tasks"

### Database Schema Alignment

**Before (confusing):**
```sql
-- Mixed concepts
CREATE TABLE agents (id, role, is_pm, is_specialist, ...);
```

**After (clear):**
```sql
-- Agents = persistent identities
CREATE TABLE agents (id, display_name, agent_type);

-- Workers = task specialists  
CREATE TABLE workers (id, role, capabilities, invocation_method);
```

**Migration strategy:** `agent_type` field distinguishes:
- `agent_type: "pm"` = Persistent PM agents
- `agent_type: "specialist"` = Task workers (what we called "sub-agents")
- `agent_type: "human"` = Human participants

---

## 8. Critical Success Patterns

### The Golden Workflow

This is the pattern that **consistently works** from Sprint 9 success:

1. **Clear task boundaries** → Write detailed TASK.md files
2. **Right tool for right job** → claude_code for dev, sessions_spawn for others
3. **Pre-setup everything** → Trust projects, check dependencies
4. **Monitor aggressively** → 5-min crons with forced delivery
5. **Handle failures fast** → 1-min notification, immediate reassignment

### Defensive Patterns

**Never announce without doing:**
```python
# ❌ Wrong
print("🚀 Spawning Claude Code for auth task...")
# [no actual tool call]

# ✅ Right  
session_id = claude_code_spawn(project, task)
print(f"✅ Spawned Claude Code session {session_id}")
```

**Always create monitoring:**
```python
# ❌ Wrong
spawn_worker(task)
# [no monitoring setup]

# ✅ Right
worker_session = spawn_worker(task)
create_monitoring_cron(worker_session, task.id)
```

**Fail fast on session death:**
```python
if worker_status == "dead" and runtime < "5 minutes":
    notify_immediate("🚨 Worker died early - likely config issue")
    reassign_or_escalate(task)
```

### Documentation of Actual vs Theoretical

**Key insight:** The written protocol and actual execution had significant gaps. This document captures what **really** happened vs what we **thought** would happen.

**Theory:** "The PM will monitor agents and chain tasks"  
**Reality:** "Silent cron failures meant tasks ran unsupervised for hours"

**Theory:** "Claude Code will execute tasks smoothly"  
**Reality:** "Interactive prompts blocked 60% of spawns until we added pre-trust"

**Documentation principle:** Always capture the gap between design and implementation.

---

## 9. Setup Friction Points

### First-Time Installation Issues

**Clawdhub skill installation:** Works but requires manual path setup for external users.

**Supabase schema:** Complex setup with foreign keys that fail silently if not set up in correct order.

**Discord webhook:** Requires server admin permissions, not clear from documentation.

**Claude Code integration:** Pre-trust requirement not documented anywhere.

### Multi-User Coordination

**Shared Supabase access:** Need to coordinate anon keys and RLS policies.

**Agent roster conflicts:** Multiple PMs adding agents with same IDs.

**Cron naming collisions:** Two PMs creating crons with same names.

**Resolution:** Namespace everything with PM identity: `chhotu-sprint3-monitor`

---

## 10. Future Improvements

### Based on Real Experience

**Priority 1 (Fix broken patterns):**
- Auto-detect and fix silent cron failures
- Better Claude Code pre-trust automation  
- Improved session death detection and recovery

**Priority 2 (Scaling issues):**
- Agent roster management UI
- Dependency graph visualization  
- Cross-PM coordination protocol

**Priority 3 (Nice to have):**
- Task decomposition for large tasks
- Collaborative task spaces
- Skill sharing between Clawdbots

### Metrics to Track

**What we should have measured from day 1:**
- Worker spawn success rate
- Time from task assignment to completion
- Session death frequency by worker type
- Cron execution success rate
- Human intervention frequency

**Dashboard needed:** Real-time view of all active workers, their status, and last check time.

---

## Conclusion

Mission Control works, but multi-agent coordination is harder than expected. The biggest lesson: **silent failures kill automation**. Every spawn needs monitoring, every cron needs forced delivery, every session death needs immediate notification.

The successful patterns here are battle-tested from actual sprint execution. Use them as starting points for your own Mission Control instance.

---

*This document reflects real experience running Mission Control in Sprint 9 and early Sprint 10. It should be updated as new patterns emerge.*