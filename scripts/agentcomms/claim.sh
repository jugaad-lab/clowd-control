#!/usr/bin/env bash
# Claim a pending task
# Usage: ./claim.sh <task_id>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load-env.sh"
validate_env

TASK_ID="${1:?Usage: $0 <task_id>}"

AGENT_ID="${AGENT_ID:-unknown}"

# Claim only if still pending (atomic)
# Also set to_agent in case this was a broadcast task
RESULT=$(curl -sS -X PATCH "${MC_SUPABASE_URL}/rest/v1/task_handoffs?id=eq.${TASK_ID}&status=eq.pending" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"to_agent\": \"${AGENT_ID}\",
    \"status\": \"in_progress\",
    \"claimed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }")

if echo "$RESULT" | jq -e 'length > 0' > /dev/null 2>&1; then
  echo "✅ Task ${TASK_ID} claimed by ${AGENT_ID}"
  echo "$RESULT" | jq .
  
  # Log activity
  TITLE=$(echo "$RESULT" | jq -r '.[0].title // "unknown"')
  "$SCRIPT_DIR/log-activity.sh" "task_claimed" "task_handoff" "$TASK_ID" \
    "$(jq -n --arg title "$TITLE" '{title: $title}')"
else
  echo "❌ Failed to claim task (may already be claimed)"
fi
