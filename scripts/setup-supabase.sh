#!/usr/bin/env bash
# ClowdControl Supabase Setup Script
# Automates the setup of Supabase for new ClowdControl bots
#
# Usage:
#   ./setup-supabase.sh              # Interactive setup
#   ./setup-supabase.sh --validate-only  # Validate existing setup
#   ./setup-supabase.sh --help       # Show this help
#
# This script will:
# 1. Prompt for Supabase URL, service key, and agent ID
# 2. Create ~/workspace/.env.agentcomms with proper permissions
# 3. Test connection to Supabase
# 4. Run all database migrations (requires Supabase CLI or manual execution)
# 5. Validate that all required tables exist
#
# Requirements:
# - curl (for API testing)
# - supabase CLI (optional but recommended): npm install -g supabase
# - psql (optional alternative): brew install postgresql

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/../supabase/migrations"
ENV_FILE="${HOME}/workspace/.env.agentcomms"

# Expected tables (from actual migrations)
EXPECTED_TABLES=(
  "activity_log" "agent_assignments" "agent_conversations" "agent_messages"
  "agent_notification_prefs" "agent_presence" "agent_sessions" "agents"
  "critiques" "debate_rounds" "independent_opinions" "owners"
  "profiles" "project_members" "project_owners" "projects" "proposals"
  "shared_artifacts" "sprint_closing_reports" "sprints" "sycophancy_flags"
  "task_dependencies" "task_handoffs" "task_updates" "tasks" "trust_relationships"
)

