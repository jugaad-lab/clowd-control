#!/usr/bin/env bash
# Register agent with Mission Control
# Usage: ./register.sh [agent_id] [capabilities...]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.env" 2>/dev/null || true

AGENT_ID="${1:-${AGENT_ID:-$(hostname)}}"
shift || true
CAPABILITIES="${*:-coding,research,writing}"

if [[ -z "${MC_SUPABASE_URL:-}" || -z "${MC_ANON_KEY:-}" ]]; then
  echo "❌ Missing MC_SUPABASE_URL or MC_ANON_KEY in .env"
  exit 1
fi

# Convert comma-separated to JSON array
CAPS_JSON=$(echo "$CAPABILITIES" | tr ',' '\n' | jq -R . | jq -s .)

curl -sS -X POST "${MC_SUPABASE_URL}/rest/v1/agents" \
  -H "apikey: ${MC_ANON_KEY}" \
  -H "Authorization: Bearer ${MC_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation,resolution=merge-duplicates" \
  -d "{
    \"id\": \"${AGENT_ID}\",
    \"display_name\": \"${DISPLAY_NAME:-${AGENT_ID}}\",
    \"role\": \"${ROLE:-agent}\",
    \"agent_type\": \"${AGENT_TYPE:-specialist}\",
    \"capabilities\": ${CAPS_JSON},
    \"is_active\": true,
    \"comms_endpoint\": \"discord:${DISCORD_USER_ID:-unknown}\",
    \"last_seen\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }" | jq .

echo "✅ Agent '${AGENT_ID}' registered"
