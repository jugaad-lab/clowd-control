#!/usr/bin/env bash
# List tasks from task_handoffs
# Usage: ./tasks.sh [--mine|--pending|--claimable|--all|--status <status>]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load-env.sh"
validate_env

FILTER="${1:---mine}"
STATUS_FILTER="${2:-}"

case "$FILTER" in
  --all)
    QUERY="order=created_at.desc&limit=30"
    echo "📋 All recent tasks:"
    ;;
  --pending)
    QUERY="status=eq.pending&order=priority.desc,created_at.asc"
    echo "📋 Pending tasks (not yet claimed):"
    ;;
  --claimable)
    # Tasks with no assigned agent (broadcast) that are pending
    QUERY="status=eq.pending&to_agent=is.null&order=priority.desc,created_at.asc"
    echo "📋 Claimable tasks (broadcast, no assignee):"
    ;;
  --in-progress)
    QUERY="status=eq.in_progress&order=created_at.desc"
    echo "📋 In-progress tasks:"
    ;;
  --status)
    if [ -z "$STATUS_FILTER" ]; then
      echo "Usage: $0 --status <pending|claimed|in_progress|completed|rejected|failed>"
      exit 1
    fi
    QUERY="status=eq.${STATUS_FILTER}&order=created_at.desc"
    echo "📋 Tasks with status '${STATUS_FILTER}':"
    ;;
  --mine|*)
    # Tasks assigned to me from BOTH tables
    echo "📋 Tasks for ${AGENT_ID}:"
    
    echo ""
    echo "=== From tasks table (Dashboard) ==="
    curl -sS "${MC_SUPABASE_URL}/rest/v1/tasks?assigned_to=eq.${AGENT_ID}&status=in.(backlog,assigned,in_progress,review,blocked)&order=priority.desc,created_at.asc" \
      -H "apikey: ${MC_SERVICE_KEY}" \
      -H "Authorization: Bearer ${MC_SERVICE_KEY}" | jq -r '.[] | "[\(.status)] \(.id[:8])... | \(.title // "no title")"'
    
    echo ""
    echo "=== From task_handoffs table (AgentComms) ==="
    curl -sS "${MC_SUPABASE_URL}/rest/v1/task_handoffs?to_agent=eq.${AGENT_ID}&status=in.(pending,claimed,in_progress)&order=priority.desc,created_at.asc" \
      -H "apikey: ${MC_SERVICE_KEY}" \
      -H "Authorization: Bearer ${MC_SERVICE_KEY}" | jq -r '.[] | "[\(.status)] \(.id[:8])... | \(.title // "no title") | from: \(.from_agent)"'
    
    echo ""
    echo "=== Claimable (broadcast) ==="
    curl -sS "${MC_SUPABASE_URL}/rest/v1/task_handoffs?to_agent=is.null&status=eq.pending&order=priority.desc,created_at.asc" \
      -H "apikey: ${MC_SERVICE_KEY}" \
      -H "Authorization: Bearer ${MC_SERVICE_KEY}" | jq -r '.[] | "[claimable] \(.id[:8])... | \(.title // "no title")"'
    exit 0
    ;;
esac

echo ""
curl -sS "${MC_SUPABASE_URL}/rest/v1/task_handoffs?${QUERY}" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" | jq -r '.[] | "[\(.status)] \(.id[:8])... | \(.priority // "normal") | \(.title // "no title") | from: \(.from_agent)"'
