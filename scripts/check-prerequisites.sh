#!/bin/bash
# ClowdControl Prerequisites Check
# Run this before onboarding to verify your setup

echo "🔍 Checking ClowdControl prerequisites..."
echo ""

ERRORS=0
WARNINGS=0

# Check env file
if [ -f ~/workspace/.env.agentcomms ]; then
  echo "✅ .env.agentcomms exists"
  source ~/workspace/.env.agentcomms
else
  echo "❌ Missing ~/workspace/.env.agentcomms"
  ERRORS=$((ERRORS + 1))
fi

# Check required vars
for var in MC_SUPABASE_URL MC_SERVICE_KEY AGENT_ID; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing $var in .env.agentcomms"
    ERRORS=$((ERRORS + 1))
  else
    echo "✅ $var is set"
  fi
done

# Check optional vars
if [ -z "$DISCORD_WEBHOOK_URL" ]; then
  echo "⚠️  DISCORD_WEBHOOK_URL not set (optional, needed for status broadcasts)"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ DISCORD_WEBHOOK_URL is set"
fi

# Test Supabase connection (only if we have the URL)
if [ -n "$MC_SUPABASE_URL" ] && [ -n "$MC_SERVICE_KEY" ]; then
  echo ""
  echo "Testing Supabase connection..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$MC_SUPABASE_URL/rest/v1/agents?limit=1" \
    -H "apikey: $MC_SERVICE_KEY" 2>/dev/null)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Supabase connection OK (HTTP 200)"
  elif [ "$HTTP_CODE" = "401" ]; then
    echo "⚠️  Supabase returned HTTP 401 (Invalid API key - might need service key instead of anon)"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "⚠️  Supabase returned HTTP $HTTP_CODE"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check for helper scripts
echo ""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/agentcomms" ]; then
  echo "✅ AgentComms scripts found at $SCRIPT_DIR/agentcomms/"
  SCRIPT_COUNT=$(ls -1 "$SCRIPT_DIR/agentcomms/"*.sh 2>/dev/null | wc -l)
  echo "   Found $SCRIPT_COUNT helper scripts"
else
  echo "⚠️  AgentComms scripts not found (curl commands will still work)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check file permissions
if [ -f ~/workspace/.env.agentcomms ]; then
  PERMS=$(stat -f "%Lp" ~/workspace/.env.agentcomms 2>/dev/null || stat -c "%a" ~/workspace/.env.agentcomms 2>/dev/null)
  if [ "$PERMS" = "600" ]; then
    echo "✅ .env.agentcomms has secure permissions (600)"
  else
    echo "⚠️  .env.agentcomms has permissions $PERMS (recommend 600)"
    echo "   Run: chmod 600 ~/workspace/.env.agentcomms"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "🎉 All checks passed! Ready to onboard."
elif [ $ERRORS -eq 0 ]; then
  echo "✅ Core checks passed with $WARNINGS warning(s)"
  echo "   You can proceed, but review warnings above."
else
  echo "❌ $ERRORS error(s), $WARNINGS warning(s)"
  echo "   Fix errors before proceeding."
  exit 1
fi
