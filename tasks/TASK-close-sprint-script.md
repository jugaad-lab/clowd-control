# Task: Build close-sprint.sh Script

## Task ID
`close-sprint-script-001`

## Sprint
Sprint 11: Tribes & Infrastructure Expansion

## Agent
- **Target:** worker-dev
- **Model:** anthropic/claude-sonnet-4-5

## Objective
Create a `close-sprint.sh` script that enforces the sprint closing protocol. This script must be used instead of manually updating sprint status to 'completed'.

## Context
The PM (Chhotu) violated sprint closing protocol by directly marking Sprint 11 as completed without running QA Evaluation or PM Review gates. We need automation to prevent this.

## Requirements

### 1. Script Location
`scripts/agentcomms/close-sprint.sh`

### 2. Script Behavior
The script should:

1. **Accept sprint ID as argument**
   ```bash
   ./close-sprint.sh <sprint_id>
   ```

2. **Pre-flight checks (BLOCK if any fail):**
   - [ ] Sprint exists and is `active` or `review` status
   - [ ] All tasks in sprint are `done` or `cancelled`
   - [ ] No tasks are `in_progress`, `assigned`, or `backlog`

3. **Generate Sprint Closing Report:**
   - Sprint name and dates
   - List of completed tasks with assignees
   - List of cancelled tasks (if any)
   - Summary statistics (total tasks, completed, cancelled)
   - Lessons learned (placeholder for PM to fill)

4. **Save report to database:**
   - Create `sprint_closing_reports` table if not exists
   - Insert report record linked to sprint

5. **Update sprint status:**
   - Set `status = 'completed'`
   - Set `actual_end = NOW()`

6. **Post notification:**
   - If DISCORD_WEBHOOK_URL is set, post closing summary

### 3. Sprint Closing Reports Table
```sql
CREATE TABLE IF NOT EXISTS sprint_closing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id),
  report_text TEXT NOT NULL,
  tasks_completed INTEGER NOT NULL,
  tasks_cancelled INTEGER NOT NULL,
  closed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Error Handling
- If pre-flight checks fail, print clear error message explaining what's blocking
- Exit with non-zero code on failure
- Never partially complete (all-or-nothing)

### 5. Usage Example
```bash
# Check if sprint can be closed
./close-sprint.sh 13b2b422-7796-4dc6-a346-6d4489b43e1f

# Output on success:
# ✅ Pre-flight checks passed
# 📝 Generating closing report...
# 💾 Report saved to database
# 🏁 Sprint "Tribes & Infrastructure Expansion" marked complete
# 📢 Notification sent to Discord

# Output on failure:
# ❌ Cannot close sprint: 2 tasks still in 'backlog' status
# - Task: "Build feature X" (backlog)
# - Task: "Fix bug Y" (backlog)
# Resolve these tasks before closing.
```

## Acceptance Criteria
- [ ] Script exists at `scripts/agentcomms/close-sprint.sh`
- [ ] Script is executable (`chmod +x`)
- [ ] Pre-flight checks block closure if tasks incomplete
- [ ] Closing report generated with task summary
- [ ] Report saved to `sprint_closing_reports` table
- [ ] Sprint status updated to `completed` only after report saved
- [ ] Discord notification sent (if webhook configured)
- [ ] Script tested against Sprint 11

## Files to Create/Modify
- `scripts/agentcomms/close-sprint.sh` — New script
- `migrations/XXX_sprint_closing_reports.sql` — New migration

## Project Location
`/Users/yajat/workspace/skills/clowdcontrol`

## References
- Existing scripts in `scripts/agentcomms/` for patterns
- `pm-orchestrator.md` for sprint closing checklist
- `.env.agentcomms` for credentials pattern
