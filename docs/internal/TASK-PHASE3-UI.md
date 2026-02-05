# Phase 3: Anti-Groupthink UI Components

**Schema already exists** in `supabase/schema.sql` — don't recreate it.

Build the UI for the anti-groupthink/PM consensus system.

## Location
- **Dashboard:** `<project-root>/mission-control/dashboard`
- **Stack:** Next.js, React, Tailwind, shadcn/ui

## Build These Components

### 1. Create directory structure
```
src/components/proposals/
├── ProposalCard.tsx        # Card showing proposal status
├── ProposalList.tsx        # List of proposals
├── CreateProposalModal.tsx # Modal to create new proposal
├── OpinionForm.tsx         # Isolated opinion submission (vote + reasoning + 2+ concerns)
├── OpinionReveal.tsx       # Side-by-side opinion comparison after all submit
├── ConcernsMatrix.tsx      # Visual comparison of concerns
├── DebateRoundCard.tsx     # Shows a debate round
└── SycophancyBanner.tsx    # Warning banner when sycophancy detected
```

### 2. ProposalCard.tsx
- Shows: title, status (open/debating/resolved/escalated), created_by, debate_round
- Status badge colors: open=blue, debating=yellow, resolved=green, escalated=red
- Click to navigate to proposal detail

### 3. CreateProposalModal.tsx  
- Title input
- Description textarea
- Submit creates proposal in Supabase

### 4. OpinionForm.tsx (CRITICAL)
- Vote selector: Approve / Reject / Abstain
- Reasoning textarea (required)
- Concerns list — user MUST enter 2+ concerns even if approving
- Submit button DISABLED until 2+ concerns entered
- After submit, user cannot see others' opinions until all PMs submit

### 5. OpinionReveal.tsx
- Shows all opinions side-by-side after everyone submits
- Highlights agreements (same vote) in green
- Highlights disagreements in red
- Shows reasoning for each

### 6. SycophancyBanner.tsx
- Yellow/orange warning banner
- Text: "⚠️ Potential sycophancy detected — requires human review"
- Show reason (instant_consensus, no_concerns, identical_reasoning)

### 7. DebateRoundCard.tsx
- Shows round number
- Shows each PM's revised opinion for that round
- "Start New Round" button if not consensus and < round 3

## Styling
- Use existing dark theme (bg-gray-800, bg-gray-700, etc.)
- Match existing component patterns in the codebase
- Use shadcn/ui components where available

## Don't
- Don't touch the schema
- Don't set up Supabase client (already exists)
- Don't create pages yet — just components

## When Done
Run `npm run build` to verify no errors.
