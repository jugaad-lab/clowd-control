# Task: Clean Up Hardcoded References

## Sprint
Sprint 12: Tribes & Multi-Agent Autonomy

## Agent
- **Target:** worker-dev
- **Model:** anthropic/claude-sonnet-4-5

## Objective
Remove or genericize hardcoded user-specific references throughout the ClowdControl project.

## References to Clean Up

### 1. Instance Names
- `chhotu-mac-mini` → `<your-instance>` or remove
- Should be configurable, not hardcoded

### 2. Usernames
- `@yajat`, `@yajatns` → `<admin>` or `@your-admin`
- `@nag`, `@nagaconda` → `<stakeholder>` or remove

### 3. Paths
- `/Users/yajat/workspace/...` → relative paths or `<project-root>`

### 4. Git URLs
- `git@github.com:yajatns/ClowdControl.git` → `git@github.com:jugaad-lab/clowd-control.git`

### 5. Email References
- `yajatns@gmail.com` → `<admin-email>` or remove

## Files to Check
- `agents/pm-orchestrator.md` — Instance name, stakeholders
- `agents/worker-dev.md` — Project path example
- `docs/internal/*.md` — Old paths
- `docs/guides/*.md` — Setup guides, workflow docs
- `docs/architecture/*.md` — Owner references
- `docs/LESSONS-LEARNED.md` — Code examples

## Rules
1. **Keep examples generic** — Use placeholders like `<your-project>`, `<admin>`
2. **Update git URLs** — Point to `jugaad-lab/clowd-control`
3. **Don't break functionality** — Some paths are in comments/examples, not runtime
4. **Internal docs can be deleted if obsolete** — `docs/internal/` may have old task files

## Acceptance Criteria
- [ ] No references to `yajat-mac-mini` or `chhotu-mac-mini`
- [ ] No hardcoded usernames (`@yajat`, `@nag`, etc.)
- [ ] No hardcoded paths (`/Users/yajat/...`)
- [ ] Git URLs point to `jugaad-lab/clowd-control`
- [ ] Examples use generic placeholders

## Project Location
`/Users/yajat/workspace/skills/clowdcontrol`

## Notes
- Run: `grep -r "yajat\|mac-mini\|chhotu-mac" --include="*.md"` to verify cleanup
- Commit with: "chore: clean up hardcoded user-specific references"
