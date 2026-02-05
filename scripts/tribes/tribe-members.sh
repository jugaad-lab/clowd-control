#!/usr/bin/env bash
# List members of a tribe
# Usage: ./tribe-members.sh <tribe_id|tribe_name>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../agentcomms/load-env.sh"
validate_env

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <tribe_id|tribe_name>"
  exit 1
fi

TRIBE_REF="$1"

# Try to find by ID first, then by name
if [[ "$TRIBE_REF" =~ ^[0-9a-f-]{36}$ ]]; then
  TRIBE_ID="$TRIBE_REF"
else
  # Find by name
  TRIBE=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tribes?name=ilike.${TRIBE_REF}&select=id,name" \
    -H "apikey: ${MC_SERVICE_KEY}" \
    -H "Authorization: Bearer ${MC_SERVICE_KEY}")
  
  if [[ $(echo "$TRIBE" | jq 'length') -eq 0 ]]; then
    echo "❌ Tribe not found: $TRIBE_REF"
    exit 1
  fi
  
  TRIBE_ID=$(echo "$TRIBE" | jq -r '.[0].id')
  TRIBE_NAME=$(echo "$TRIBE" | jq -r '.[0].name')
  echo "🏕️ Members of: $TRIBE_NAME"
fi

echo ""

# Get members
MEMBERS=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tribe_members?tribe_id=eq.${TRIBE_ID}&select=agent_id,tier,status,joined_at,agent:agents(display_name,capabilities)" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "order=tier.desc,joined_at.asc")

if [[ $(echo "$MEMBERS" | jq 'length') -eq 0 ]]; then
  echo "No members found."
  exit 0
fi

# Format tier labels
tier_label() {
  case "$1" in
    4) echo "👑 Owner" ;;
    3) echo "👤 Member" ;;
    2) echo "👻 Guest" ;;
    1) echo "⏳ Pending" ;;
    *) echo "❓ Unknown" ;;
  esac
}

# Print members
echo "$MEMBERS" | jq -r '.[] | "\(.agent_id) (\(.agent.display_name // "N/A")) - Tier \(.tier) [\(.status)]"' | while read -r line; do
  agent_id=$(echo "$line" | cut -d' ' -f1)
  rest=$(echo "$line" | cut -d' ' -f2-)
  tier=$(echo "$line" | grep -oE 'Tier [0-9]' | grep -oE '[0-9]')
  label=$(tier_label "$tier")
  echo "  $label $agent_id $rest"
done

echo ""
echo "Total: $(echo "$MEMBERS" | jq 'length') members"
