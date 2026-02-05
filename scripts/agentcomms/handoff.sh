#!/usr/bin/env bash
# Hand off a task to another agent
# Usage: ./handoff.sh <to_agent> <task_description> [priority]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.env" 2>/dev/null || true

TO_AGENT="${1:?Usage: $0 <to_agent> <task> [priority]}"
TASK="${2:?Usage: $0 <to_agent> <task> [priority]}"
PRIORITY="${3:-normal}"

if [[ -z "${MC_SUPABASE_URL:-}" || -z "${MC_SERVICE_KEY:-}" ]]; then
  echo "❌ Missing MC_SUPABASE_URL or MC_SERVICE_KEY in .env"
  exit 1
fi

FROM_AGENT="${AGENT_ID:-unknown}"

RESULT=$(curl -sS -X POST "${MC_SUPABASE_URL}/rest/v1/task_handoffs" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"from_agent\": \"${FROM_AGENT}\",
    \"to_agent\": \"${TO_AGENT}\",
    \"title\": \"${TASK}\",
    \"status\": \"pending\",
    \"priority\": \"${PRIORITY}\"
  }")

TASK_ID=$(echo "$RESULT" | jq -r '.[0].id // .id // "unknown"')
echo "✅ Task handed off: ${TASK_ID}"
echo "$RESULT" | jq .
