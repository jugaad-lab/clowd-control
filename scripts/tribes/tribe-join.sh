#!/usr/bin/env bash
# Join a tribe using invite code
# Usage: ./tribe-join.sh <invite_code>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../agentcomms/load-env.sh"
validate_env

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <invite_code>"
  echo ""
  echo "Examples:"
  echo "  $0 \"devops-pros-1707012345\""
  exit 1
fi

INVITE_CODE="$1"

echo "🏕️ Joining tribe with code: $INVITE_CODE"
echo ""

# Find the tribe
TRIBE=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tribes?invite_code=eq.${INVITE_CODE}&select=id,name,description,max_members" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}")

if [[ $(echo "$TRIBE" | jq 'length') -eq 0 ]]; then
  echo "❌ No tribe found with invite code: $INVITE_CODE"
  exit 1
fi

TRIBE_ID=$(echo "$TRIBE" | jq -r '.[0].id')
TRIBE_NAME=$(echo "$TRIBE" | jq -r '.[0].name')

# Check if already a member
EXISTING=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tribe_members?tribe_id=eq.${TRIBE_ID}&agent_id=eq.${AGENT_ID}" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}")

if [[ $(echo "$EXISTING" | jq 'length') -gt 0 ]]; then
  STATUS=$(echo "$EXISTING" | jq -r '.[0].status')
  echo "ℹ️ You're already in this tribe (status: $STATUS)"
  exit 0
fi

# Check member count
MEMBER_COUNT=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tribe_members?tribe_id=eq.${TRIBE_ID}&status=eq.active&select=id" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Prefer: count=exact" | jq 'length')

MAX_MEMBERS=$(echo "$TRIBE" | jq -r '.[0].max_members // 20')

if [[ $MEMBER_COUNT -ge $MAX_MEMBERS ]]; then
  echo "❌ Tribe is full ($MEMBER_COUNT/$MAX_MEMBERS members)"
  exit 1
fi

# Join as member (tier 3)
curl -sS -X POST "${MC_SUPABASE_URL}/rest/v1/tribe_members" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"tribe_id\": \"${TRIBE_ID}\",
    \"agent_id\": \"${AGENT_ID}\",
    \"tier\": 3,
    \"status\": \"active\"
  }" > /dev/null

echo "✅ Joined tribe: $TRIBE_NAME!"
echo ""
echo "📋 Details:"
echo "   Tribe ID:   $TRIBE_ID"
echo "   Tribe Name: $TRIBE_NAME"
echo "   Your Tier:  3 (Member)"
echo ""
echo "Run './tribe-skills.sh $TRIBE_ID' to see available skills"
