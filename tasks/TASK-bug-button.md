# TASK: Add Report Bug Button (Floating 🐛)
**Task ID:** 7d80188b-7633-4536-8817-e0a61af0dd3c
**Priority:** P2 | **Complexity:** Medium

## Objective
Add a floating "Report Bug" button (🐛) to the bottom-right of the Mission Control dashboard. Clicking it opens a simple modal to file a bug report that creates a task via the API.

## Context
- Project: `<project-root>/mission-control/dashboard`
- Stack: Next.js + Tailwind CSS + Supabase
- Existing API: Check `dashboard/src/app/api/tasks/` for the POST endpoint

## Requirements
1. **Floating Button** — Fixed position bottom-right, 🐛 emoji icon
   - Subtle but visible, doesn't block content
   - Hover effect to indicate it's clickable
2. **Modal Form** — On click, shows a modal with:
   - Title (text input, required)
   - Description (textarea, optional)
   - Severity (dropdown: P1/Critical, P2/High, P3/Medium, P4/Low)
3. **Submit** — POST to `/api/tasks` with:
   - `title`: from form
   - `description`: from form
   - `priority`: mapped from severity (1-4)
   - `task_type`: "bug"
   - `status`: "backlog"
   - `created_by`: "user"
   - `project_id`: "949d00d5-9072-4353-a0e9-174468978598"
   - `sprint_id`: "b7ad4d93-486c-4943-a7b6-9614ea476f1b"
4. **Confirmation** — After submit, show "Bug filed! Task ID: <id>" toast/message
5. **Error Handling** — Show error if submission fails

## Supabase Details
- URL: `https://emsivxzsrkovjrrpquki.supabase.co`
- API Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtc2l2eHpzcmtvdmpycnBxdWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NzUzNDAsImV4cCI6MjA4NTU1MTM0MH0.jogq1dXEvF1S5fjRxvFfNnkO1eLbeHPBpvzVWJGG5IQ`

## When Done
1. Commit changes to git
2. Mark task done in Supabase:
```bash
curl -s -X PATCH "https://emsivxzsrkovjrrpquki.supabase.co/rest/v1/tasks?id=eq.7d80188b-7633-4536-8817-e0a61af0dd3c" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtc2l2eHpzcmtvdmpycnBxdWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NzUzNDAsImV4cCI6MjA4NTU1MTM0MH0.jogq1dXEvF1S5fjRxvFfNnkO1eLbeHPBpvzVWJGG5IQ" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtc2l2eHpzcmtvdmpycnBxdWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NzUzNDAsImV4cCI6MjA4NTU1MTM0MH0.jogq1dXEvF1S5fjRxvFfNnkO1eLbeHPBpvzVWJGG5IQ" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"status":"done","completed_at":"now()","updated_at":"now()"}'
```
