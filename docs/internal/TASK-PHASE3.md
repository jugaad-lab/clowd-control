# Phase 3: Anti-Groupthink Protocol

Build the PM consensus and anti-groupthink system for Mission Control.

## Context
- **Location:** `<project-root>/mission-control/dashboard`
- **Stack:** Next.js 16, React 19, Tailwind, Supabase, shadcn/ui
- **Supabase:** Already configured in `.env` (one level up)

## Features to Build

### 1. Database Schema (Supabase)
Add tables for the consensus system:
```sql
-- Proposals requiring PM consensus
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open', -- open, debating, resolved, escalated
  created_by UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution TEXT, -- approved, rejected, escalated
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
  reason TEXT NOT NULL, -- e.g., "instant_consensus", "no_concerns", "identical_reasoning"
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by TEXT, -- human reviewer
  reviewed_at TIMESTAMPTZ
);
```

### 2. Proposal Creation UI (`/projects/[id]/proposals`)
- List of proposals for project
- "New Proposal" button opens modal
- Fields: title, description, required PMs (multi-select)
- Status badges: Open, Debating, Resolved, Escalated

### 3. Opinion Submission (`/proposals/[id]`)
- **CRITICAL: Isolated input** — PM cannot see other opinions until they submit
- Vote selector (Approve / Reject / Abstain)
- Reasoning text area (required)
- Concerns list — **MUST enter 2+ concerns** even if approving
- Submit button disabled until 2+ concerns entered

### 4. Reveal & Debate View
- After all PMs submit, reveal all opinions side-by-side
- Highlight agreements and disagreements
- Show concerns comparison matrix
- "Start Debate Round" button (if disagreement)

### 5. Sycophancy Detection (Auto)
Flag proposals automatically if:
- All PMs approve within 60 seconds
- Zero concerns across all opinions  
- Reasoning text is >80% similar (use simple word overlap)
- Instant unanimous agreement on complex topics

Display flag banner: "⚠️ Potential sycophancy detected — requires human review"

### 6. Debate Rounds (Max 3)
- Each round: PMs can revise opinions after seeing others
- Track round number, show history
- After round 3 without consensus → auto-escalate

### 7. Escalation Flow
- "Escalate to Human" button (manual)
- Auto-escalate after 3 rounds
- Escalated proposals show in special queue
- Discord notification when escalated (use existing pattern)

## File Structure
```
src/app/
├── projects/[id]/
│   └── proposals/
│       └── page.tsx          # Proposal list
├── proposals/[id]/
│   ├── page.tsx              # Proposal detail + debate view
│   └── submit/
│       └── page.tsx          # Isolated opinion submission
src/components/
├── proposals/
│   ├── ProposalCard.tsx
│   ├── ProposalList.tsx
│   ├── CreateProposalModal.tsx
│   ├── OpinionForm.tsx       # Isolated submission form
│   ├── OpinionReveal.tsx     # Side-by-side comparison
│   ├── ConcernsMatrix.tsx    # Concerns comparison
│   ├── DebateRoundCard.tsx
│   └── SycophancyBanner.tsx
src/lib/
├── proposals.ts              # Supabase helpers
└── sycophancy.ts             # Detection logic
```

## Acceptance Criteria
- [ ] Can create proposal requiring dual-PM consensus
- [ ] PMs submit opinions without seeing each other's (isolated)
- [ ] System blocks submission without 2+ concerns
- [ ] Instant high consensus triggers sycophancy flag
- [ ] After 3 debate rounds, auto-escalates to human
- [ ] Escalated proposals visible in queue with notification

## Notes
- Use existing Supabase client from `src/lib/supabase.ts`
- Follow existing component patterns (see TaskCard, KanbanColumn)
- Dark mode support required (use existing theme tokens)
- Real-time updates via Supabase subscriptions

Start with the database schema, then build UI top-down.
