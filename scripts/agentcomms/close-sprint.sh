#!/usr/bin/env bash
# Close a sprint with proper validation and reporting
# Usage: ./close-sprint.sh <sprint_id>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load-env.sh"
validate_env

SPRINT_ID="${1:?Usage: $0 <sprint_id>}"
AGENT_ID="${AGENT_ID:-system}"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Validate sprint exists and get details
echo "🔍 Validating sprint ${SPRINT_ID}..."

SPRINT_DATA=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/sprints?id=eq.${SPRINT_ID}&select=id,name,status,project_id,actual_start,planned_end" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}")

if [[ $(echo "$SPRINT_DATA" | jq length) -eq 0 ]]; then
  echo "❌ Sprint not found: ${SPRINT_ID}"
  exit 1
fi

SPRINT_STATUS=$(echo "$SPRINT_DATA" | jq -r '.[0].status')
SPRINT_NAME=$(echo "$SPRINT_DATA" | jq -r '.[0].name')
PROJECT_ID=$(echo "$SPRINT_DATA" | jq -r '.[0].project_id')
START_DATE=$(echo "$SPRINT_DATA" | jq -r '.[0].actual_start // "N/A"')
END_DATE=$(echo "$SPRINT_DATA" | jq -r '.[0].planned_end // "N/A"')

echo "📋 Sprint: ${SPRINT_NAME}"
echo "   Status: ${SPRINT_STATUS}"
echo "   Dates: ${START_DATE} to ${END_DATE}"

# Pre-flight check: sprint must be active or review
if [[ "$SPRINT_STATUS" != "active" && "$SPRINT_STATUS" != "review" ]]; then
  echo "❌ Cannot close sprint: status is '${SPRINT_STATUS}'"
  echo "   Sprint must be 'active' or 'review' to close"
  exit 1
fi

# Pre-flight check: all tasks must be done or cancelled
echo ""
echo "🔍 Checking task completion..."

TASKS_DATA=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tasks?sprint_id=eq.${SPRINT_ID}&select=id,title,status,assigned_to" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}")

TOTAL_TASKS=$(echo "$TASKS_DATA" | jq length)
echo "   Found ${TOTAL_TASKS} tasks in sprint"

if [[ $TOTAL_TASKS -eq 0 ]]; then
  echo "⚠️  Sprint has no tasks - proceeding anyway"
fi

# Count tasks by status
INCOMPLETE_TASKS=$(echo "$TASKS_DATA" | jq '[.[] | select(.status != "done" and .status != "cancelled")] | length')
DONE_TASKS=$(echo "$TASKS_DATA" | jq '[.[] | select(.status == "done")] | length')
CANCELLED_TASKS=$(echo "$TASKS_DATA" | jq '[.[] | select(.status == "cancelled")] | length')

echo "   ✅ Done: ${DONE_TASKS}"
echo "   ❌ Cancelled: ${CANCELLED_TASKS}"
echo "   🔄 Incomplete: ${INCOMPLETE_TASKS}"

if [[ $INCOMPLETE_TASKS -gt 0 ]]; then
  echo ""
  echo "❌ Cannot close sprint: ${INCOMPLETE_TASKS} task(s) still incomplete"
  echo ""
  echo "Incomplete tasks:"
  echo "$TASKS_DATA" | jq -r '.[] | select(.status != "done" and .status != "cancelled") | "- \(.title) (\(.status))"'
  echo ""
  echo "Resolve these tasks before closing the sprint."
  exit 1
fi

echo "✅ Pre-flight checks passed"

# Generate closing report
echo ""
echo "📝 Generating closing report..."

REPORT_HEADER="# Sprint Closing Report: ${SPRINT_NAME}

**Sprint ID:** ${SPRINT_ID}
**Dates:** ${START_DATE} to ${END_DATE}
**Closed by:** ${AGENT_ID}
**Closed at:** ${NOW}

## Summary Statistics
- **Total tasks:** ${TOTAL_TASKS}
- **Completed:** ${DONE_TASKS}
- **Cancelled:** ${CANCELLED_TASKS}

## Task Details"

COMPLETED_TASKS_SECTION=""
CANCELLED_TASKS_SECTION=""

if [[ $DONE_TASKS -gt 0 ]]; then
  COMPLETED_TASKS_SECTION="

