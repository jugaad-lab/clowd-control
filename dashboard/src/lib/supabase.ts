import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Types for our database

// Phase 4: Skill levels and complexity
export type SkillLevel = 'junior' | 'mid' | 'senior' | 'lead';
export type TaskComplexity = 'simple' | 'medium' | 'complex' | 'critical';

// Execution mode settings
export type ExecutionMode = 'manual' | 'full_speed' | 'background';
export type SprintApproval = 'required' | 'auto';

export interface NotificationTypes {
  task_started: boolean;
  mode_changed: boolean;
  bug_reported: boolean;
  task_completed: boolean;
  sprint_completed: boolean;
}

export const DEFAULT_NOTIFICATION_TYPES: NotificationTypes = {
  task_started: true,
  mode_changed: true,
  bug_reported: true,
  task_completed: true,
  sprint_completed: true,
};

export interface ProjectSettings {
  require_dual_pm_consensus: boolean;
  max_debate_rounds: number;
  auto_flag_instant_consensus: boolean;
  notify_channel: string | null;
  execution_mode: ExecutionMode;
  sprint_approval: SprintApproval;
  budget_limit_per_sprint: number | null;
  notification_webhook_url: string | null;
  notification_types: NotificationTypes;
}

// Phase 5: Shadowing modes
export type ShadowingMode = 'none' | 'recommended' | 'required';

// Phase 6: Review status
export type ReviewStatus = 'not_required' | 'pending' | 'approved' | 'changes_requested';

// Phase 5: Task dependencies
export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

export type InvocationMethod = 'sessions_spawn' | 'claude_code' | 'custom';

export interface InvocationConfig {
  model?: string;
  thinking?: string;
  allowedTools?: string[];
  tools?: string[];
  [key: string]: unknown;
}

export interface Agent {
  id: string;
  display_name: string;
  role: string;
  mcu_codename: string;
  agent_type: 'pm' | 'specialist';
  capabilities: string[];
  is_active: boolean;
  last_seen: string | null;
  skill_level: SkillLevel;
  model: string;
  invocation_method: InvocationMethod | null;
  invocation_config: InvocationConfig | null;
  discord_user_id?: string | null; // For @mentions in notifications
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  owner_type: 'human' | 'agent' | 'team';
  owner_ids: string[];
  owner_id: string; // Primary owner
  current_pm_id: string | null;
  created_at: string;
  updated_at: string;
  deadline: string | null;
  tags: string[];
  settings: ProjectSettings;
  token_budget: number;
  tokens_used: number;
  visibility: 'public' | 'private';
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  invited_by: string | null;
  joined_at: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  full_name?: string | null; // alias for display_name compatibility
  avatar_url: string | null;
  role: 'admin' | 'user';
  created_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  number: number;
  acceptance_criteria: Array<{
    id: string;
    description: string;
    verified: boolean;
    verified_by: string | null;
  }>;
  status: 'planned' | 'active' | 'review' | 'completed';
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  sprint_id: string | null;
  title: string;
  description: string | null;
  task_type: 'development' | 'research' | 'design' | 'testing' | 'bug' | 'documentation' | 'business' | 'marketing' | 'other';
  acceptance_criteria: string[] | null;
  status: 'backlog' | 'assigned' | 'in_progress' | 'blocked' | 'waiting_human' | 'review' | 'done' | 'cancelled';
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  priority: number;
  deadline: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  notes: string | null;
  complexity: TaskComplexity;
  tokens_consumed: number;
  estimated_tokens: number | null;
  // Phase 5: Shadowing
  shadowing: ShadowingMode;
  // Phase 6: Review workflow
  requires_review: boolean;
  reviewer_id: string | null;
  review_status: ReviewStatus;
  review_notes: string | null;
}

export interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  agent_id: string | null;
  human_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export type ProposalStatus = 'open' | 'debating' | 'consensus' | 'escalated' | 'approved' | 'rejected';
export type ProposalType = 'task_creation' | 'sprint_plan' | 'architecture_decision' | 'resource_allocation' | 'priority_change' | 'other';
export type VoteType = 'approve' | 'reject' | 'abstain';
export type SycophancyIndicator = 'instant_high_consensus' | 'echo_language' | 'flip_without_reasoning' | 'no_substantive_concerns' | 'copied_conclusion';

