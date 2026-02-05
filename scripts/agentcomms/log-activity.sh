#!/usr/bin/env bash
# Log activity to activity_log table
# Usage: ./log-activity.sh <action> <entity_type> <entity_id> [details_json]
#
# Actions: task_claimed, task_completed, task_failed, task_delegated, task_created,
#          agent_status_changed, sprint_closed, sprint_opened, etc.
# Entity types: task, task_handoff, agent, sprint, project
#
# Example: ./log-activity.sh task_claimed task_handoff abc-123 '{"from":"backlog"}'

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load-env.sh"
validate_env

ACTION="${1:?Usage: $0 <action> <entity_type> <entity_id> [details_json]}"
ENTITY_TYPE="${2:?Usage: $0 <action> <entity_type> <entity_id> [details_json]}"
ENTITY_ID="${3:?Usage: $0 <action> <entity_type> <entity_id> [details_json]}"
DETAILS="${4:-null}"

AGENT_ID="${AGENT_ID:-unknown}"

# Build JSON payload
JSON_BODY=$(jq -n \
  --arg action "$ACTION" \
  --arg entity_type "$ENTITY_TYPE" \
  --arg entity_id "$ENTITY_ID" \
  --arg agent_id "$AGENT_ID" \
  --argjson details "$DETAILS" \
  '{
    action: $action,
    entity_type: $entity_type,
    entity_id: $entity_id,
    agent_id: $agent_id,
    details: $details
  }')

# Insert into activity_log (silent unless error)
RESULT=$(curl -sS -X POST "${MC_SUPABASE_URL}/rest/v1/activity_log" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "$JSON_BODY" \
  -w "\n%{http_code}" 2>&1)

HTTP_CODE=$(echo "$RESULT" | tail -1)

if [[ "$HTTP_CODE" =~ ^2 ]]; then
  # Success - silent
  :
else
  echo "⚠️  Failed to log activity (HTTP $HTTP_CODE): $ACTION on $ENTITY_TYPE/$ENTITY_ID" >&2
fi
