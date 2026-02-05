#!/bin/bash
#
# ClowdControl Supabase Setup
# Quick onboarding for new bots in <10 minutes
#
# Usage: ./setup.sh [OPTIONS]
#
# Options:
#   --link     Link to existing Supabase project
#   --init     Initialize new local Supabase project
#   --push     Push schema to remote database
#   --reset    Reset local database and reapply migrations
#   --status   Show current Supabase status
#   --help     Show this help message
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
ENV_FILE="${HOME}/workspace/.env.agentcomms"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

show_help() {
    head -20 "$0" | tail -n +2 | sed 's/^# //' | sed 's/^#//'
    exit 0
}

check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        log_error "Supabase CLI not found. Install it first:"
        echo "  brew install supabase/tap/supabase"
        echo "  # or: npm install -g supabase"
        exit 1
    fi
    log_success "Supabase CLI found: $(supabase --version)"
}

check_env_file() {
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warn "Environment file not found: $ENV_FILE"
        log_info "Creating template..."
        cat > "$ENV_FILE" << 'EOF'
# ClowdControl AgentComms Configuration
# Fill in your Supabase credentials

# Supabase Project URL (from project settings)
MC_SUPABASE_URL=https://your-project.supabase.co

# Service Role Key (from project settings > API)
# ⚠️  Keep this secret! Never commit to git.
MC_SERVICE_KEY=your-service-role-key

# Your agent's ID (unique identifier)
AGENT_ID=your-agent-name

# Optional: Discord webhook for notifications
DISCORD_WEBHOOK_URL=
EOF
        chmod 600 "$ENV_FILE"
        log_success "Template created at $ENV_FILE"
        log_warn "Please edit the file with your credentials, then run setup again."
        exit 1
    fi
    
    # Source and validate
    source "$ENV_FILE"
    
    if [[ -z "$MC_SUPABASE_URL" || "$MC_SUPABASE_URL" == "https://your-project.supabase.co" ]]; then
        log_error "MC_SUPABASE_URL not configured in $ENV_FILE"
        exit 1
    fi
    
    if [[ -z "$MC_SERVICE_KEY" || "$MC_SERVICE_KEY" == "your-service-role-key" ]]; then
        log_error "MC_SERVICE_KEY not configured in $ENV_FILE"
        exit 1
    fi
    
    log_success "Environment file loaded"
}

