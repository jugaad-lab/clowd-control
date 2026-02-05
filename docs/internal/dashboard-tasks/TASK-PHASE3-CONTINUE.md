# Phase 3 Continuation — Anti-Groupthink Protocol

## Already Done ✅
- `src/components/proposals/ProposalCard.tsx`
- `src/components/proposals/ProposalList.tsx`
- `src/components/proposals/CreateProposalModal.tsx`

## Still Needed

### 1. Database Schema (Priority)
Add these tables to `<project-root>/mission-control/supabase/schema.sql`:

```sql
-- Proposals requiring PM consensus
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open', -- open, debating, consensus, escalated, approved, rejected
  created_by UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  debate_round INT DEFAULT 0
);

-- Independent opinions (isolated input)
CREATE TABLE opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id),
  agent_id UUID REFERENCES agents(id),
  vote TEXT NOT NULL, -- approve, reject, abstain
  reasoning TEXT NOT NULL,
  concerns TEXT[], -- MUST have 2+ items
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  debate_round INT DEFAULT 1,
  UNIQUE(proposal_id, agent_id, debate_round)
);

-- Debate rounds
CREATE TABLE debate_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id),
  round_number INT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  summary TEXT
);

-- Sycophancy flags
CREATE TABLE sycophancy_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id),
  flagged_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);
```

### 2. Components to Build

**src/components/proposals/OpinionForm.tsx**
- CRITICAL: Isolated input — PM cannot see other opinions until they submit
- Vote selector (Approve / Reject / Abstain)
- Reasoning text area (required)
- Concerns list — MUST enter 2+ concerns even if approving
- Submit button disabled until 2+ concerns entered

**src/components/proposals/OpinionReveal.tsx**
- Side-by-side comparison of all opinions after reveal
- Highlight agreements and disagreements
- Visual diff of reasoning

**src/components/proposals/ConcernsMatrix.tsx**
- Grid comparing concerns across all PMs
- Highlight common themes

**src/components/proposals/DebateRoundCard.tsx**
- Display round history
- Track round number (max 3)
- Show who changed their vote

**src/components/proposals/SycophancyBanner.tsx**
- Warning banner: "⚠️ Potential sycophancy detected — requires human review"
- Link to review queue

### 3. Library Files

**src/lib/proposals.ts**
- Supabase helpers for CRUD operations
- Real-time subscriptions

**src/lib/sycophancy.ts**
Detection logic:
- All PMs approve within 60 seconds → flag
- Zero concerns across all opinions → flag
- Reasoning text >80% similar → flag

### 4. App Routes

**src/app/projects/[id]/proposals/page.tsx**
- List proposals for project
- "New Proposal" button

**src/app/proposals/[id]/page.tsx**
- Proposal detail + debate view
- Show reveal after all submit

**src/app/proposals/[id]/submit/page.tsx**
- Isolated opinion submission

## Style Notes
- Follow existing patterns (TaskCard, KanbanColumn)
- Dark mode support (use existing theme tokens)
- Use existing Supabase client from `src/lib/supabase.ts`

## Build Order
1. Schema → 2. lib/proposals.ts → 3. OpinionForm → 4. OpinionReveal → 5. ConcernsMatrix → 6. DebateRoundCard → 7. SycophancyBanner + lib/sycophancy.ts → 8. App routes
