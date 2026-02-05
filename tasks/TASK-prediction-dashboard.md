# TASK: Prediction Accuracy Dashboard
**Task ID:** e632e3ee-d5c1-46ac-b6b1-88b76d3ac7ad
**Priority:** P2 | **Complexity:** Medium

## Objective
Build a prediction accuracy dashboard component that shows estimated vs actual token usage per task/agent, with a running accuracy percentage to help calibrate future estimates.

## Context
- Project: `<project-root>/mission-control/dashboard`
- Stack: Next.js + Tailwind CSS + Supabase
- The dashboard already exists — you're adding a new view/component
- Tasks table has `tokens_consumed` field and budget predictions are tracked

## Requirements
1. **Chart Component** — Show predicted vs actual token usage per task
   - Bar chart or line chart comparing estimates vs actuals
   - Use a lightweight chart library (recharts is already in package.json if available, otherwise add it)
2. **Accuracy Metric** — Running accuracy percentage (how close predictions are to actuals)
3. **Agent Breakdown** — Show accuracy per agent/worker
4. **Integration** — Add as a tab/section in the existing dashboard

## Supabase Details
- URL: `https://emsivxzsrkovjrrpquki.supabase.co`
- Tasks table has: `tokens_consumed`, `estimated_hours`, `complexity`, `assigned_to`
- Budget predictions may be in a separate table — check schema

## When Done
1. Commit changes to git
2. Mark task done in Supabase:
```bash
curl -s -X PATCH "https://emsivxzsrkovjrrpquki.supabase.co/rest/v1/tasks?id=eq.e632e3ee-d5c1-46ac-b6b1-88b76d3ac7ad" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtc2l2eHpzcmtvdmpycnBxdWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NzUzNDAsImV4cCI6MjA4NTU1MTM0MH0.jogq1dXEvF1S5fjRxvFfNnkO1eLbeHPBpvzVWJGG5IQ" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtc2l2eHpzcmtvdmpycnBxdWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NzUzNDAsImV4cCI6MjA4NTU1MTM0MH0.jogq1dXEvF1S5fjRxvFfNnkO1eLbeHPBpvzVWJGG5IQ" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"status":"done","completed_at":"now()","updated_at":"now()"}'
```
