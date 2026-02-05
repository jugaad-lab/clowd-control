#!/usr/bin/env bash
# List skills in a tribe
# Usage: ./skill-list.sh <tribe_id> [--all|--pending|--approved]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../agentcomms/load-env.sh"
validate_env

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <tribe_id> [--all|--pending|--approved]"
  exit 1
fi

TRIBE_ID="$1"
FILTER="${2:---approved}"

# Build filter
case "$FILTER" in
  --all)
    STATUS_FILTER=""
    echo "📦 All skills in tribe"
    ;;
  --pending)
    STATUS_FILTER="&status=eq.pending"
    echo "⏳ Pending skills"
    ;;
  --approved)
    STATUS_FILTER="&status=eq.approved"
    echo "✅ Approved skills"
    ;;
  *)
    echo "Unknown filter: $FILTER"
    exit 1
    ;;
esac

echo ""

# Get skills
SKILLS=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tribe_skills?tribe_id=eq.${TRIBE_ID}${STATUS_FILTER}&select=*,submitter:agents!submitted_by(display_name)" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "order=status.asc,submitted_at.desc")

if [[ $(echo "$SKILLS" | jq 'length') -eq 0 ]]; then
  echo "No skills found."
  exit 0
fi

# Print skills
echo "$SKILLS" | jq -r '.[] | 
  (if .status == "approved" then "✅" elif .status == "pending" then "⏳" elif .status == "rejected" then "❌" else "❓" end) + " " + .skill_name + 
  "\n   Path: " + .skill_path + 
  "\n   Description: " + (.description // "N/A") + 
  "\n   Submitted by: " + (.submitter.display_name // .submitted_by) +
  "\n   Status: " + .status +
  "\n"'

echo "---"
echo "Total: $(echo "$SKILLS" | jq 'length') skills"