export interface Proposal {
  id: string;
  project_id: string;
  proposal_type: ProposalType;
  title: string;
  content: Record<string, unknown>;
  proposed_by: string | null;
  proposed_at: string;
  status: ProposalStatus;
  resolved_at: string | null;
  resolution_notes: string | null;
  final_decision: Record<string, unknown> | null;
  // Phase 6: Outcome tracking for debates
  outcome_worked: boolean | null;
  outcome_tagged_at: string | null;
  outcome_tagged_by: string | null;
}

export interface IndependentOpinion {
  id: string;
  proposal_id: string;
  agent_id: string;
  opinion: {
    vote: VoteType;
    reasoning: string;
    concerns: string[];
  };
  confidence: number;
  generated_at: string;
  saw_other_opinions_at: string | null;
}

export interface Critique {
  id: string;
  proposal_id: string;
  critic_agent_id: string;
  target_agent_id: string;
  concerns: string[];
  suggestions: string[] | null;
  agrees_after_concerns: boolean | null;
  agreement_reasoning: string | null;
  created_at: string;
}

export interface DebateRound {
  id: string;
  proposal_id: string;
  round_number: number;
  agent_id: string;
  position: string;
  reasoning: string;
  confidence: number;
  created_at: string;
}

export interface SycophancyFlag {
  id: string;
  proposal_id: string;
  indicator_type: SycophancyIndicator;
  details: Record<string, unknown> | null;
  detected_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  was_false_positive: boolean | null;
  resolution_notes: string | null;
}

// Agent Session tracking
export interface AgentSession {
  id: string;
  agent_id: string;
  session_key: string;
  task_id: string | null;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  started_at: string;
  completed_at: string | null;
  result_summary: string | null;
  tokens_used: number;
  created_at: string;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Returns the correct client for the current context:
// - Browser: SSR-aware client with auth cookies (RLS sees auth.uid())
// - Server (API routes): service role client (bypasses RLS for backend operations)
// createBrowserClient is a singleton — safe to call repeatedly.
function getClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  // Server-side: use service role key if available (bypasses RLS for API routes)
  if (supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey);
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Proxy ensures every property access goes through the correct client
// for the current context — evaluated at call time, not module load time.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// Helper functions
export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Project[];
}

export async function getProject(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Project;
}

export async function getProjectTasks(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('priority', { ascending: false });
  
  if (error) throw error;
  return data as Task[];
}

export async function getProjectSprints(projectId: string) {
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .order('number', { ascending: true });
  
  if (error) throw error;
  return data as Sprint[];
}

export async function getAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('agent_type', { ascending: true });
  
  if (error) throw error;
  return data as Agent[];
}

export async function getSpecialistAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('agent_type', 'specialist')
    .eq('is_active', true)
    .order('display_name', { ascending: true });

  if (error) throw error;
  return data as Agent[];
}

export async function getAgentById(agentId: string) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (error) throw error;
  return data as Agent;
}

export async function getRecentActivity(limit = 20) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data as ActivityLog[];
}

export async function updateTaskStatus(taskId: string, status: Task['status']) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single();
  
  if (error) throw error;
  return data as Task;
}

