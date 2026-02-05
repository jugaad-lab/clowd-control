# Task: Make acceptance_criteria mandatory on task creation

## Task ID
`268a1991-d150-40e2-ae9d-97a1a07c4044`

## Agent
- **Target:** worker-dev-mid
- **Model:** anthropic/claude-sonnet-4-20250514

## Objective
Make `acceptance_criteria` a required field when creating tasks through the API and dashboard UI.

## Project Location
`<project-root>/mission-control/dashboard`

## Requirements
1. **API route** (`src/app/api/tasks/route.ts`): Validate that `acceptance_criteria` is present and non-empty on POST. Return 400 if missing.
2. **Dashboard UI**: If there's a task creation form, make acceptance_criteria a required field with validation.
3. **Supabase**: Add a NOT NULL constraint on the `acceptance_criteria` column if it doesn't already exist (check schema first — may need a default for existing rows).

## Acceptance Criteria
- [ ] POST /api/tasks returns 400 with clear error if acceptance_criteria is missing or empty
- [ ] Existing tasks without acceptance_criteria are not broken (use a default like empty array or "TBD")
- [ ] Dashboard task creation form enforces the field as required
- [ ] Build passes (`npm run build`)

## Files to Modify
- `src/app/api/tasks/route.ts` — Add validation
- Any task creation form components — Add required field
- Possibly a Supabase migration for NOT NULL constraint

## Out of Scope
- Don't change how acceptance_criteria is displayed
- Don't modify existing tasks' criteria content

## Supabase Details
- URL: https://emsivxzsrkovjrrpquki.supabase.co
- Service Key: Check .env for SUPABASE_SERVICE_ROLE_KEY