### ✅ Completed Tasks"
  while IFS= read -r task; do
    TITLE=$(echo "$task" | jq -r '.title')
    ASSIGNED=$(echo "$task" | jq -r '.assigned_to // "unassigned"')
    COMPLETED_TASKS_SECTION="${COMPLETED_TASKS_SECTION}
- ${TITLE} (assigned: ${ASSIGNED})"
  done < <(echo "$TASKS_DATA" | jq -c '.[] | select(.status == "done")')
fi

if [[ $CANCELLED_TASKS -gt 0 ]]; then
  CANCELLED_TASKS_SECTION="

### ❌ Cancelled Tasks"
  while IFS= read -r task; do
    TITLE=$(echo "$task" | jq -r '.title')
    CANCELLED_TASKS_SECTION="${CANCELLED_TASKS_SECTION}
- ${TITLE}"
  done < <(echo "$TASKS_DATA" | jq -c '.[] | select(.status == "cancelled")')
fi

LESSONS_SECTION="

## Lessons Learned
<!-- PM to fill in retrospective notes -->

## Notes
Sprint closed automatically via close-sprint.sh script."

FULL_REPORT="${REPORT_HEADER}${COMPLETED_TASKS_SECTION}${CANCELLED_TASKS_SECTION}${LESSONS_SECTION}"

# Save report to database
echo "💾 Saving report to database..."

REPORT_JSON=$(jq -n \
  --arg sprint_id "$SPRINT_ID" \
  --arg report_text "$FULL_REPORT" \
  --arg closed_by "$AGENT_ID" \
  --argjson tasks_completed "$DONE_TASKS" \
  --argjson tasks_cancelled "$CANCELLED_TASKS" \
  '{
    sprint_id: $sprint_id,
    report_text: $report_text,
    tasks_completed: $tasks_completed,
    tasks_cancelled: $tasks_cancelled,
    closed_by: $closed_by
  }')

REPORT_RESULT=$(curl -sS -X POST "${MC_SUPABASE_URL}/rest/v1/sprint_closing_reports" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "$REPORT_JSON")

REPORT_ID=$(echo "$REPORT_RESULT" | jq -r '.[0].id // .id // "unknown"')
echo "   Report saved with ID: ${REPORT_ID}"

# Update sprint status to completed and set actual_end
echo "🏁 Marking sprint as completed..."

SPRINT_UPDATE=$(curl -sS -X PATCH "${MC_SUPABASE_URL}/rest/v1/sprints?id=eq.${SPRINT_ID}" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"status\": \"completed\",
    \"actual_end\": \"${NOW}\"
  }")

echo "   Sprint status updated to 'completed'"

# Log activity
"$SCRIPT_DIR/log-activity.sh" "sprint_closed" "sprint" "$SPRINT_ID" \
  "$(jq -n --arg name "$SPRINT_NAME" --argjson done "$DONE_TASKS" --argjson cancelled "$CANCELLED_TASKS" \
    '{name: $name, tasks_completed: $done, tasks_cancelled: $cancelled}')"

# Send Discord notification if webhook configured
if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
  echo "📢 Sending Discord notification..."
  
  NOTIFICATION_TEXT="🏁 **Sprint Closed: ${SPRINT_NAME}**

✅ **${DONE_TASKS}** tasks completed
❌ **${CANCELLED_TASKS}** tasks cancelled

Sprint ran from ${START_DATE} to ${END_DATE}
Closed by: ${AGENT_ID}"

  DISCORD_PAYLOAD=$(jq -n \
    --arg content "$NOTIFICATION_TEXT" \
    '{content: $content}')

  curl -sS -X POST "${DISCORD_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "$DISCORD_PAYLOAD" \
    > /dev/null

  echo "   Discord notification sent"
else
  echo "📢 Discord webhook not configured (set DISCORD_WEBHOOK_URL to enable notifications)"
fi

echo ""
echo "🎉 Sprint '${SPRINT_NAME}' successfully closed!"
echo "   Report ID: ${REPORT_ID}"
echo "   Total tasks completed: ${DONE_TASKS}"

if [[ $CANCELLED_TASKS -gt 0 ]]; then
  echo "   Tasks cancelled: ${CANCELLED_TASKS}"
fi