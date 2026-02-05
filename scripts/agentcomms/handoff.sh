#!/usr/bin/env bash
# Hand off a task to another agent
# Usage: ./handoff.sh <to_agent> <task_title> [priority] [description] [payload_json]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load-env.sh"
validate_env

TO_AGENT="${1:?Usage: $0 <to_agent> <task_title> [priority] [description] [payload_json]}"
TASK="${2:?Usage: $0 <to_agent> <task_title> [priority] [description] [payload_json]}"
PRIORITY="${3:-medium}"
DESCRIPTION="${4:-}"
PAYLOAD="${5:-null}"

FROM_AGENT="${AGENT_ID:-unknown}"

# Build JSON payload with jq to handle escaping properly
JSON_BODY=$(jq -n \
  --arg from "$FROM_AGENT" \
  --arg to "$TO_AGENT" \
  --arg title "$TASK" \
  --arg priority "$PRIORITY" \
  --arg desc "$DESCRIPTION" \
  --argjson payload "$PAYLOAD" \
  '{
    from_agent: $from,
    to_agent: $to,
    title: $title,
    status: "pending",
    priority: $priority,
    description: (if $desc == "" then null else $desc end),
    payload: $payload
  }')

RESULT=$(curl -sS -X POST "${MC_SUPABASE_URL}/rest/v1/task_handoffs" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "$JSON_BODY")

TASK_ID=$(echo "$RESULT" | jq -r '.[0].id // .id // "unknown"')
echo "✅ Task handed off to ${TO_AGENT}: ${TASK_ID}"
echo "   Priority: ${PRIORITY}"
echo "$RESULT" | jq .

# Log activity
"$SCRIPT_DIR/log-activity.sh" "task_delegated" "task_handoff" "$TASK_ID" \
  "$(jq -n --arg to "$TO_AGENT" --arg title "$TASK" --arg priority "$PRIORITY" \
    '{to_agent: $to, title: $title, priority: $priority}')"
