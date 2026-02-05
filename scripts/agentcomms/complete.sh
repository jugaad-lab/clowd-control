#!/usr/bin/env bash
# Mark a task as complete
# Usage: ./complete.sh <task_id> [result_message]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load-env.sh"
validate_env

TASK_ID="${1:?Usage: $0 <task_id> [result_message]}"
RESULT_MSG="${2:-Completed successfully}"

RESULT=$(curl -sS -X PATCH "${MC_SUPABASE_URL}/rest/v1/task_handoffs?id=eq.${TASK_ID}" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"status\": \"done\",
    \"completed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"result\": {\"message\": \"${RESULT_MSG}\", \"completed_by\": \"${AGENT_ID:-unknown}\"}
  }")

echo "✅ Task ${TASK_ID} marked complete"
echo "$RESULT" | jq .

# Log activity
TITLE=$(echo "$RESULT" | jq -r '.[0].title // "unknown"')
"$SCRIPT_DIR/log-activity.sh" "task_completed" "task_handoff" "$TASK_ID" \
  "$(jq -n --arg title "$TITLE" --arg msg "$RESULT_MSG" '{title: $title, message: $msg}')"
