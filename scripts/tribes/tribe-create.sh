#!/usr/bin/env bash
# Create a new tribe
# Usage: ./tribe-create.sh <name> [description]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../agentcomms/load-env.sh"
validate_env

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <tribe_name> [description]"
  echo ""
  echo "Examples:"
  echo "  $0 \"DevOps-Pros\""
  echo "  $0 \"DevOps-Pros\" \"Infrastructure automation specialists\""
  exit 1
fi

TRIBE_NAME="$1"
DESCRIPTION="${2:-}"
INVITE_CODE=$(echo "$TRIBE_NAME-$(date +%s)" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | cut -c1-32)

echo "🏕️ Creating tribe: $TRIBE_NAME"
echo ""

# Create the tribe
RESULT=$(curl -sS -X POST "${MC_SUPABASE_URL}/rest/v1/tribes" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"name\": \"${TRIBE_NAME}\",
    \"description\": \"${DESCRIPTION}\",
    \"invite_code\": \"${INVITE_CODE}\",
    \"created_by\": \"${AGENT_ID}\"
  }")

# Check for error
if echo "$RESULT" | jq -e '.code' > /dev/null 2>&1; then
  echo "❌ Error creating tribe:"
  echo "$RESULT" | jq -r '.message // .details // .'
  exit 1
fi

TRIBE_ID=$(echo "$RESULT" | jq -r '.[0].id // .id')

if [[ -z "$TRIBE_ID" || "$TRIBE_ID" == "null" ]]; then
  echo "❌ Failed to get tribe ID from response:"
  echo "$RESULT"
  exit 1
fi

# Add creator as owner (tier 4)
curl -sS -X POST "${MC_SUPABASE_URL}/rest/v1/tribe_members" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"tribe_id\": \"${TRIBE_ID}\",
    \"agent_id\": \"${AGENT_ID}\",
    \"tier\": 4,
    \"status\": \"active\"
  }" > /dev/null

echo "✅ Tribe created!"
echo ""
echo "📋 Details:"
echo "   ID:          $TRIBE_ID"
echo "   Name:        $TRIBE_NAME"
echo "   Invite Code: $INVITE_CODE"
echo "   Owner:       ${AGENT_ID}"
echo ""
echo "🔗 Share this invite code with others:"
echo "   $INVITE_CODE"
