# Claude Code Tasks — Phase 2: Professional PM Features

## Overview
Build the core PM features for Mission Control dashboard. Work through tasks in order.

## Environment
- Project: `<project-root>/mission-control/dashboard`
- Stack: Next.js 16, React 19, Tailwind CSS, Supabase
- Supabase credentials in `.env.local`

---

## Task 1: Install Dependencies
```bash
npm install cmdk @dnd-kit/core @dnd-kit/sortable recharts lucide-react
```

---

## Task 2: Build TaskListView Component

Create `src/components/TaskListView.tsx`:

**Requirements:**
- Sortable table with columns: ID, Title, Status, Assignee, Type, Priority
- Click column header to sort
- Alternating row colors
- Status badges with colors
- Assignee avatars (initials)

**Structure:**
```tsx
interface TaskListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: string) => void;
}
```

---

## Task 3: Build Command Palette

Create `src/components/CommandPalette.tsx`:

**Requirements:**
- Opens with `Cmd+K` (Mac) or `Ctrl+K` (Windows)
- Search tasks by title
- Quick actions: Create task, Go to project, Change status
- Keyboard navigation (arrow keys, enter)
- Use `cmdk` library

**Structure:**
```tsx
<CommandPalette 
  tasks={tasks}
  onNavigate={(path) => router.push(path)}
  onCreateTask={() => setShowCreateModal(true)}
/>
```

---

## Task 4: Build FilterBar Component

Create `src/components/FilterBar.tsx`:

**Requirements:**
- Filter chips for: Status, Assignee, Type, Sprint
- Multiple selection per filter
- Clear all button
- Visual indication of active filters

**Structure:**
```tsx
interface FilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  agents: Agent[];
  sprints: Sprint[];
}
```

---

## Task 5: Build TaskSidePanel Component

Create `src/components/TaskSidePanel.tsx`:

**Requirements:**
- Slides in from right when task clicked
- Shows full task details
- Editable fields (title, description, status, assignee)
- Comments section (placeholder for now)
- Activity log (placeholder)
- Close button and click-outside-to-close

**Structure:**
```tsx
<TaskSidePanel
  task={selectedTask}
  isOpen={!!selectedTask}
  onClose={() => setSelectedTask(null)}
  onUpdate={(updates) => updateTask(task.id, updates)}
/>
```

---

## Task 6: Add Inline Editing

Create `src/components/InlineEdit.tsx`:

**Requirements:**
- Click text to edit
- Press Enter to save, Escape to cancel
- Loading state during save
- Works for text and textarea

**Structure:**
```tsx
<InlineEdit
  value={task.title}
  onSave={(newValue) => updateTask(task.id, { title: newValue })}
/>
```

---

## Task 7: Add View Toggle (List/Kanban)

Update project page to support both views:

**Requirements:**
- Toggle button in header: List | Kanban
- Persist preference in localStorage
- Smooth transition between views

---

## Task 8: Add Project Progress Indicator

Create `src/components/ProjectProgress.tsx`:

**Requirements:**
- Progress bar showing sprint completion
- Fraction label: "5/12 tasks done"
- Color changes based on progress (red < 30%, yellow < 70%, green >= 70%)

---

## Task 9: Update Project Page Layout

Integrate all components into `/projects/[id]/page.tsx`:

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Header: Project Name | View Toggle | Theme      │
├─────────────────────────────────────────────────┤
│ Sprint Selector | Progress Bar                  │
├─────────────────────────────────────────────────┤
│ Filter Bar                                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  List View OR Kanban View                       │
│                                                 │
├─────────────────────────────────────────────────┤
│ Task Side Panel (when task selected)            │
└─────────────────────────────────────────────────┘
```

---

## Task 10: Add Global Command Palette

Add to root layout so it works on all pages.

---

## Testing Checklist
After completing all tasks, verify:
- [ ] Can switch between List and Kanban views
- [ ] `Cmd+K` opens command palette from any page
- [ ] Can search and navigate to tasks
- [ ] Filters work correctly (status, assignee, type)
- [ ] Clicking task row opens side panel
- [ ] Can edit task inline (title, description)
- [ ] Progress bar updates when tasks complete
- [ ] All components are responsive

---

## Commit Strategy
Commit after each task with message:
```
feat(dashboard): [Task N] Brief description
```

---

*Start with Task 1 (dependencies) and work through in order.*
