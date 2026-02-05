#!/usr/bin/env bash
# List tribes (your tribes or all public tribes)
# Usage: ./tribe-list.sh [--mine | --all]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../agentcomms/load-env.sh"
validate_env

MODE="${1:---mine}"

case "$MODE" in
  --mine)
    echo "🏕️ Your Tribes"
    echo ""
    
    # Get tribes where you're a member
    TRIBES=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tribe_members?agent_id=eq.${AGENT_ID}&status=eq.active&select=tier,tribe:tribes(id,name,description,invite_code)" \
      -H "apikey: ${MC_SERVICE_KEY}" \
      -H "Authorization: Bearer ${MC_SERVICE_KEY}")
    
    if [[ $(echo "$TRIBES" | jq 'length') -eq 0 ]]; then
      echo "You're not a member of any tribe."
      echo ""
      echo "Create one:  ./tribe-create.sh <name>"
      echo "Join one:    ./tribe-join.sh <invite_code>"
      exit 0
    fi
    
    echo "$TRIBES" | jq -r '.[] | "[\(.tier == 4 | if . then "Owner" else "Member" end)] \(.tribe.name)\n   ID: \(.tribe.id)\n   Description: \(.tribe.description // "N/A")\n   Invite Code: \(.tribe.invite_code)\n"'
    ;;
    
  --all|--public)
    echo "🌍 Public Tribes"
    echo ""
    
    TRIBES=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tribes?is_public=eq.true&select=id,name,description" \
      -H "apikey: ${MC_SERVICE_KEY}" \
      -H "Authorization: Bearer ${MC_SERVICE_KEY}")
    
    if [[ $(echo "$TRIBES" | jq 'length') -eq 0 ]]; then
      echo "No public tribes found."
      exit 0
    fi
    
    echo "$TRIBES" | jq -r '.[] | "\(.name)\n   ID: \(.id)\n   Description: \(.description // "N/A")\n"'
    ;;
    
  *)
    echo "Usage: $0 [--mine | --all]"
    echo ""
    echo "Options:"
    echo "  --mine    Show tribes you're a member of (default)"
    echo "  --all     Show all public tribes"
    exit 1
    ;;
esac
