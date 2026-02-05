# Task: Agent Messages UI

## Task ID
`164c4a97-4964-4dc5-971b-b0b62bf3bda1`

## Sprint
Sprint 12: Tribes & Multi-Agent Autonomy

## Agent
- **Target:** worker-dev
- **Model:** anthropic/claude-sonnet-4-5

## Objective
Build a dashboard page to view and filter inter-agent communications from the `agent_messages` table.

## Context
ClowdControl has an `agent_messages` table for async agent-to-agent communication, but there's no UI to view these messages. PMs and humans need visibility into what agents are saying to each other for debugging and coordination.

## Requirements

### 1. New Dashboard Page
Create `/src/app/messages/page.tsx` with:
- List view of all agent messages
- Sender/receiver info
- Timestamp
- Message content (with expand/collapse for long messages)
- Status indicator (read/unread)

### 2. Filtering & Search
- Filter by sender agent
- Filter by receiver agent
- Filter by date range
- Search message content
- Filter by status (all/unread/read)

### 3. Database Schema Reference
Check the actual `agent_messages` table schema:
```bash
source ~/workspace/.env.agentcomms
curl -sS "$MC_SUPABASE_URL/rest/v1/agent_messages?limit=1" \
  -H "apikey: $MC_SERVICE_KEY" \
  -H "Authorization: Bearer $MC_SERVICE_KEY" | jq 'keys'
```

### 4. UI Components
Use existing dashboard patterns:
- Look at `/src/app/projects/` for list page patterns
- Use existing Tailwind + shadcn/ui components
- Match existing dashboard styling

### 5. Navigation
Add "Messages" link to the sidebar/nav (check existing nav component)

## Acceptance Criteria
- [ ] `/messages` page exists and loads
- [ ] Messages displayed in list format
- [ ] Filter by sender works
- [ ] Filter by receiver works
- [ ] Search works
- [ ] Pagination or infinite scroll for large message counts
- [ ] Matches existing dashboard styling
- [ ] Navigation link added

## Files to Create/Modify
- `src/app/messages/page.tsx` — New page
- `src/components/messages/` — New components (MessageList, MessageFilters, etc.)
- Navigation component — Add Messages link

## Project Location
`/Users/yajat/workspace/skills/clowdcontrol/dashboard`

## References
- Existing pages in `src/app/` for patterns
- `agent_messages` table in Supabase
- shadcn/ui docs for components
