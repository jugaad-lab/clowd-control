#!/usr/bin/env bash
# Claim a pending task
# Usage: ./claim.sh <task_id>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.env" 2>/dev/null || true

TASK_ID="${1:?Usage: $0 <task_id>}"

if [[ -z "${MC_SUPABASE_URL:-}" || -z "${MC_SERVICE_KEY:-}" ]]; then
  echo "❌ Missing MC_SUPABASE_URL or MC_SERVICE_KEY in .env"
  exit 1
fi

AGENT_ID="${AGENT_ID:-unknown}"

# Claim only if still pending (atomic)
RESULT=$(curl -sS -X PATCH "${MC_SUPABASE_URL}/rest/v1/task_handoffs?id=eq.${TASK_ID}&status=eq.pending" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"status\": \"in_progress\",
    \"claimed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }")

if echo "$RESULT" | jq -e 'length > 0' > /dev/null 2>&1; then
  echo "✅ Task ${TASK_ID} claimed by ${AGENT_ID}"
  echo "$RESULT" | jq .
else
  echo "❌ Failed to claim task (may already be claimed)"
fi