link_project() {
    log_info "Linking to Supabase project..."
    
    # Extract project ref from URL
    PROJECT_REF=$(echo "$MC_SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')
    
    if [[ -z "$PROJECT_REF" ]]; then
        log_error "Could not extract project ref from URL: $MC_SUPABASE_URL"
        exit 1
    fi
    
    log_info "Project ref: $PROJECT_REF"
    
    # Check if already linked
    if [[ -f "$SKILL_DIR/.supabase/config.json" ]]; then
        log_warn "Project already linked. Re-linking..."
    fi
    
    cd "$SKILL_DIR"
    
    # Initialize if needed
    if [[ ! -f "supabase/config.toml" ]]; then
        supabase init
    fi
    
    # Link to project
    supabase link --project-ref "$PROJECT_REF"
    
    log_success "Linked to project: $PROJECT_REF"
}

push_schema() {
    log_info "Pushing schema to remote database..."
    
    cd "$SKILL_DIR"
    
    # Check for migrations
    if [[ ! -d "$MIGRATIONS_DIR" ]] || [[ -z "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]]; then
        log_error "No migrations found in $MIGRATIONS_DIR"
        exit 1
    fi
    
    log_info "Found $(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ') migration files"
    
    # Push migrations
    supabase db push
    
    log_success "Schema pushed successfully!"
}

show_status() {
    log_info "Supabase Status"
    echo ""
    
    # Check env
    if [[ -f "$ENV_FILE" ]]; then
        source "$ENV_FILE"
        log_success "Environment: $ENV_FILE"
        echo "  URL: ${MC_SUPABASE_URL:-not set}"
        echo "  Agent: ${AGENT_ID:-not set}"
    else
        log_warn "No environment file"
    fi
    echo ""
    
    # Check supabase project
    cd "$SKILL_DIR"
    if [[ -f "supabase/config.toml" ]]; then
        log_success "Supabase initialized"
        if command -v supabase &> /dev/null; then
            supabase status 2>/dev/null || log_warn "Run 'supabase link' to connect to remote project"
        fi
    else
        log_warn "Supabase not initialized"
    fi
    echo ""
    
    # Check migrations
    if [[ -d "$MIGRATIONS_DIR" ]]; then
        count=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
        log_success "Migrations: $count files"
    else
        log_warn "No migrations directory"
    fi
}

reset_local() {
    log_info "Resetting local database..."
    
    cd "$SKILL_DIR"
    
    # Reset and reapply migrations
    supabase db reset
    
    log_success "Local database reset complete"
}

init_project() {
    log_info "Initializing Supabase project..."
    
    cd "$SKILL_DIR"
    
    if [[ -f "supabase/config.toml" ]]; then
        log_warn "Supabase already initialized"
    else
        supabase init
        log_success "Supabase initialized"
    fi
}

test_connection() {
    log_info "Testing database connection..."
    
    source "$ENV_FILE"
    
    # Simple test query
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        "$MC_SUPABASE_URL/rest/v1/agents?limit=1" \
        -H "apikey: $MC_SERVICE_KEY" \
        -H "Authorization: Bearer $MC_SERVICE_KEY")
    
    if [[ "$response" == "200" ]]; then
        log_success "Connection successful!"
    else
        log_error "Connection failed (HTTP $response)"
        log_info "Check your credentials in $ENV_FILE"
        exit 1
    fi
}

register_agent() {
    log_info "Registering agent..."
    
    source "$ENV_FILE"
    
    if [[ -z "$AGENT_ID" ]]; then
        log_error "AGENT_ID not set in $ENV_FILE"
        exit 1
    fi
    
    # Check if agent exists
    existing=$(curl -s "$MC_SUPABASE_URL/rest/v1/agents?id=eq.$AGENT_ID&select=id" \
        -H "apikey: $MC_SERVICE_KEY" \
        -H "Authorization: Bearer $MC_SERVICE_KEY")
    
    if [[ "$existing" != "[]" ]]; then
        log_success "Agent '$AGENT_ID' already registered"
    else
        # Register agent script
        if [[ -f "$SKILL_DIR/scripts/agentcomms/register.sh" ]]; then
            "$SKILL_DIR/scripts/agentcomms/register.sh" "$AGENT_ID"
            log_success "Agent '$AGENT_ID' registered"
        else
            log_warn "Registration script not found. Register manually."
        fi
    fi
}

# Quick setup - does everything
quick_setup() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║   ClowdControl Supabase Quick Setup      ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    
    check_supabase_cli
    check_env_file
    test_connection
    link_project
    push_schema
    register_agent
    
    echo ""
    log_success "Setup complete! 🎉"
    echo ""
    echo "Next steps:"
    echo "  1. Check your agent: ./scripts/agentcomms/status.sh"
    echo "  2. Discover other agents: ./scripts/agentcomms/discover.sh"
    echo "  3. Check your inbox: ./scripts/agentcomms/tasks.sh --mine"
    echo ""
}

# Parse arguments
case "${1:-quick}" in
    --help|-h)
        show_help
        ;;
    --link)
        check_supabase_cli
        check_env_file
        link_project
        ;;
    --init)
        check_supabase_cli
        init_project
        ;;
    --push)
        check_supabase_cli
        check_env_file
        push_schema
        ;;
    --reset)
        check_supabase_cli
        reset_local
        ;;
    --status)
        show_status
        ;;
    --test)
        check_env_file
        test_connection
        ;;
    --register)
        check_env_file
        register_agent
        ;;
    quick|"")
        quick_setup
        ;;
    *)
        log_error "Unknown option: $1"
        show_help
        ;;
esac
