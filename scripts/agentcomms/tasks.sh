#!/usr/bin/env bash
# List tasks assigned to me or all pending
# Usage: ./tasks.sh [--all|--pending|--mine]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.env" 2>/dev/null || true

FILTER="${1:---mine}"
AGENT_ID="${AGENT_ID:-unknown}"

if [[ -z "${MC_SUPABASE_URL:-}" || -z "${MC_SERVICE_KEY:-}" ]]; then
  echo "❌ Missing MC_SUPABASE_URL or MC_SERVICE_KEY in .env"
  exit 1
fi

case "$FILTER" in
  --all)
    QUERY="order=created_at.desc&limit=20"
    echo "📋 All recent tasks:"
    ;;
  --pending)
    QUERY="status=eq.pending&order=created_at.desc"
    echo "📋 Pending tasks (unclaimed):"
    ;;
  --mine|*)
    QUERY="to_agent=eq.${AGENT_ID}&status=neq.completed&order=created_at.desc"
    echo "📋 Tasks for ${AGENT_ID}:"
    ;;
esac

echo ""
curl -sS "${MC_SUPABASE_URL}/rest/v1/task_handoffs?${QUERY}" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" | jq -r '.[] | "[\(.status)] \(.id[:8])... | \(.title // .task // "no title") | from: \(.from_agent)"'
