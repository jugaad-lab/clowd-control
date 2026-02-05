import { render, screen, fireEvent } from '@testing-library/react';
import { SprintCard } from './SprintCard';
import { Sprint, Task } from '@/lib/supabase';

// Helper to create a mock sprint
const createMockSprint = (overrides: Partial<Sprint> = {}): Sprint => ({
  id: 'sprint-1',
  project_id: 'project-1',
  name: 'Feature Sprint',
  number: 1,
  acceptance_criteria: [],
  status: 'active',
  planned_start: '2024-01-01',
  planned_end: '2024-01-14',
  actual_start: null,
  actual_end: null,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Helper to create mock tasks
const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  project_id: 'project-1',
  sprint_id: 'sprint-1',
  title: 'Test Task',
  description: null,
  task_type: 'development',
  acceptance_criteria: null,
  status: 'in_progress',
  assigned_to: null,
  assigned_by: null,
  assigned_at: null,
  priority: 5,
  complexity: 'medium',
  tokens_consumed: 0,
  estimated_tokens: null,
  shadowing: 'none',
  requires_review: false,
  reviewer_id: null,
  review_status: 'not_required',
  review_notes: null,
  deadline: null,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  completed_at: null,
  notes: null,
  ...overrides,
});

describe('SprintCard', () => {
  const defaultProps = {
    sprint: createMockSprint(),
    tasks: [
      createMockTask({ id: 'task-1', status: 'done' }),
      createMockTask({ id: 'task-2', status: 'in_progress' }),
      createMockTask({ id: 'task-3', status: 'backlog' }),
    ],
  };

  it('renders without crashing', () => {
    render(<SprintCard {...defaultProps} />);
    expect(screen.getByText('Feature Sprint')).toBeInTheDocument();
  });

  it('displays sprint number', () => {
    render(<SprintCard {...defaultProps} />);
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
  });

  it('displays sprint name', () => {
    const sprint = createMockSprint({ name: 'Authentication Sprint' });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.getByText('Authentication Sprint')).toBeInTheDocument();
  });

  // Status display
  it('displays Active status for active sprint', () => {
    const sprint = createMockSprint({ status: 'active' });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays Planned status for planned sprint', () => {
    const sprint = createMockSprint({ status: 'planned' });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.getByText('Planned')).toBeInTheDocument();
  });

  it('displays In Review status for review sprint', () => {
    const sprint = createMockSprint({ status: 'review' });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.getByText('In Review')).toBeInTheDocument();
  });

  it('displays Completed status for completed sprint', () => {
    const sprint = createMockSprint({ status: 'completed' });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  // Date display
  it('displays formatted date range', () => {
    const sprint = createMockSprint({
      planned_start: '2024-06-01',
      planned_end: '2024-06-14',
    });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    // Dates should be visible (might vary by timezone, so check for June month)
    const dateContainer = screen.getByText((content, element) => {
      return element?.tagName === 'SPAN' && /Jun|May/.test(content) && /—/.test(content);
    });
    expect(dateContainer).toBeInTheDocument();
  });

  it('handles null dates gracefully', () => {
    const sprint = createMockSprint({
      planned_start: null,
      planned_end: null,
    });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    // Should show the date span with dashes for null dates
    const dateContainer = screen.getByText((content, element) => {
      return element?.tagName === 'SPAN' && content.includes('—');
    });
    expect(dateContainer).toBeInTheDocument();
  });

  // Task statistics
  it('displays correct task count', () => {
    render(<SprintCard {...defaultProps} />);
    expect(screen.getByText('3 tasks')).toBeInTheDocument();
  });

  it('displays completed task count', () => {
    render(<SprintCard {...defaultProps} />);
    expect(screen.getByText('1 done')).toBeInTheDocument();
  });

  it('displays remaining task count', () => {
    render(<SprintCard {...defaultProps} />);
    expect(screen.getByText('2 remaining')).toBeInTheDocument();
  });

  // Progress calculation
  it('calculates progress percentage correctly', () => {
    render(<SprintCard {...defaultProps} />);
    // 1 of 3 done = 33%
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('shows 0% progress when no tasks', () => {
    const sprint = createMockSprint();
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows 100% progress when all tasks done', () => {
    const allDoneTasks = [
      createMockTask({ id: 'task-1', status: 'done' }),
      createMockTask({ id: 'task-2', status: 'done' }),
    ];
    render(<SprintCard sprint={createMockSprint()} tasks={allDoneTasks} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  // Only counts tasks belonging to this sprint
  it('only counts tasks belonging to the sprint', () => {
    const mixedTasks = [
      createMockTask({ id: 'task-1', sprint_id: 'sprint-1', status: 'done' }),
      createMockTask({ id: 'task-2', sprint_id: 'sprint-1', status: 'in_progress' }),
      createMockTask({ id: 'task-3', sprint_id: 'other-sprint', status: 'done' }),
    ];
    render(<SprintCard sprint={createMockSprint()} tasks={mixedTasks} />);
    expect(screen.getByText('2 tasks')).toBeInTheDocument();
    expect(screen.getByText('1 done')).toBeInTheDocument();
  });

  // Acceptance criteria
  it('displays acceptance criteria section when present', () => {
    const sprint = createMockSprint({
      acceptance_criteria: [
        { id: 'ac-1', description: 'All tests pass', verified: true, verified_by: 'user-1' },
        { id: 'ac-2', description: 'Code reviewed', verified: false, verified_by: null },
      ],
    });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.getByText('Acceptance Criteria')).toBeInTheDocument();
    expect(screen.getByText('All tests pass')).toBeInTheDocument();
    expect(screen.getByText('Code reviewed')).toBeInTheDocument();
  });

  it('truncates long acceptance criteria text', () => {
    const longCriteria = 'A'.repeat(100);
    const sprint = createMockSprint({
      acceptance_criteria: [
        { id: 'ac-1', description: longCriteria, verified: false, verified_by: null },
      ],
    });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    // Should show truncated version (50 chars + ...)
    expect(screen.getByText(`${'A'.repeat(50)}...`)).toBeInTheDocument();
  });

  it('shows count of hidden criteria when more than 3', () => {
    const sprint = createMockSprint({
      acceptance_criteria: [
        { id: 'ac-1', description: 'Criteria 1', verified: false, verified_by: null },
        { id: 'ac-2', description: 'Criteria 2', verified: false, verified_by: null },
        { id: 'ac-3', description: 'Criteria 3', verified: false, verified_by: null },
        { id: 'ac-4', description: 'Criteria 4', verified: false, verified_by: null },
        { id: 'ac-5', description: 'Criteria 5', verified: false, verified_by: null },
      ],
    });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('hides acceptance criteria section when empty', () => {
    const sprint = createMockSprint({ acceptance_criteria: [] });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.queryByText('Acceptance Criteria')).not.toBeInTheDocument();
  });

  // Days remaining (for active sprints)
  it('shows days remaining for active sprint with future end date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const sprint = createMockSprint({
      status: 'active',
      planned_end: futureDate.toISOString().split('T')[0],
    });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.getByText('5 days left')).toBeInTheDocument();
  });

  it('shows "Ends today" for active sprint ending today', () => {
    const today = new Date().toISOString().split('T')[0];
    const sprint = createMockSprint({
      status: 'active',
      planned_end: today,
    });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.getByText('Ends today')).toBeInTheDocument();
  });

  it('shows "Overdue" for active sprint past end date', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);
    const sprint = createMockSprint({
      status: 'active',
      planned_end: pastDate.toISOString().split('T')[0],
    });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('does not show days remaining for non-active sprints', () => {
    const sprint = createMockSprint({ status: 'planned' });
    render(<SprintCard sprint={sprint} tasks={[]} />);
    expect(screen.queryByText(/days left/)).not.toBeInTheDocument();
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  // Drag and drop
  it('calls onDragOver when dragging over', () => {
    const onDragOver = jest.fn();
    render(<SprintCard {...defaultProps} onDragOver={onDragOver} />);
    
    const card = screen.getByText('Feature Sprint').closest('div');
    fireEvent.dragOver(card!);
    
    expect(onDragOver).toHaveBeenCalled();
  });

  it('calls onDrop when dropping', () => {
    const onDrop = jest.fn();
    render(<SprintCard {...defaultProps} onDrop={onDrop} />);
    
    const card = screen.getByText('Feature Sprint').closest('div');
    fireEvent.drop(card!);
    
    expect(onDrop).toHaveBeenCalled();
  });

  it('applies drop target styling when isDropTarget is true', () => {
    const { container } = render(
      <SprintCard {...defaultProps} isDropTarget={true} />
    );
    
    const card = container.firstChild;
    expect(card).toHaveClass('border-blue-400');
  });

  // Edge cases
  it('handles tasks with null sprint_id', () => {
    const tasksWithNull = [
      createMockTask({ id: 'task-1', sprint_id: null }),
    ];
    const sprint = createMockSprint();
    render(<SprintCard sprint={sprint} tasks={tasksWithNull} />);
    expect(screen.getByText('0 tasks')).toBeInTheDocument();
  });
});
