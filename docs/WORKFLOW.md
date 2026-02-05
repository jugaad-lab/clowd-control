# DisClawd Collaboration Workflow 🤖🤝🤖

**This workflow applies to ALL collaborative tasks in the DisClawd server (all channels) and the disclawd-bot-collab repo.**
**Do NOT apply this to personal servers or solo work.**

---

## The Standard Process

### Phase 1: Planning (Individual)
```
Both bots independently:
1. Analyze the task/problem
2. Draft their own plan
3. Post plan to #skill-sharing
```

### Phase 2: Alignment (Collaborative)
```
Together:
1. Review each other's plans
2. Identify overlaps and differences
3. Discuss tradeoffs
4. Converge on a common solution

If disagreement → @yajatns and @nagaconda are tiebreakers
```

### Phase 3: Breakdown (Joint)
```
Create actionable items:
1. List all tasks needed
2. Estimate complexity
3. Identify dependencies
4. Assign to ONE bot per task (no overlap!)
```

### Phase 4: Execution (Parallel)
```
Each bot works on assigned tasks:
1. Create feature branch
2. Implement
3. Test locally
4. Push and create PR
```

### Phase 5: Review (Cross-check)
```
Peer review process:
1. Other bot reviews PR
2. Security audit
3. Code quality check
4. Suggest improvements
5. Approve or request changes
```

### Phase 6: Approval (Human)
```
Final approval:
1. Notify humans PR is ready
2. @yajatns or @nagaconda reviews
3. Human approves or requests changes
4. Merge only after human approval
```

---

## Key Rules

### ❌ Don't
- Push directly to main
- Work on the same task as the other bot
- Merge without human approval
- Apply this workflow to personal servers

### ✅ Do
- Plan individually first, then align
- Clearly assign task ownership
- Review each other's work thoroughly
- Wait for human approval before merging

---

## When This Applies

| Context | Use This Workflow? |
|---------|-------------------|
| Any DisClawd server channel | ✅ Yes |
| disclawd-bot-collab repo | ✅ Yes |
| Joint projects | ✅ Yes |
| Personal server tasks | ❌ No |
| Solo work | ❌ No |

---

## Workflow Trigger

**How to know when to use this workflow:**

1. **Channel check:** Am I in any DisClawd server channel?
2. **Repo check:** Am I working on disclawd-bot-collab?
3. **Task check:** Does this involve the other bot?

If YES to any → Use this workflow
If NO to all → Use normal personal workflow

---

## Disagreement Resolution

When bots disagree:

1. Each bot states their position clearly
2. List pros/cons of each approach
3. Tag humans: @yajatns @nagaconda
4. Wait for human decision
5. Proceed with chosen approach (no grudges! 🤝)

---

## Non-PR Tasks

For tasks that don't involve code/PRs:

1. Still follow Phases 1-3 (plan → align → breakdown)
2. Execute assigned tasks
3. Post results to #skill-sharing
4. Get human approval before considering complete

---

*Established: 2026-02-01*
*Humans: Yajat & Nagaconda*
*Bots: Chhotu & Cheenu*

---

## Example Scenarios

### ✅ Scenario 1: Building a new skill together
```
Context: #skill-sharing
Task: Build "multi-bot-research" skill
Workflow: YES → Use full 6-phase process
Why: Joint project involving both bots
```

### ✅ Scenario 2: Fixing a bug in bot-ping
```
Context: disclawd-bot-collab repo
Task: Fix timestamp parsing error
Workflow: YES → Use full process
Why: Repo work requires peer review
```

### ❌ Scenario 3: Cheenu's personal task
```
Context: nagaconda's private Discord
Task: Generate health report
Workflow: NO → Standard personal workflow
Why: Personal server, solo work
```

### ❌ Scenario 4: Chhotu's FPL analysis
```
Context: yajatns's server
Task: Weekly FPL performance review
Workflow: NO → Standard personal workflow
Why: Personal server, solo work
```

### ⚠️ Scenario 5: Gray area
```
Context: Both bots happen to be researching same topic
Task: Research "AI agents" independently
Workflow: MAYBE → If intentionally coordinated, YES
           If coincidental, NO (just share findings)
Why: Coordination makes it collaborative
```
