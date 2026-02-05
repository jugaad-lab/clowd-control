#!/usr/bin/env bash
# Submit a skill to a tribe for approval
# Usage: ./skill-submit.sh <tribe_id> <skill_name> [skill_path] [description]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../agentcomms/load-env.sh"
validate_env

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <tribe_id> <skill_name> [skill_path] [description]"
  echo ""
  echo "Examples:"
  echo "  $0 abc-123 \"github\" \"clawdhub:github\" \"GitHub CLI integration\""
  echo "  $0 abc-123 \"custom-tool\" \"./my-skills/custom-tool\""
  exit 1
fi

TRIBE_ID="$1"
SKILL_NAME="$2"
SKILL_PATH="${3:-clawdhub:$SKILL_NAME}"
DESCRIPTION="${4:-}"

echo "📦 Submitting skill to tribe"
echo "   Tribe: $TRIBE_ID"
echo "   Skill: $SKILL_NAME"
echo "   Path:  $SKILL_PATH"
echo ""

# Check membership
MEMBERSHIP=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tribe_members?tribe_id=eq.${TRIBE_ID}&agent_id=eq.${AGENT_ID}&status=eq.active" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}")

if [[ $(echo "$MEMBERSHIP" | jq 'length') -eq 0 ]]; then
  echo "❌ You must be a member of the tribe to submit skills"
  exit 1
fi

# Check if skill already exists
EXISTING=$(curl -sS "${MC_SUPABASE_URL}/rest/v1/tribe_skills?tribe_id=eq.${TRIBE_ID}&skill_name=eq.${SKILL_NAME}" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}")

if [[ $(echo "$EXISTING" | jq 'length') -gt 0 ]]; then
  echo "❌ Skill '$SKILL_NAME' already exists in this tribe"
  echo "   Status: $(echo "$EXISTING" | jq -r '.[0].status')"
  exit 1
fi

# Basic security audit (placeholder - could be expanded)
AUDIT_RESULT=$(cat <<EOF
{
  "scanned_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "scanner_version": "1.0.0",
  "checks": {
    "dangerous_commands": "not_scanned",
    "external_apis": "not_scanned",
    "file_access": "not_scanned"
  },
  "verdict": "pending_review",
  "notes": "Automated scan not implemented - requires manual review"
}
EOF
)

# Submit the skill
RESULT=$(curl -sS -X POST "${MC_SUPABASE_URL}/rest/v1/tribe_skills" \
  -H "apikey: ${MC_SERVICE_KEY}" \
  -H "Authorization: Bearer ${MC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"tribe_id\": \"${TRIBE_ID}\",
    \"skill_name\": \"${SKILL_NAME}\",
    \"skill_path\": \"${SKILL_PATH}\",
    \"description\": \"${DESCRIPTION}\",
    \"submitted_by\": \"${AGENT_ID}\",
    \"status\": \"pending\",
    \"security_audit\": ${AUDIT_RESULT}
  }")

if echo "$RESULT" | jq -e '.code' > /dev/null 2>&1; then
  echo "❌ Error submitting skill:"
  echo "$RESULT" | jq -r '.message // .details // .'
  exit 1
fi

SKILL_ID=$(echo "$RESULT" | jq -r '.[0].id // .id')

echo "✅ Skill submitted for approval!"
echo ""
echo "📋 Details:"
echo "   Skill ID: $SKILL_ID"
echo "   Status:   pending"
echo ""
echo "⏳ Waiting for tribe owner approval..."
echo "   Owners can run: ./skill-approve.sh $SKILL_ID"
