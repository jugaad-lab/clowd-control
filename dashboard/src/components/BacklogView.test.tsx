import { render, screen, fireEvent } from '@testing-library/react';
import { BacklogView } from './BacklogView';
import { Task } from '@/lib/supabase';

// Mock the UI components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, disabled }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: string;
    size?: string;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} className={className} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

// Helper to create mock tasks
const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  project_id: 'project-1',
  sprint_id: null, // Backlog tasks have null sprint_id
  title: 'Test Task',
  description: null,
  task_type: 'development',
  acceptance_criteria: null,
  status: 'backlog',
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

describe('BacklogView', () => {
  const mockTasks: Task[] = [
    createMockTask({ id: 'task-1', title: 'High priority task', priority: 9, task_type: 'development' }),
    createMockTask({ id: 'task-2', title: 'Medium priority task', priority: 5, task_type: 'design' }),
    createMockTask({ id: 'task-3', title: 'Low priority task', priority: 2, task_type: 'testing' }),
  ];

  const defaultProps = {
    tasks: mockTasks,
    onDragStart: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<BacklogView {...defaultProps} />);
    expect(screen.getByText('Backlog')).toBeInTheDocument();
  });

  it('displays task count', () => {
    render(<BacklogView {...defaultProps} />);
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('displays all backlog tasks', () => {
    render(<BacklogView {...defaultProps} />);
    expect(screen.getByText('High priority task')).toBeInTheDocument();
    expect(screen.getByText('Medium priority task')).toBeInTheDocument();
    expect(screen.getByText('Low priority task')).toBeInTheDocument();
  });

  it('displays task types', () => {
    render(<BacklogView {...defaultProps} />);
    // Task types appear in both the task badges and filter dropdown
    expect(screen.getAllByText('Development').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Design').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Testing').length).toBeGreaterThanOrEqual(1);
  });

  it('displays priority badges', () => {
    render(<BacklogView {...defaultProps} />);
    expect(screen.getByText('P9')).toBeInTheDocument();
    expect(screen.getByText('P5')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
  });

  it('shows drag instructions', () => {
    render(<BacklogView {...defaultProps} />);
    expect(screen.getByText('Drag tasks to a sprint to assign them')).toBeInTheDocument();
  });

  // Empty state
  it('shows empty state when no backlog tasks', () => {
    render(<BacklogView tasks={[]} onDragStart={jest.fn()} />);
    expect(screen.getByText('No tasks in backlog')).toBeInTheDocument();
  });

  // Only shows backlog tasks (sprint_id = null)
  it('only shows tasks with null sprint_id', () => {
    const mixedTasks = [
      createMockTask({ id: 'task-1', title: 'Backlog task', sprint_id: null }),
      createMockTask({ id: 'task-2', title: 'Sprint task', sprint_id: 'sprint-1' }),
    ];
    render(<BacklogView tasks={mixedTasks} onDragStart={jest.fn()} />);
    expect(screen.getByText('Backlog task')).toBeInTheDocument();
    expect(screen.queryByText('Sprint task')).not.toBeInTheDocument();
  });

  // Sorting
  it('sorts by priority descending by default', () => {
    render(<BacklogView {...defaultProps} />);
    const taskElements = screen.getAllByText(/priority task/);
    expect(taskElements[0]).toHaveTextContent('High priority task');
    expect(taskElements[1]).toHaveTextContent('Medium priority task');
    expect(taskElements[2]).toHaveTextContent('Low priority task');
  });

  // Drag and drop
  it('calls onDragStart when dragging a task', () => {
    const onDragStart = jest.fn();
    render(<BacklogView tasks={mockTasks} onDragStart={onDragStart} />);
    
    const task = screen.getByText('High priority task').closest('[draggable]');
    fireEvent.dragStart(task!);
    
    expect(onDragStart).toHaveBeenCalledWith(expect.any(Object), 'task-1');
  });

  it('calls onDragOver when dragging over backlog', () => {
    const onDragOver = jest.fn();
    const { container } = render(
      <BacklogView {...defaultProps} onDragOver={onDragOver} />
    );
    
    const backlogContainer = container.firstChild;
    fireEvent.dragOver(backlogContainer!);
    
    expect(onDragOver).toHaveBeenCalled();
  });

  it('calls onDrop when dropping on backlog', () => {
    const onDrop = jest.fn();
    const { container } = render(
      <BacklogView {...defaultProps} onDrop={onDrop} />
    );
    
    const backlogContainer = container.firstChild;
    fireEvent.drop(backlogContainer!);
    
    expect(onDrop).toHaveBeenCalled();
  });

  it('applies drop target styling when isDropTarget is true', () => {
    const { container } = render(
      <BacklogView {...defaultProps} isDropTarget={true} />
    );
    
    const backlogContainer = container.firstChild;
    expect(backlogContainer).toHaveClass('border-blue-400');
  });

  // Footer stats
  it('shows high priority count in footer', () => {
    render(<BacklogView {...defaultProps} />);
    expect(screen.getByText('1 high priority')).toBeInTheDocument();
  });

  it('shows unassigned count in footer', () => {
    render(<BacklogView {...defaultProps} />);
    expect(screen.getByText('3 unassigned')).toBeInTheDocument();
  });

  // Assigned tasks display
  it('displays assignee for assigned tasks', () => {
    const tasksWithAssignee = [
      createMockTask({ 
        id: 'task-1', 
        title: 'Assigned task', 
        assigned_to: 'john@example.com' 
      }),
    ];
    render(<BacklogView tasks={tasksWithAssignee} onDragStart={jest.fn()} />);
    expect(screen.getByText('@john')).toBeInTheDocument();
  });

  // Task types
  it('displays correct task type labels', () => {
    const typeTasks = [
      createMockTask({ id: '1', task_type: 'development' }),
      createMockTask({ id: '2', task_type: 'research' }),
      createMockTask({ id: '3', task_type: 'documentation' }),
      createMockTask({ id: '4', task_type: 'business' }),
      createMockTask({ id: '5', task_type: 'marketing' }),
      createMockTask({ id: '6', task_type: 'other' }),
    ];
    render(<BacklogView tasks={typeTasks} onDragStart={jest.fn()} />);
    
    // Each type appears multiple times (task badge + filter dropdown)
    expect(screen.getAllByText('Development').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Research').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Docs').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Business').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Marketing').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Other').length).toBeGreaterThanOrEqual(1);
  });

  // Priority styling
  it('applies high priority styling for priority >= 8', () => {
    const highPriorityTasks = [
      createMockTask({ id: 'task-1', priority: 10 }),
    ];
    render(<BacklogView tasks={highPriorityTasks} onDragStart={jest.fn()} />);
    const priorityBadge = screen.getByText('P10');
    // Check parent has red styling
    expect(priorityBadge.className).toContain('red');
  });

  it('applies medium priority styling for priority 5-7', () => {
    const mediumPriorityTasks = [
      createMockTask({ id: 'task-1', priority: 6 }),
    ];
    render(<BacklogView tasks={mediumPriorityTasks} onDragStart={jest.fn()} />);
    const priorityBadge = screen.getByText('P6');
    expect(priorityBadge.className).toContain('amber');
  });

  it('applies low priority styling for priority < 5', () => {
    const lowPriorityTasks = [
      createMockTask({ id: 'task-1', priority: 3 }),
    ];
    render(<BacklogView tasks={lowPriorityTasks} onDragStart={jest.fn()} />);
    const priorityBadge = screen.getByText('P3');
    expect(priorityBadge.className).toContain('zinc');
  });

  // Edge cases
  it('handles empty tasks array', () => {
    render(<BacklogView tasks={[]} onDragStart={jest.fn()} />);
    expect(screen.getByText('No tasks in backlog')).toBeInTheDocument();
  });

  it('handles tasks with very long titles', () => {
    const longTitleTask = createMockTask({
      id: 'task-1',
      title: 'A'.repeat(200),
    });
    render(<BacklogView tasks={[longTitleTask]} onDragStart={jest.fn()} />);
    // Title should be in the document (truncation happens via CSS)
    expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
  });

  it('handles tasks with all task types', () => {
    const allTypeTasks = (
      ['development', 'research', 'design', 'testing', 'documentation', 'business', 'marketing', 'other'] as const
    ).map((type, i) => createMockTask({ id: `task-${i}`, task_type: type }));
    
    render(<BacklogView tasks={allTypeTasks} onDragStart={jest.fn()} />);
    expect(screen.getByText('(8)')).toBeInTheDocument();
  });
});
