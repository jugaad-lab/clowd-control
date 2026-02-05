#!/usr/bin/env bash
# Approve or reject a skill submission
# Usage: ./skill-approve.sh <skill_id> [--reject "reason"]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../agentcomms/load-env.sh"
validate_env

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <skill_id> [--reject \"reason\"]"
  echo ""
  echo "Examples:"
  echo "  $0 abc-123                    # Approve skill"
  echo "  $0 abc-123 --reject \"Security concern\""
  exit 1
fi

SKILL_ID="$1"
REJECT_MODE=false
REJECT_REASON=""

if [[ "${2:-}" == "--reject" ]]; then
  REJECT_MODE=true
  REJECT_REASON="${3:-No reason provided}"
fi

# Get skill info
SKILL=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tribe_skills?id=eq.${SKILL_ID}&select=*,tribe:tribes(id,name)" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}")

if [[ $(echo "$SKILL" | jq 'length') -eq 0 ]]; then
  echo "❌ Skill not found: $SKILL_ID"
  exit 1
fi

TRIBE_ID=$(echo "$SKILL" | jq -r '.[0].tribe_id')
SKILL_NAME=$(echo "$SKILL" | jq -r '.[0].skill_name')
CURRENT_STATUS=$(echo "$SKILL" | jq -r '.[0].status')
SUBMITTED_BY=$(echo "$SKILL" | jq -r '.[0].submitted_by')

# Check if you're a tribe owner
MEMBERSHIP=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tribe_members?tribe_id=eq.${TRIBE_ID}&agent_id=eq.${AGENT_ID}&tier=eq.4&status=eq.active" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}")

if [[ $(echo "$MEMBERSHIP" | jq 'length') -eq 0 ]]; then
  echo "❌ Only tribe owners (Tier 4) can approve skills"
  exit 1
fi

if [[ "$CURRENT_STATUS" != "pending" ]]; then
  echo "ℹ️ Skill is already $CURRENT_STATUS"
  exit 0
fi

echo "📦 Skill: $SKILL_NAME"
echo "   Submitted by: $SUBMITTED_BY"
echo "   Description: $(echo "$SKILL" | jq -r '.[0].description // "N/A"')"
echo "   Path: $(echo "$SKILL" | jq -r '.[0].skill_path')"
echo ""
echo "🔍 Security Audit:"
echo "$SKILL" | jq -r '.[0].security_audit // "No audit data"'
echo ""

if [[ "$REJECT_MODE" == true ]]; then
  # Reject the skill
  ACTION="reject"
  NEW_STATUS="rejected"
  echo "❌ Rejecting skill..."
else
  # Approve the skill
  ACTION="approve"
  NEW_STATUS="approved"
  echo "✅ Approving skill..."
fi

# Update skill status
curl -sS -X PATCH "${MC_SUPABASE_URL}/rest/v1/tribe_skills?id=eq.${SKILL_ID}" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"status\": \"${NEW_STATUS}\",
    \"approved_by\": \"${AGENT_ID}\",
    \"approved_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }" > /dev/null

# Record approval in audit trail
curl -sS -X POST "${MC_SUPABASE_URL}/rest/v1/skill_approvals" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"skill_id\": \"${SKILL_ID}\",
    \"approver_id\": \"${AGENT_ID}\",
    \"action\": \"${ACTION}\",
    \"reason\": \"${REJECT_REASON}\"
  }" > /dev/null

echo ""
if [[ "$REJECT_MODE" == true ]]; then
  echo "❌ Skill rejected: $SKILL_NAME"
  echo "   Reason: $REJECT_REASON"
else
  echo "✅ Skill approved: $SKILL_NAME"
  echo ""
  echo "🔔 All tribe members can now use this skill!"
  echo "   Install via: clawdhub install $(echo "$SKILL" | jq -r '.[0].skill_path')"
fi
