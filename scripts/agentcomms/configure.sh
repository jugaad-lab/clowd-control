#!/usr/bin/env bash
# Configure agent and project settings in ClowdControl
# Usage: ./configure.sh [--agent | --project <project_id>]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load-env.sh"
validate_env

show_help() {
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  --agent                    Configure your agent's comms_endpoint"
  echo "  --project <project_id>     Configure a project's notification settings"
  echo "  --list-projects            List all projects"
  echo "  --show-agent               Show your current agent config"
  echo ""
  echo "Examples:"
  echo "  $0 --agent"
  echo "  $0 --project abc-123-def"
  echo "  $0 --list-projects"
}

configure_agent() {
  echo "🔧 Configure Agent: ${AGENT_ID}"
  echo ""
  
  # Show current config
  echo "Current config:"
  curl -sS "${MC_SUPABASE_URL}/rest/v1/agents?id=eq.${AGENT_ID}&select=id,comms_endpoint,status" \
    -H "apikey: ${MC_SERVICE_KEY}" | jq .
  echo ""
  
  # Prompt for Discord user ID
  read -p "Enter your Discord User ID (or 'skip' to skip): " DISCORD_ID
  
  if [[ "$DISCORD_ID" != "skip" && -n "$DISCORD_ID" ]]; then
    COMMS_ENDPOINT="discord:${DISCORD_ID}"
    
    curl -sS -X PATCH "${MC_SUPABASE_URL}/rest/v1/agents?id=eq.${AGENT_ID}" \
      -H "apikey: ${MC_SERVICE_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"comms_endpoint\": \"${COMMS_ENDPOINT}\"}"
    
    echo ""
    echo "✅ Updated comms_endpoint to: ${COMMS_ENDPOINT}"
  else
    echo "Skipped comms_endpoint update"
  fi
}

configure_project() {
  PROJECT_ID="$1"
  echo "🔧 Configure Project: ${PROJECT_ID}"
  echo ""
  
  # Show current config
  echo "Current config:"
  curl -sS "${MC_SUPABASE_URL}/rest/v1/projects?id=eq.${PROJECT_ID}&select=id,name,discord_channel_id,settings" \
    -H "apikey: ${MC_SERVICE_KEY}" | jq .
  echo ""
  
  # Prompt for Discord channel ID
  read -p "Enter Discord Channel ID for notifications (or 'skip'): " CHANNEL_ID
  
  if [[ "$CHANNEL_ID" != "skip" && -n "$CHANNEL_ID" ]]; then
    curl -sS -X PATCH "${MC_SUPABASE_URL}/rest/v1/projects?id=eq.${PROJECT_ID}" \
      -H "apikey: ${MC_SERVICE_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"discord_channel_id\": \"${CHANNEL_ID}\"}"
    
    echo ""
    echo "✅ Updated discord_channel_id to: ${CHANNEL_ID}"
  fi
  
  # Prompt for webhook URL
  read -p "Enter Discord Webhook URL (or 'skip'): " WEBHOOK_URL
  
  if [[ "$WEBHOOK_URL" != "skip" && -n "$WEBHOOK_URL" ]]; then
    # Update settings JSONB with webhook
    curl -sS -X PATCH "${MC_SUPABASE_URL}/rest/v1/projects?id=eq.${PROJECT_ID}" \
      -H "apikey: ${MC_SERVICE_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"settings\": $(curl -sS "${MC_SUPABASE_URL}/rest/v1/projects?id=eq.${PROJECT_ID}&select=settings" -H "apikey: ${MC_SERVICE_KEY}" | jq -c ".[0].settings + {\"notification_webhook_url\": \"${WEBHOOK_URL}\"}")}"
    
    echo ""
    echo "✅ Updated notification_webhook_url"
  fi
}

list_projects() {
  echo "📋 All Projects:"
  echo ""
  curl -sS "${MC_SUPABASE_URL}/rest/v1/projects?select=id,name,status,discord_channel_id&order=created_at.desc" \
    -H "apikey: ${MC_SERVICE_KEY}" | jq -r '.[] | "[\(.status)] \(.id) - \(.name) (channel: \(.discord_channel_id // "not set"))"'
}

show_agent() {
  echo "👤 Agent Config: ${AGENT_ID}"
  echo ""
  curl -sS "${MC_SUPABASE_URL}/rest/v1/agents?id=eq.${AGENT_ID}" \
    -H "apikey: ${MC_SERVICE_KEY}" | jq .
}

# Parse command
case "${1:-}" in
  --agent)
    configure_agent
    ;;
  --project)
    if [[ -z "${2:-}" ]]; then
      echo "❌ Missing project ID"
      echo "Usage: $0 --project <project_id>"
      exit 1
    fi
    configure_project "$2"
    ;;
  --list-projects)
    list_projects
    ;;
  --show-agent)
    show_agent
    ;;
  -h|--help|"")
    show_help
    ;;
  *)
    echo "❌ Unknown command: $1"
    show_help
    exit 1
    ;;
esac
