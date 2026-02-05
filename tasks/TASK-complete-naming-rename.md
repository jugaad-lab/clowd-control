# TASK: Complete Avengers-to-Role-Based Naming for All Remaining Agents

## Task ID
`11f0eec0-0bc0-467e-9e07-9671a8cd5a4b`

## Agent
- **Target:** worker-dev
- **Model:** anthropic/claude-sonnet-4-5-20250514

## Context
Sprint 10 had a task to rename all Avengers-themed workers to role-based names. Only 4 were done:
- `friday-dev` → `worker-dev` ✅
- `wong` → `worker-research` ✅  
- `hawkeye` → `worker-qa` ✅
- `wanda` → `worker-design` ✅

The remaining 7 specialist agents were missed entirely.

## Objective
Rename ALL remaining Avengers-named agents to role-based identities across Supabase, code, and docs.

## Rename Mapping

| Old ID | Old Display Name | New ID | New Display Name | Role |
|--------|-----------------|--------|-----------------|------|
| `fury` | Fury | `worker-research-lead` | Research Lead | Customer Researcher |
| `shuri` | Shuri | `worker-analyst` | Product Analyst | Product Analyst |
| `antman` | Ant-Man | `worker-ui-qa` | UI QA Engineer | UI QA Engineer |
| `loki` | Loki | `worker-content` | Content Writer | Content Writer |
| `vision` | Vision | `worker-seo` | SEO Analyst | SEO Analyst |
| `quill` | Quill | `worker-social` | Social Media Manager | Social Media Manager |
| `pepper` | Pepper | `worker-email` | Email Marketing | Email Marketing |

## Requirements

### 1. Supabase Agents Table
Update each agent record. Since `id` is the primary key and may not be updatable via PATCH, you may need to:
- INSERT new records with the new IDs (copying all fields from old records)
- Update any `assigned_to` references in the `tasks` table
- Update any `agent_id` references in `activity_log` table  
- DELETE old records

Supabase connection:
```
URL: https://emsivxzsrkovjrrpquki.supabase.co/rest/v1
API Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtc2l2eHpzcmtvdmpycnBxdWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NzUzNDAsImV4cCI6MjA4NTU1MTM0MH0.jogq1dXEvF1S5fjRxvFfNnkO1eLbeHPBpvzVWJGG5IQ
```

### 2. Agent Profile Files
Rename the markdown files in `agents/`:
- `agents/fury.md` → `agents/worker-research-lead.md`
- `agents/shuri.md` → `agents/worker-analyst.md`  
- `agents/ant-man.md` → `agents/worker-ui-qa.md`
- `agents/loki.md` → `agents/worker-content.md`
- `agents/vision.md` → `agents/worker-seo.md`
- `agents/quill.md` → `agents/worker-social.md`
- `agents/pepper.md` → `agents/worker-email.md`

Update the CONTENT of each file too — replace MCU references with the new role-based name.

### 3. agents/README.md
Update the roster table and file tree to reflect new names.

### 4. PM-PROTOCOL.md — Agent Roster Table
Update the "Agent Roster (Current)" table near the bottom with new IDs and display names.

### 5. agents/jarvis-pm.md
Replace all Avengers references (Ant-Man, Hawkeye, etc.) with new worker names.
Also rename this file: `agents/jarvis-pm.md` → `agents/pm-protocol-agent.md` (jarvis is also an Avengers name).

### 6. Dashboard Code
Search `dashboard/src/` for any remaining hardcoded references to old names and update them.

### 7. Skill Files  
Check `skill/` directory for old name references.

## Acceptance Criteria
- [ ] All 7 agents renamed in Supabase `agents` table (new IDs, display names)
- [ ] All `assigned_to` references in `tasks` table updated to new IDs
- [ ] All `agent_id` references in `activity_log` updated to new IDs
- [ ] Old agent records deleted from Supabase
- [ ] Agent profile .md files renamed and content updated
- [ ] agents/README.md updated
- [ ] PM-PROTOCOL.md roster table updated
- [ ] jarvis-pm.md renamed and updated
- [ ] No remaining Avengers names in codebase (grep for: fury, shuri, antman, ant-man, loki, pepper, quill, vision, jarvis, Fury, Shuri, Ant-Man, Loki, Pepper, Quill, Vision, Jarvis)
- [ ] `npm run build` passes in `dashboard/`
- [ ] All changes committed

## Project Location
`<project-root>/mission-control`

## Notes
- Do NOT rename `chhotu` or `cheenu` — those are not Avengers names
- `worker-dev`, `worker-qa`, `worker-research`, `worker-design` are already done — don't touch those
- The old Supabase records may have foreign key constraints — handle carefully
- If you can't delete+recreate due to FK constraints, update in place where possible
