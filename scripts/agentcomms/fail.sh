#!/usr/bin/env bash
# Mark a task as failed
# Usage: ./fail.sh <task_id> <error_details>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load-env.sh"
validate_env

TASK_ID="${1:?Usage: $0 <task_id> <error_details>}"
ERROR="${2:?Usage: $0 <task_id> <error_details>}"

AGENT_ID="${AGENT_ID:-unknown}"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Build result JSON with error details
RESULT_JSON=$(jq -n \
  --arg error "$ERROR" \
  --arg failed_by "$AGENT_ID" \
  --arg failed_at "$NOW" \
  '{
    status: "failure",
    error: $error,
    failed_by: $failed_by,
    failed_at: $failed_at
  }')

RESULT=$(curl -sS -X PATCH "${MC_SUPABASE_URL}/rest/v1/task_handoffs?id=eq.${TASK_ID}" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"status\": \"failed\",
    \"completed_at\": \"${NOW}\",
    \"result\": ${RESULT_JSON}
  }")

echo "💥 Task failed: ${TASK_ID}"
echo "   Error: ${ERROR}"
echo "$RESULT" | jq .

# Log activity
TITLE=$(echo "$RESULT" | jq -r '.[0].title // "unknown"')
"$SCRIPT_DIR/log-activity.sh" "task_failed" "task_handoff" "$TASK_ID" \
  "$(jq -n --arg title "$TITLE" --arg error "$ERROR" '{title: $title, error: $error}')"