// Real-time subscription helpers
export function subscribeToTasks(projectId: string, callback: (task: Task) => void) {
  return supabase
    .channel(`tasks:${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => callback(payload.new as Task)
    )
    .subscribe();
}

export function subscribeToActivity(callback: (activity: ActivityLog) => void) {
  return supabase
    .channel('activity_log')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_log',
      },
      (payload) => callback(payload.new as ActivityLog)
    )
    .subscribe();
}

export async function createSprint(sprint: {
  project_id: string;
  name: string;
  number: number;
  status: Sprint['status'];
  planned_start: string | null;
  planned_end: string | null;
}) {
  const { data, error } = await supabase
    .from('sprints')
    .insert({
      ...sprint,
      acceptance_criteria: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as Sprint;
}

export async function updateTaskSprint(taskId: string, sprintId: string | null) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ sprint_id: sprintId, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

// Proposal helpers
export async function getProjectProposals(projectId: string) {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('project_id', projectId)
    .order('proposed_at', { ascending: false });

  if (error) throw error;
  return data as Proposal[];
}

export async function createProposal(proposal: {
  project_id: string;
  proposal_type: ProposalType;
  title: string;
  content: Record<string, unknown>;
  proposed_by: string | null;
}) {
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      ...proposal,
      status: 'open',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Proposal;
}

export async function getProposalOpinions(proposalId: string) {
  const { data, error } = await supabase
    .from('independent_opinions')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('generated_at', { ascending: true });

  if (error) throw error;
  return data as IndependentOpinion[];
}

export async function submitOpinion(opinion: {
  proposal_id: string;
  agent_id: string;
  opinion: { vote: VoteType; reasoning: string; concerns: string[] };
  confidence: number;
}) {
  const { data, error } = await supabase
    .from('independent_opinions')
    .insert(opinion)
    .select()
    .single();

  if (error) throw error;
  return data as IndependentOpinion;
}

export async function getDebateRounds(proposalId: string) {
  const { data, error } = await supabase
    .from('debate_rounds')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('round_number', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as DebateRound[];
}

export async function createDebateRound(round: {
  proposal_id: string;
  round_number: number;
  agent_id: string;
  position: string;
  reasoning: string;
  confidence: number;
}) {
  const { data, error } = await supabase
    .from('debate_rounds')
    .insert(round)
    .select()
    .single();

  if (error) throw error;
  return data as DebateRound;
}

export async function getSycophancyFlags(proposalId: string) {
  const { data, error } = await supabase
    .from('sycophancy_flags')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('detected_at', { ascending: false });

  if (error) throw error;
  return data as SycophancyFlag[];
}

export async function updateProposalStatus(proposalId: string, status: ProposalStatus) {
  const { data, error } = await supabase
    .from('proposals')
    .update({
      status,
      resolved_at: ['consensus', 'escalated', 'approved', 'rejected'].includes(status)
        ? new Date().toISOString()
        : null
    })
    .eq('id', proposalId)
    .select()
    .single();

  if (error) throw error;
  return data as Proposal;
}

// ============================================
// Phase 5: Task Dependencies
// ============================================

export async function getTaskDependencies(projectId: string) {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select(`
      *,
      task:tasks!task_dependencies_task_id_fkey(id, title, status, project_id),
      depends_on:tasks!task_dependencies_depends_on_task_id_fkey(id, title, status, project_id)
    `)
    .eq('task.project_id', projectId);

  if (error) throw error;
  return data as TaskDependency[];
}

export async function addTaskDependency(taskId: string, dependsOnTaskId: string) {
  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId })
    .select()
    .single();

  if (error) throw error;
  return data as TaskDependency;
}

export async function removeTaskDependency(taskId: string, dependsOnTaskId: string) {
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('task_id', taskId)
    .eq('depends_on_task_id', dependsOnTaskId);

  if (error) throw error;
}

export async function getTaskDependenciesForTask(taskId: string) {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('*')
    .or(`task_id.eq.${taskId},depends_on_task_id.eq.${taskId}`);

  if (error) throw error;
  return data as TaskDependency[];
}

// ============================================
// Phase 6: Review Workflow
// ============================================

export async function getReviewQueue(reviewerId?: string) {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('requires_review', true)
    .eq('review_status', 'pending')
    .order('updated_at', { ascending: false });

  if (reviewerId) {
    query = query.eq('reviewer_id', reviewerId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Task[];
}

export async function updateTaskReview(
  taskId: string,
  reviewStatus: ReviewStatus,
  reviewNotes?: string
) {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      review_status: reviewStatus,
      review_notes: reviewNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function assignReviewer(taskId: string, reviewerId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      reviewer_id: reviewerId,
      requires_review: true,
      review_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

// ============================================
// Phase 6: Debate Outcome Tracking
// ============================================

export async function tagDebateOutcome(
  proposalId: string,
  worked: boolean,
  taggedBy: string
) {
  const { data, error } = await supabase
    .from('proposals')
    .update({
      outcome_worked: worked,
      outcome_tagged_at: new Date().toISOString(),
      outcome_tagged_by: taggedBy,
    })
    .eq('id', proposalId)
    .select()
    .single();

  if (error) throw error;
  return data as Proposal;
}

export async function getDebateHistory(projectId?: string) {
  let query = supabase
    .from('proposals')
    .select('*')
    .in('status', ['consensus', 'approved', 'rejected'])
    .order('resolved_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Proposal[];
}

// ============================================
// Agent Session Management
// ============================================

export async function createAgentSession(session: {
  agent_id: string;
  session_key: string;
  task_id?: string;
}) {
  const { data, error } = await supabase
    .from('agent_sessions')
    .insert({
      agent_id: session.agent_id,
      session_key: session.session_key,
      task_id: session.task_id || null,
      status: 'running',
    })
    .select()
    .single();

  if (error) throw error;
  return data as AgentSession;
}

export async function getAgentSessions(agentId?: string) {
  let query = supabase
    .from('agent_sessions')
    .select('*')
    .order('started_at', { ascending: false });

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as AgentSession[];
}

export async function updateAgentSession(
  sessionId: string, 
  updates: {
    status?: 'running' | 'completed' | 'failed' | 'timeout';
    result_summary?: string;
    tokens_used?: number;
  }
) {
  const updateData: typeof updates & { completed_at?: string } = { ...updates };
  
  if (updates.status && updates.status !== 'running') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('agent_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data as AgentSession;
}

export async function createTask(task: {
  project_id: string;
  title: string;
  description?: string;
  task_type: Task['task_type'];
  priority: number;
  created_by: string;
  sprint_id?: string | null;
  acceptance_criteria: string[];
  tags?: string[];
}) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: task.project_id,
      title: task.title,
      description: task.description || null,
      task_type: task.task_type,
      priority: task.priority,
      created_by: task.created_by,
      sprint_id: task.sprint_id || null,
      acceptance_criteria: task.acceptance_criteria,
      status: 'backlog',
      complexity: 'medium', // default
      tokens_consumed: 0,
      shadowing: 'none', // default
      requires_review: false, // default
      review_status: 'not_required', // default
    })
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

// ============================================
// Human Attention Queue
// ============================================

export async function getHumanAttentionTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(name, id)
    `)
    .in('status', ['waiting_human', 'blocked'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as (Task & { project: { name: string; id: string } })[];
}

// ============================================
// Project Settings & Execution Mode
// ============================================

export async function getProjectSettings(projectId: string): Promise<ProjectSettings> {
  const { data, error } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', projectId)
    .single();

  if (error) throw error;
  return data.settings as ProjectSettings;
}

export async function updateProjectSettings(
  projectId: string,
  settings: Partial<ProjectSettings>
): Promise<void> {
  // First get current settings
  const currentProject = await getProject(projectId);
  
  // Merge with new settings
  const updatedSettings = {
    ...currentProject.settings,
    ...settings,
  };

  const { error } = await supabase
    .from('projects')
    .update({
      settings: updatedSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) throw error;
}

// ============================================
// Project Visibility & Member Management
// ============================================

export async function updateProjectVisibility(
  projectId: string,
  visibility: 'public' | 'private'
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({
      visibility,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) throw error;
}

export async function getProjectMembers(projectId: string): Promise<(ProjectMember & { profile: Profile })[]> {
  // Get members first
  const { data: members, error: membersError } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (membersError) throw membersError;
  if (!members || members.length === 0) return [];

  // Then get profiles for those user_ids
  const userIds = members.map(m => m.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url')
    .in('id', userIds);

  if (profilesError) throw profilesError;

  // Join them manually
  const profileMap = new Map((profiles || []).map(p => [p.id, p]));
  return members.map(m => ({
    ...m,
    profile: profileMap.get(m.user_id) || { id: m.user_id, email: 'unknown', display_name: null, avatar_url: null },
  })) as (ProjectMember & { profile: Profile })[];
}

export async function getAvailableUsers(projectId: string): Promise<Profile[]> {
  // Get current member user_ids first
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId);

  const memberIds = (members || []).map(m => m.user_id);

  // Get all profiles, then filter out existing members
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, role, created_at');

  if (error) throw error;

  // Filter out users who are already members
  return (profiles || []).filter(p => !memberIds.includes(p.id)) as Profile[];
}

export async function addProjectMember(member: {
  project_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  invited_by?: string;
}): Promise<ProjectMember> {
  const { data, error } = await supabase
    .from('project_members')
    .insert({
      ...member,
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as ProjectMember;
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function updateMemberRole(
  projectId: string,
  userId: string,
  role: 'admin' | 'member' | 'viewer'
): Promise<ProjectMember> {
  const { data, error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as ProjectMember;
}

export async function startNextTask(projectId: string): Promise<Task | null> {
  // Find the highest priority backlog task in the active sprint
  const { data: sprints } = await supabase
    .from('sprints')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .order('number', { ascending: false })
    .limit(1);

  const activeSprint = sprints?.[0];
  if (!activeSprint) {
    throw new Error('No active sprint found');
  }

  // Get highest priority backlog task in active sprint
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('sprint_id', activeSprint.id)
    .eq('status', 'backlog')
    .order('priority', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No tasks found
      return null;
    }
    throw error;
  }

  // Update task status to assigned
  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'assigned',
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Log the activity
  await supabase
    .from('activity_log')
    .insert({
      action: 'start_task_requested',
      entity_type: 'task',
      entity_id: task.id,
      details: {
        project_id: projectId,
        task_title: task.title,
      },
    });

  return updatedTask as Task;
}
