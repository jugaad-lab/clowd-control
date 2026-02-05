# Task: Agent Messages UI - Review Improvements

## Sprint
Sprint 12: Tribes & Multi-Agent Autonomy

## Agent
- **Target:** worker-dev
- **Model:** anthropic/claude-sonnet-4-5

## Objective
Address PR review feedback for Agent Messages UI (PR #1).

## Review Comments to Address

### 1. User-Facing Error Handling
- Currently uses `console.error`
- Add toast notifications for errors (use existing toast component if available, or add simple error display)

### 2. Loading States  
- Add spinners/loading indicators for:
  - Mark as read/unread operations
  - Any update operations

### 3. Toast Notifications
- There's a comment "Could add a toast notification" in the code
- Implement toast notifications for user feedback

## Files to Modify
- `dashboard/src/app/messages/page.tsx`
- `dashboard/src/components/messages/MessageList.tsx`
- `dashboard/src/components/messages/MessageDetails.tsx`

## Branch
Work on: `chhotu/agent-messages-ui`

## Acceptance Criteria
- [ ] Error states show user-friendly messages (not just console.error)
- [ ] Loading spinners appear during async operations
- [ ] Toast notifications for success/error feedback
- [ ] No TypeScript errors

## Project Location
`<project-root>/clowdcontrol/dashboard`

## Notes
- Keep changes minimal and focused on the review feedback
- Follow existing dashboard patterns for toasts/loading states
- Commit with message: "fix: address PR review - error handling, loading states, toasts"
