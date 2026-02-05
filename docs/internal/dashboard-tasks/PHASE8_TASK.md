# Phase 8 Task: Dashboard Polish

**Working Directory:** <project-root>/mission-control/dashboard

## Priority 1: Activity Feed Component

Create `src/components/ActivityFeed.tsx`:

```tsx
// Requirements:
// 1. Fetch last 20 entries from activity_log table
// 2. Display each entry with:
//    - Agent ID (format as @agent)
//    - Action (task_assigned, task_updated, etc.)
//    - Entity (task/proposal)
//    - Time ago (use date-fns)
// 3. Real-time subscription for new entries
// 4. Loading and empty states

// Use existing patterns from:
// - src/lib/supabase.ts for database access
// - src/lib/hooks.ts for subscription patterns
```

Add ActivityFeed to `src/app/page.tsx` in a sidebar or section.

## Priority 2: Real-time Updates

### Home Page (`src/app/page.tsx`)
- Subscribe to `tasks` and `projects` tables
- Update UI when changes detected
- Cleanup subscription on unmount

### Project Detail (`src/app/projects/[id]/page.tsx`)  
- Subscribe to tasks for this project
- Live Kanban updates

Use this pattern:
```tsx
useEffect(() => {
  const subscription = supabase
    .channel('tasks-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, 
      (payload) => { refetch(); })
    .subscribe();
  
  return () => { subscription.unsubscribe(); };
}, []);
```

## Priority 3: UI Polish

### Remove console.log (11 instances)
```bash
grep -rn "console.log" src/components --include="*.tsx" | head -20
# Remove or convert to proper error handling
```

### Fix CommandPalette TODO
In `src/components/CommandPalette.tsx`, implement the "Create Task" action.

### Loading States
Add loading spinners to:
- Task list while fetching
- Project detail while loading
- Activity feed while loading

### Empty States  
Add "No items" messages for:
- Empty task lists
- No proposals
- No activity

## Priority 4: Test Integration

After building, test these flows:

```bash
# In skill directory
cd ~/workspace/skills/mission-control

# 1. Update task via CLI
bun mc.ts update 87d1d014 done --as chhotu

# 2. Check dashboard updated (should show task as done)

# 3. Run heartbeat
bun mc.ts heartbeat

# 4. Check activity log
bun mc.ts activity --limit 5
```

## Files Reference

**Database client:** `src/lib/supabase.ts`
**Hooks:** `src/lib/hooks.ts`  
**Main page:** `src/app/page.tsx`
**Components:** `src/components/`

## Success Criteria

1. ✅ ActivityFeed component created and displays data
2. ✅ Real-time updates working on home + project pages
3. ✅ No console.log statements
4. ✅ CommandPalette TODO fixed
5. ✅ Loading/empty states added
6. ✅ CLI → Dashboard sync verified
