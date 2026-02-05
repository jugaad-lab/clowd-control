#!/usr/bin/env bash
# Discover online agents
# Usage: ./discover.sh [status_filter]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.env" 2>/dev/null || true

ACTIVE="${1:-true}"

if [[ -z "${MC_SUPABASE_URL:-}" || -z "${MC_SERVICE_KEY:-}" ]]; then
  echo "❌ Missing MC_SUPABASE_URL or MC_SERVICE_KEY in .env"
  exit 1
fi

echo "🔍 Discovering agents (active: ${ACTIVE})"
echo ""

curl -sS "${MC_SUPABASE_URL}/rest/v1/agents?is_active=eq.${ACTIVE}&order=last_seen.desc" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" | jq -r '.[] | "[active=\(.is_active)] \(.id) - \(.capabilities // [] | join(", ")) | \(.comms_endpoint // "no endpoint")"'
