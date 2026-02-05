# Task: [BUG] Fix Project Progress Showing 100% When Sprints Still Active/Planned

## Task ID
`2e5a9634-5e4a-4bb0-b2b9-3be94fe9d4b8`

## Agent
- **Target:** worker-dev
- **Model:** sonnet4

## Project
- **Project:** Mission Control
- **Project ID:** 949d00d5-9072-4353-a0e9-174468978598

## Bug Description
Project progress shows 100% when sprints are still active or planned. The `ProjectProgress` component only counts task statuses (`done / total`) but doesn't account for sprint completion status. If all *existing* tasks are marked done but active/planned sprints remain, progress displays 100% — which is misleading.

## Root Cause Analysis

**File:** `dashboard/src/components/ProjectProgress.tsx`

The component only receives `tasks: Task[]` and calculates:
```typescript
const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
```

It has no awareness of sprints. If planned sprints exist with no tasks created yet, or active sprints have all their tasks done but the sprint itself isn't "completed", the progress is inaccurate.

**File:** `dashboard/src/app/projects/[id]/page.tsx` (line 311)

The component is invoked as:
```tsx
<ProjectProgress tasks={tasks} />
```

No sprint data is passed.

## Fix Requirements

### 1. Update `ProjectProgress` to Accept Sprint Data

Add an optional `sprints` prop:

```typescript
interface ProjectProgressProps {
  tasks: Task[];
  sprints?: Sprint[];  // NEW
  className?: string;
  showDetails?: boolean;
}
```

### 2. Sprint-Aware Progress Calculation

When sprints are provided, calculate progress considering both tasks AND sprint status:

**Option A (recommended):** Weight-based approach
- Each sprint contributes equally to overall progress
- A sprint's internal progress = its tasks done / its total tasks
- Completed sprints = 100%, planned sprints with no tasks = 0%
- Overall = weighted average across all sprints

**Option B:** Simpler approach  
- If any sprint is `active` or `planned` and has incomplete tasks (or no tasks), cap progress below 100%
- Progress = tasks done / (total tasks + estimated remaining for planned sprints)

**Key rules:**
- If there are `planned` or `active` sprints that are NOT `completed`, progress should NOT be 100%
- Only show 100% when ALL sprints are `completed` (or there are no sprints and all tasks are done)
- Tasks not assigned to any sprint should still count normally

### 3. Update the Project Page

In `dashboard/src/app/projects/[id]/page.tsx`, pass sprints:

```tsx
<ProjectProgress tasks={tasks} sprints={sprints} />
```

### 4. Handle Edge Cases
- No sprints defined → fall back to current behavior (task-only)
- All sprints completed → 100% is correct
- Tasks without sprint assignment → include in calculation
- Empty planned sprints → should reduce overall percentage

### 5. Update Progress Bar Legend (Optional)
Consider adding a sprint indicator to the legend:
- "Sprint 3/5 active" or similar context

## Files to Modify

- `dashboard/src/components/ProjectProgress.tsx` — Main fix: add sprint-awareness
- `dashboard/src/app/projects/[id]/page.tsx` — Pass `sprints` prop to `ProjectProgress`

## Acceptance Criteria
- [ ] Progress does NOT show 100% when active/planned sprints exist with incomplete work
- [ ] Progress shows 100% only when all sprints are completed (or no sprints + all tasks done)
- [ ] Backward compatible — component still works without sprints prop
- [ ] Progress bar segments still show done/in-progress/blocked correctly
- [ ] `ProjectProgressCompact` also updated if applicable

## Type References

```typescript
// Sprint status: 'planned' | 'active' | 'review' | 'completed'
// Task status includes: 'backlog' | 'assigned' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled'
```

## Project Location
`<project-root>/mission-control/dashboard/`