# Helper functions
print_header() {
  echo -e "${BLUE}$1${NC}"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Validate URL format
validate_url() {
  local url="$1"
  if [[ ! "$url" =~ ^https://[a-zA-Z0-9-]+\.supabase\.co$ ]]; then
    print_error "Invalid Supabase URL format. Expected: https://xxx.supabase.co"
    return 1
  fi
  return 0
}

# Validate service key format (JWT token)
validate_service_key() {
  local key="$1"
  if [[ ! "$key" =~ ^eyJ ]]; then
    print_error "Invalid service key format. Expected JWT token starting with 'eyJ'"
    return 1
  fi
  return 0
}

# Test Supabase connection
test_connection() {
  local url="$1"
  local key="$2"
  
  print_header "Testing connection..."
  
  local response
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "${url}/rest/v1/rpc/version" \
    -H "apikey: ${key}" \
    -H "Authorization: Bearer ${key}" \
    -H "Content-Type: application/json" 2>&1)
  
  local http_code=$(echo "$response" | tail -n1)
  
  if [[ "$http_code" == "200" ]] || [[ "$http_code" == "404" ]]; then
    # 404 is OK - means DB is reachable but function doesn't exist yet
    print_success "Connected to Supabase successfully"
    return 0
  else
    print_error "Failed to connect to Supabase (HTTP $http_code)"
    echo "Response: $(echo "$response" | head -n-1)"
    return 1
  fi
}

# Execute SQL migration
execute_migration() {
  local url="$1"
  local key="$2"
  local sql_file="$3"
  local filename=$(basename "$sql_file")
  
  # Read SQL file
  local sql_content
  sql_content=$(cat "$sql_file")
  
  # Execute via Supabase SQL endpoint
  local response
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "${url}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${key}" \
    -H "Authorization: Bearer ${key}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$sql_content" | jq -Rs .)}" 2>&1)
  
  local http_code=$(echo "$response" | tail -n1)
  
  # If exec_sql doesn't exist, try direct SQL execution via pg_stat_statements
  if [[ "$http_code" == "404" ]]; then
    # Fallback: Use PostgREST's ability to execute DDL via query parameter
    # Split SQL into individual statements and execute via REST API
    # This is a simplified approach - in production, use proper migration tool
    
    # For now, just execute the SQL content directly via curl to the database
    # We'll use the Supabase Management API for migrations
    print_warning "Direct SQL execution not available, attempting alternative method..."
    
    # Try using psql if available
    if command -v psql &> /dev/null; then
      # Extract connection string from Supabase URL
      # Format: postgres://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
      local project_ref=$(echo "$url" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')
      
      echo "$sql_content" | psql "postgresql://postgres:${key}@db.${project_ref}.supabase.co:5432/postgres" &>/dev/null
      if [ $? -eq 0 ]; then
        print_success "$filename"
        return 0
      fi
    fi
    
    # If psql not available, we need to parse and execute statement by statement
    # This is a workaround - split on semicolons and execute via REST
    print_warning "Cannot execute migration via API. Please run migrations manually using Supabase Dashboard or psql."
    print_warning "SQL file: $sql_file"
    return 1
  fi
  
  if [[ "$http_code" == "200" ]] || [[ "$http_code" == "204" ]]; then
    print_success "$filename"
    return 0
  else
    print_error "$filename (HTTP $http_code)"
    echo "Response: $(echo "$response" | head -n-1)"
    return 1
  fi
}

# Execute migration via Supabase SQL editor API
execute_migration_direct() {
  local url="$1"
  local key="$2"
  local sql_file="$3"
  local filename=$(basename "$sql_file")
  
  # Read SQL file
  local sql_content
  sql_content=$(cat "$sql_file")
  
  # We need to use curl to POST to Supabase's REST API
  # Since we can't use the SQL editor API directly, we'll need to use psql or the Management API
  # For this script, let's provide both options: psql if available, or instructions if not
  
  if command -v psql &> /dev/null; then
    # Try to connect via psql using direct connection
    local project_ref=$(echo "$url" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')
    
    # Note: Users need to provide the database password, not the service key
    # The service key is for API access, not direct DB access
    # For now, we'll execute via the REST API with a workaround
    :
  fi
  
  # Fallback: Execute using curl and the query parameter
  # Supabase REST API doesn't support arbitrary SQL, only RPC functions
  # We need to use the Supabase Management API or Dashboard
  
  print_warning "$filename - requires manual execution or psql"
  return 1
}

# Execute all migrations
execute_all_migrations() {
  local url="$1"
  local key="$2"
  
  print_header "Running migrations..."
  echo ""
  
  # Count migration files
  local migration_count=$(ls -1 "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | wc -l)
  
  if [ "$migration_count" -eq 0 ]; then
    print_error "No migration files found in ${MIGRATIONS_DIR}"
    return 1
  fi
  
  print_success "Found $migration_count migration files"
  echo ""
  
  # Check if supabase CLI is available (best option)
  if command -v supabase &> /dev/null; then
    print_success "Supabase CLI found, using it for migrations..."
    
    # Create temporary supabase config if needed
    local project_ref=$(echo "$url" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')
    
    cd "${SCRIPT_DIR}/.." || return 1
    
    # Link to remote project if not already linked
    if [ ! -f ".supabase/config.toml" ]; then
      supabase link --project-ref "$project_ref" 2>&1 || true
    fi
    
    # Push migrations
    supabase db push 2>&1
    
    if [ $? -eq 0 ]; then
      print_success "All migrations executed successfully via Supabase CLI"
      return 0
    else
      print_warning "Supabase CLI push had issues, trying manual execution..."
    fi
  fi
  
  # Fallback: Try psql with direct DB connection
  if command -v psql &> /dev/null; then
    echo ""
    print_warning "psql detected - you can run migrations manually"
    echo ""
    echo "To use psql, you need your database connection string from Supabase:"
    echo "1. Go to your project settings"
    echo "2. Find 'Database' section"
    echo "3. Copy the connection string (postgres://...)"
    echo ""
    read -p "Do you have the database connection string? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      read -p "Enter database connection string: " db_conn
      
      if [ -n "$db_conn" ]; then
        local failed=0
        for sql_file in "${MIGRATIONS_DIR}"/*.sql; do
          local filename=$(basename "$sql_file")
          echo -n "  $filename ... "
          
          if psql "$db_conn" -f "$sql_file" &>/dev/null; then
            echo -e "${GREEN}✓${NC}"
          else
            echo -e "${RED}✗${NC}"
            failed=1
          fi
        done
        
        if [ $failed -eq 0 ]; then
          print_success "All migrations executed successfully via psql"
          return 0
        else
          print_error "Some migrations failed"
          return 1
        fi
      fi
    fi
  fi
  
  # No suitable tool found - provide instructions
  print_warning "No migration tool found (Supabase CLI or psql)"
  echo ""
  echo "Please run migrations manually using one of these methods:"
  echo ""
  echo "📌 Option 1: Supabase CLI (recommended)"
  echo "   npm install -g supabase"
  echo "   cd ${SCRIPT_DIR}/.."
  echo "   supabase link --project-ref <your-project-ref>"
  echo "   supabase db push"
  echo ""
  echo "📌 Option 2: Supabase Dashboard"
  echo "   1. Go to: https://supabase.com/dashboard/project/${url##*://}/sql/new"
  echo "   2. Copy and execute each .sql file from: ${MIGRATIONS_DIR}"
  echo "   3. Run files in alphabetical order (001_*.sql first, then 002_*.sql, etc.)"
  echo ""
  echo "📌 Option 3: psql command-line"
  echo "   Install psql, then:"
  echo "   cd ${MIGRATIONS_DIR}"
  echo "   for f in *.sql; do psql 'your-connection-string' < \"\$f\"; done"
  echo ""
  echo "After running migrations manually, validate the schema:"
  echo "  $0 --validate-only"
  echo ""
  
  return 1
}

# Validate schema (check all tables exist)
validate_schema() {
  local url="$1"
  local key="$2"
  
  print_header "Validating schema..."
  echo ""
  
  local missing_tables=()
  local found_count=0
  
  for table in "${EXPECTED_TABLES[@]}"; do
    # Query the table to see if it exists
    local response
    response=$(curl -s -w "\n%{http_code}" \
      -X GET "${url}/rest/v1/${table}?limit=0" \
      -H "apikey: ${key}" \
      -H "Authorization: Bearer ${key}" 2>&1)
    
    local http_code=$(echo "$response" | tail -n1)
    
    if [[ "$http_code" == "200" ]]; then
      ((found_count++))
    else
      missing_tables+=("$table")
    fi
  done
  
  if [ ${#missing_tables[@]} -eq 0 ]; then
    print_success "Found all ${#EXPECTED_TABLES[@]} required tables"
    return 0
  else
    print_warning "Found $found_count/${#EXPECTED_TABLES[@]} tables"
    print_error "Missing tables:"
    for table in "${missing_tables[@]}"; do
      echo "  - $table"
    done
    return 1
  fi
}

# Main setup flow
main() {
  echo ""
  print_header "📦 ClowdControl Supabase Setup"
  print_header "=============================="
  echo ""
  
  # Check if .env already exists
  if [ -f "$ENV_FILE" ]; then
    print_warning "Configuration already exists at $ENV_FILE"
    read -p "Do you want to reconfigure? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Keeping existing configuration."
      source "$ENV_FILE"
      
      # Skip to validation
      if test_connection "$MC_SUPABASE_URL" "$MC_SERVICE_KEY"; then
        echo ""
        validate_schema "$MC_SUPABASE_URL" "$MC_SERVICE_KEY"
        if [ $? -eq 0 ]; then
          echo ""
          print_success "Setup validated successfully!"
          echo ""
          echo "Next steps:"
          echo "- Register your agent: ${SCRIPT_DIR}/agentcomms/register.sh"
          echo "- Check tasks: ${SCRIPT_DIR}/agentcomms/tasks.sh --mine"
          exit 0
        else
          print_error "Schema validation failed. You may need to run migrations."
          exit 1
        fi
      else
        exit 1
      fi
    fi
  fi
  
  # Prompt for Supabase URL
  read -p "Enter your Supabase project URL: " supabase_url
  supabase_url="${supabase_url// /}" # Remove spaces
  
  if ! validate_url "$supabase_url"; then
    exit 1
  fi
  
  # Prompt for service key
  read -sp "Enter your service role key: " service_key
  echo ""
  service_key="${service_key// /}" # Remove spaces
  
  if ! validate_service_key "$service_key"; then
    exit 1
  fi
  
  # Prompt for agent ID
  read -p "Enter your agent ID (e.g., \"cheenu\"): " agent_id
  agent_id="${agent_id// /}" # Remove spaces
  
  if [ -z "$agent_id" ]; then
    print_error "Agent ID cannot be empty"
    exit 1
  fi
  
  echo ""
  
  # Create workspace directory if it doesn't exist
  mkdir -p ~/workspace
  
  # Write .env file
  cat > "$ENV_FILE" << EOF
# ClowdControl AgentComms Configuration
# Created: $(date)

MC_SUPABASE_URL=${supabase_url}
MC_SERVICE_KEY=${service_key}
AGENT_ID=${agent_id}
EOF
  
  # Set proper permissions
  chmod 600 "$ENV_FILE"
  print_success "Credentials saved to $ENV_FILE (600)"
  
  # Test connection
  if ! test_connection "$supabase_url" "$service_key"; then
    print_error "Connection test failed. Please check your credentials."
    exit 1
  fi
  
  echo ""
  
  # Execute migrations
  if ! execute_all_migrations "$supabase_url" "$service_key"; then
    print_warning "Migrations not executed automatically"
    echo ""
    print_warning "After running migrations manually, you can validate with:"
    echo "  $0 --validate-only"
    exit 1
  fi
  
  echo ""
  
  # Validate schema
  if ! validate_schema "$supabase_url" "$service_key"; then
    print_error "Schema validation failed"
    exit 1
  fi
  
  echo ""
  print_success "🎉 Setup complete! You can now use ClowdControl."
  echo ""
  echo "Next steps:"
  echo "- Register your agent: ${SCRIPT_DIR}/agentcomms/register.sh"
  echo "- Check tasks: ${SCRIPT_DIR}/agentcomms/tasks.sh --mine"
  echo ""
}

# Handle command-line flags
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat << 'EOF'
ClowdControl Supabase Setup Script

Usage:
  ./setup-supabase.sh              Interactive setup
  ./setup-supabase.sh --validate-only  Validate existing configuration
  ./setup-supabase.sh --help       Show this help

Description:
  Automates the setup of Supabase for ClowdControl bots. This script will:
  
  1. Prompt for Supabase URL, service key, and agent ID
  2. Create ~/workspace/.env.agentcomms with proper permissions (600)
  3. Test connection to Supabase
  4. Run database migrations (via Supabase CLI if available)
  5. Validate that all required tables exist
  
  The script is idempotent - safe to run multiple times.

Requirements:
  - curl (for API testing)
  - supabase CLI (recommended): npm install -g supabase
  - psql (alternative): brew install postgresql

Configuration:
  Created at: ~/workspace/.env.agentcomms
  Format:
    MC_SUPABASE_URL=https://xxx.supabase.co
    MC_SERVICE_KEY=eyJ...
    AGENT_ID=your-agent-id

Examples:
  # First-time setup
  ./setup-supabase.sh
  
  # Validate existing setup
  ./setup-supabase.sh --validate-only
  
  # After manual migration
  ./setup-supabase.sh --validate-only

EOF
  exit 0
fi

if [ "${1:-}" = "--validate-only" ]; then
  if [ ! -f "$ENV_FILE" ]; then
    print_error "No configuration found at $ENV_FILE"
    echo "Run without --validate-only to set up."
    exit 1
  fi
  
  source "$ENV_FILE"
  
  echo ""
  print_header "📦 ClowdControl Schema Validation"
  print_header "=================================="
  echo ""
  
  if test_connection "$MC_SUPABASE_URL" "$MC_SERVICE_KEY"; then
    echo ""
    if validate_schema "$MC_SUPABASE_URL" "$MC_SERVICE_KEY"; then
      echo ""
      print_success "Schema is valid!"
      exit 0
    else
      exit 1
    fi
  else
    exit 1
  fi
fi

# Run main setup
main
