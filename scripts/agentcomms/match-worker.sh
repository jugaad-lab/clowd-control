#!/usr/bin/env bash
# Match a task to the best available worker based on capabilities
# Usage: ./match-worker.sh <task_type> [required_capabilities...]
#
# Examples:
#   ./match-worker.sh coding typescript react
#   ./match-worker.sh research
#   ./match-worker.sh design ui_design
#
# Returns: Best matching worker ID, or "none" if no match

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load-env.sh"
validate_env

TASK_TYPE="${1:-}"
shift || true
REQUIRED_CAPS="$*"

if [ -z "$TASK_TYPE" ]; then
  echo "Usage: $0 <task_type> [required_capabilities...]"
  echo ""
  echo "Task types: coding, research, design, writing, testing, analysis, devops"
  echo ""
  echo "Examples:"
  echo "  $0 coding typescript react"
  echo "  $0 research"
  echo "  $0 design ui_design ux"
  exit 1
fi

# Map task types to capability keywords
case "$TASK_TYPE" in
  coding|development|dev)
    SEARCH_CAPS="coding,debugging,typescript,python,react,programming"
    ;;
  research)
    SEARCH_CAPS="research,analysis,investigation"
    ;;
  design|ui|ux)
    SEARCH_CAPS="design,ui_design,ux,visual_design"
    ;;
  writing|content|docs)
    SEARCH_CAPS="writing,copywriting,documentation,content"
    ;;
  testing|qa)
    SEARCH_CAPS="testing,qa,ui_testing,e2e_testing"
    ;;
  analysis|data)
    SEARCH_CAPS="analysis,data,analytics,testing"
    ;;
  devops|infra)
    SEARCH_CAPS="devops,infrastructure,deployment,automation"
    ;;
  *)
    SEARCH_CAPS="$TASK_TYPE"
    ;;
esac

# Add any explicitly required capabilities
if [ -n "$REQUIRED_CAPS" ]; then
  SEARCH_CAPS="$SEARCH_CAPS,$REQUIRED_CAPS"
fi

echo "🔍 Finding worker for: $TASK_TYPE" >&2
echo "   Searching capabilities: $SEARCH_CAPS" >&2
echo "" >&2

# Query workers (exclude PMs, only active specialists)
WORKERS=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/agents?agent_type=eq.specialist&is_active=eq.true&select=id,display_name,capabilities,last_seen" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}")

# Score each worker based on capability match
BEST_MATCH=""
BEST_SCORE=0
BEST_NAME=""

# Convert search caps to array
IFS=',' read -ra SEARCH_ARRAY <<< "$SEARCH_CAPS"

while IFS= read -r worker; do
  [ -z "$worker" ] && continue
  
  WORKER_ID=$(echo "$worker" | jq -r '.id // empty')
  [ -z "$WORKER_ID" ] && continue
  
  WORKER_NAME=$(echo "$worker" | jq -r '.display_name // .id')
  WORKER_LAST_SEEN=$(echo "$worker" | jq -r '.last_seen // "never"')
  WORKER_CAPS=$(echo "$worker" | jq -r '.capabilities // [] | join(",")')
  
  # Skip if no capabilities
  [ -z "$WORKER_CAPS" ] && continue
  
  # Calculate match score
  SCORE=0
  for cap in "${SEARCH_ARRAY[@]}"; do
    cap=$(echo "$cap" | xargs)  # trim whitespace
    if echo "$WORKER_CAPS" | grep -qi "$cap"; then
      SCORE=$((SCORE + 1))
    fi
  done
  
  # Bonus if recently seen (within last hour)
  if [ "$WORKER_LAST_SEEN" != "never" ] && [ "$WORKER_LAST_SEEN" != "null" ]; then
    SCORE=$((SCORE + 1))
  fi
  
  if [ $SCORE -gt $BEST_SCORE ]; then
    BEST_SCORE=$SCORE
    BEST_MATCH="$WORKER_ID"
    BEST_NAME="$WORKER_NAME"
  fi
  
  echo "   $WORKER_NAME: score=$SCORE (caps: $WORKER_CAPS)" >&2
  
done < <(echo "$WORKERS" | jq -c '.[]')

echo "" >&2

if [ -n "$BEST_MATCH" ] && [ $BEST_SCORE -gt 0 ]; then
  echo "✅ Best match: $BEST_NAME ($BEST_MATCH) — score: $BEST_SCORE" >&2
  echo "$BEST_MATCH"
else
  echo "❌ No suitable worker found for: $TASK_TYPE" >&2
  echo "none"
fi
