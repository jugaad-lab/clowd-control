#!/usr/bin/env bash
# Delegate a task to the best matching worker
# Usage: ./delegate.sh <task_type> <task_title> [priority]
#
# Examples:
#   ./delegate.sh coding "Build new dashboard component" high
#   ./delegate.sh research "Analyze competitor features"
#   ./delegate.sh design "Create login page mockups" medium
#
# This script:
# 1. Finds the best worker for the task type
# 2. Creates a task handoff to that worker
# 3. Returns the handoff ID

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load-env.sh"
validate_env

TASK_TYPE="${1:-}"
TASK_TITLE="${2:-}"
PRIORITY="${3:-medium}"

if [ -z "$TASK_TYPE" ] || [ -z "$TASK_TITLE" ]; then
  echo "Usage: $0 <task_type> <task_title> [priority]"
  echo ""
  echo "Task types: coding, research, design, writing, testing, analysis, devops"
  echo "Priority: low, medium, high, urgent (default: medium)"
  echo ""
  echo "Examples:"
  echo "  $0 coding 'Build user auth component' high"
  echo "  $0 research 'Analyze market trends'"
  echo "  $0 design 'Create landing page mockups' medium"
  exit 1
fi

echo "🎯 Delegating task: $TASK_TITLE"
echo "   Type: $TASK_TYPE | Priority: $PRIORITY"
echo ""

# Step 1: Find best worker
WORKER=$("$SCRIPT_DIR/match-worker.sh" "$TASK_TYPE" 2>/dev/null | tail -1)

if [ "$WORKER" = "none" ] || [ -z "$WORKER" ]; then
  echo "❌ No suitable worker found for task type: $TASK_TYPE"
  echo ""
  echo "Available options:"
  echo "  1. Do the task yourself"
  echo "  2. Create a broadcast task (assign to no one)"
  echo "  3. Wait for a suitable worker to come online"
  exit 1
fi

echo "✅ Found worker: $WORKER"
echo ""

# Step 2: Create handoff
echo "📤 Creating task handoff..."

"$SCRIPT_DIR/handoff.sh" "$WORKER" "$TASK_TITLE" "$PRIORITY"

echo ""
echo "🎉 Task delegated successfully!"
echo "   Worker: $WORKER"
echo "   Title: $TASK_TITLE"
echo "   Priority: $PRIORITY"
echo ""
echo "Monitor progress with: ./tasks.sh --all"
