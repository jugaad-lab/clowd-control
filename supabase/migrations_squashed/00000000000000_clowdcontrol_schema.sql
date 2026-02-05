-- ============================================
-- ClowdControl Complete Schema
-- Single squashed migration for new deployments
-- 
-- Created: 2026-02-05
-- Version: 1.0.0
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CUSTOM TYPES
-- ============================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_level') THEN
        CREATE TYPE skill_level AS ENUM ('junior', 'mid', 'senior', 'lead');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_complexity') THEN
        CREATE TYPE task_complexity AS ENUM ('simple', 'medium', 'complex', 'critical');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shadowing_mode') THEN
        CREATE TYPE shadowing_mode AS ENUM ('none', 'recommended', 'required');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE review_status AS ENUM ('not_required', 'pending', 'approved', 'changes_requested');
    END IF;
END $$;

-- ============================================
-- CORE TABLES
-- ============================================

-- Owners (humans who control agents)
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discord_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents (AI assistants)
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    discord_id TEXT UNIQUE,
    discord_user_id TEXT,
    name TEXT NOT NULL,
    emoji TEXT,
    description TEXT,
    capabilities JSONB DEFAULT '[]',
    skills_offered JSONB DEFAULT '[]',
    invocation_config JSONB,
    skill_level skill_level DEFAULT 'mid',
    model TEXT DEFAULT 'anthropic/claude-sonnet-4-5',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'online', 'idle', 'busy', 'offline')),
    last_seen_at TIMESTAMPTZ,
    last_heartbeat TIMESTAMPTZ,
    comms_endpoint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_id);
CREATE INDEX IF NOT EXISTS idx_agents_discord ON agents(discord_id);
CREATE INDEX IF NOT EXISTS idx_agents_discord_user_id ON agents(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_agents_heartbeat ON agents(last_heartbeat) WHERE last_heartbeat IS NOT NULL;

-- Profiles (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'member', 'viewer')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- TRUST & PERMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS trust_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    trusted_entity_type TEXT NOT NULL CHECK (trusted_entity_type IN ('owner', 'agent')),
    trusted_entity_id UUID NOT NULL,
    tier INTEGER NOT NULL CHECK (tier BETWEEN 2 AND 3),
    approved_by UUID REFERENCES owners(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE (agent_id, trusted_entity_type, trusted_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_trust_agent ON trust_relationships(agent_id);

-- ============================================
-- PROJECTS
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'archived')),
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'team')),
    owner_id UUID REFERENCES auth.users(id),
    current_pm_id TEXT REFERENCES agents(id),
    discord_channel_id TEXT,
    discord_webhook_url TEXT,
    repository_url TEXT,
    deadline TIMESTAMPTZ,
    token_budget INTEGER DEFAULT 1000000,
    tokens_used INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{"execution_mode": "manual", "sprint_approval": "required", "budget_limit_per_sprint": null}'::jsonb,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);

-- Project Owners (many-to-many)
CREATE TABLE IF NOT EXISTS project_owners (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'member', 'observer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, owner_id)
);

-- Project Members (access control)
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'member', 'viewer')),
    added_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- Agent Assignments
CREATE TABLE IF NOT EXISTS agent_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    responsibilities TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES owners(id),
    UNIQUE (project_id, agent_id, role)
);

CREATE INDEX IF NOT EXISTS idx_assignments_project ON agent_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_assignments_agent ON agent_assignments(agent_id);

-- ============================================
-- SPRINTS
-- ============================================

CREATE TABLE IF NOT EXISTS sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal TEXT,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    sprint_number INTEGER,
    start_date DATE,
    end_date DATE,
    actual_end TIMESTAMPTZ,
    acceptance_criteria TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);

-- Sprint Closing Reports
CREATE TABLE IF NOT EXISTS sprint_closing_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    report_text TEXT NOT NULL,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    tasks_cancelled INTEGER NOT NULL DEFAULT 0,
    closed_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sprint_closing_reports_sprint ON sprint_closing_reports(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_closing_reports_created ON sprint_closing_reports(created_at);

-- ============================================
-- TASKS
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT DEFAULT 'development' CHECK (task_type IN ('development', 'bug', 'feature', 'research', 'design', 'documentation')),
    status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'assigned', 'in_progress', 'blocked', 'waiting_human', 'review', 'done', 'cancelled')),
    priority INTEGER DEFAULT 2,
    complexity task_complexity DEFAULT 'medium',
    acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    assigned_to TEXT REFERENCES agents(id),
    assigned_by TEXT,
    assigned_at TIMESTAMPTZ,
    created_by TEXT,
    deadline TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    order_in_sprint INTEGER,
    estimated_hours NUMERIC,
    actual_hours NUMERIC,
    tokens_consumed INTEGER DEFAULT 0,
    depends_on UUID[],
    blocks UUID[],
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    shadowing shadowing_mode DEFAULT 'none',
    requires_review BOOLEAN DEFAULT FALSE,
    reviewer_id TEXT REFERENCES agents(id),
    review_status review_status DEFAULT 'not_required',
    review_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_human_attention ON tasks(status) WHERE status IN ('waiting_human', 'blocked');

-- Task Dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- Task Updates
CREATE TABLE IF NOT EXISTS task_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES owners(id) ON DELETE SET NULL,
    update_type TEXT DEFAULT 'comment' CHECK (update_type IN ('comment', 'status_change', 'assignment', 'progress', 'blocker', 'resolution')),
    content TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_updates_task ON task_updates(task_id);

-- ============================================
-- AGENT COMMUNICATION
-- ============================================

-- Task Handoffs
CREATE TABLE IF NOT EXISTS task_handoffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_agent TEXT NOT NULL REFERENCES agents(id),
    to_agent TEXT REFERENCES agents(id),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical', 'medium', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'in_progress', 'completed', 'failed', 'cancelled', 'done')),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    context JSONB DEFAULT '{}',
    payload JSONB DEFAULT '{}',
    result TEXT,
    result_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handoffs_to_agent ON task_handoffs(to_agent, status);
CREATE INDEX IF NOT EXISTS idx_handoffs_from_agent ON task_handoffs(from_agent);
CREATE INDEX IF NOT EXISTS idx_handoffs_status ON task_handoffs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_handoffs_project ON task_handoffs(project_id);

-- Agent Messages
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_agent TEXT NOT NULL REFERENCES agents(id),
    to_agent TEXT REFERENCES agents(id),
    message_type TEXT NOT NULL CHECK (message_type IN (
        'chat', 'task_update', 'status', 'debate', 'vote', 
        'system', 'task_notification', 'ack', 'hidden_plan'
    )),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    thread_id UUID REFERENCES agent_messages(id),
    reply_to UUID REFERENCES agent_messages(id),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    channel TEXT,
    acked BOOLEAN DEFAULT FALSE,
    acked_at TIMESTAMPTZ,
    ack_response TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_to_agent ON agent_messages(to_agent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from_agent ON agent_messages(from_agent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON agent_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_unacked ON agent_messages(to_agent, acked) WHERE acked = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_project ON agent_messages(project_id);

-- Agent Sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT REFERENCES agents(id),
    session_key TEXT NOT NULL,
    task_id UUID REFERENCES tasks(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'disconnected', 'running', 'completed', 'failed', 'timeout')),
    result_summary TEXT,
    tokens_used INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent ON agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_started_at ON agent_sessions(started_at);

-- Agent Presence
CREATE TABLE IF NOT EXISTS agent_presence (
    agent_id TEXT PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'busy', 'away', 'offline')),
    status_message TEXT,
    current_task_id UUID REFERENCES tasks(id),
    current_project_id UUID REFERENCES projects(id),
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    available_for TEXT[] DEFAULT '{}'
);

-- Agent Notification Prefs
CREATE TABLE IF NOT EXISTS agent_notification_prefs (
    agent_id TEXT PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    discord_dm BOOLEAN DEFAULT TRUE,
    discord_channel BOOLEAN DEFAULT TRUE,
    webhook_url TEXT,
    notify_on_task_assign BOOLEAN DEFAULT TRUE,
    notify_on_message BOOLEAN DEFAULT TRUE,
    notify_on_mention BOOLEAN DEFAULT TRUE,
    notify_on_deadline BOOLEAN DEFAULT TRUE,
    quiet_start TIME,
    quiet_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Conversations
CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    discord_channel_id TEXT,
    discord_thread_id TEXT,
    topic TEXT,
    participants UUID[] DEFAULT '{}',
    turn_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'escalated', 'completed')),
    escalation_reason TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversations_project ON agent_conversations(project_id);

-- ============================================
-- GOVERNANCE
-- ============================================

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    proposer_id TEXT REFERENCES agents(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'accepted', 'rejected')),
    outcome_worked BOOLEAN,
    outcome_tagged_at TIMESTAMPTZ,
    outcome_tagged_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Debate Rounds
CREATE TABLE IF NOT EXISTS debate_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    position TEXT NOT NULL CHECK (position IN ('for', 'against', 'neutral')),
    argument TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Independent Opinions
CREATE TABLE IF NOT EXISTS independent_opinions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    opinion TEXT NOT NULL,
    confidence NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critiques
CREATE TABLE IF NOT EXISTS critiques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    critique_type TEXT NOT NULL,
    content TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sycophancy Flags
CREATE TABLE IF NOT EXISTS sycophancy_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT NOT NULL REFERENCES agents(id),
    context_id UUID,
    flag_type TEXT NOT NULL,
    evidence TEXT,
    flagged_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTIVITY & ARTIFACTS
-- ============================================

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES owners(id) ON DELETE SET NULL,
    entity_id TEXT,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'task_created', 'task_updated', 'task_completed',
        'proposal_submitted', 'proposal_reviewed',
        'debate_started', 'opinion_submitted', 'debate_concluded',
        'agent_joined', 'agent_left',
        'sprint_started', 'sprint_completed',
        'sycophancy_flagged', 'trust_changed',
        'comment', 'mention', 'escalation'
    )),
    target_type TEXT,
    target_id UUID,
    summary TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- Shared Artifacts
CREATE TABLE IF NOT EXISTS shared_artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    artifact_type TEXT NOT NULL CHECK (artifact_type IN (
        'document', 'code', 'image', 'data', 'config', 'log', 'other'
    )),
    storage_bucket TEXT DEFAULT 'artifacts',
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    created_by TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    visibility TEXT DEFAULT 'project' CHECK (visibility IN ('private', 'project', 'tribe', 'public')),
    shared_with TEXT[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES shared_artifacts(id),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_project ON shared_artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_by ON shared_artifacts(created_by);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON shared_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_artifacts_visibility ON shared_artifacts(visibility);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS owners_updated_at ON owners;
CREATE TRIGGER owners_updated_at BEFORE UPDATE ON owners FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS agents_updated_at ON agents;
CREATE TRIGGER agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS sprints_updated_at ON sprints;
CREATE TRIGGER sprints_updated_at BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS proposals_updated_at ON proposals;
CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-set completed_at when task marked done
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'done' AND OLD.status != 'done' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'done' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_completed_at ON tasks;
CREATE TRIGGER tasks_completed_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Notify on task handoff
CREATE OR REPLACE FUNCTION notify_agent_on_task_handoff()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.to_agent IS NOT NULL THEN
        INSERT INTO agent_messages (
            from_agent, to_agent, message_type, content, metadata
        ) VALUES (
            NEW.from_agent,
            NEW.to_agent,
            'task_notification',
            'New task assigned: ' || NEW.title || ' (priority: ' || COALESCE(NEW.priority, 'medium') || ')',
            jsonb_build_object(
                'task_handoff_id', NEW.id,
                'task_title', NEW.title,
                'task_priority', COALESCE(NEW.priority, 'medium'),
                'task_status', NEW.status,
                'auto_generated', true
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_handoff_notify ON task_handoffs;
CREATE TRIGGER task_handoff_notify
    AFTER INSERT ON task_handoffs
    FOR EACH ROW EXECUTE FUNCTION notify_agent_on_task_handoff();

-- Notify on task reassignment
CREATE OR REPLACE FUNCTION notify_agent_on_task_reassign()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.to_agent IS DISTINCT FROM OLD.to_agent AND NEW.to_agent IS NOT NULL THEN
        INSERT INTO agent_messages (
            from_agent, to_agent, message_type, content, metadata
        ) VALUES (
            COALESCE(NEW.from_agent, 'system'),
            NEW.to_agent,
            'task_notification',
            'Task reassigned to you: ' || NEW.title,
            jsonb_build_object(
                'task_handoff_id', NEW.id,
                'task_title', NEW.title,
                'previous_agent', OLD.to_agent,
                'auto_generated', true
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_handoff_reassign_notify ON task_handoffs;
CREATE TRIGGER task_handoff_reassign_notify
    AFTER UPDATE ON task_handoffs
    FOR EACH ROW EXECUTE FUNCTION notify_agent_on_task_reassign();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on user-facing tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_closing_reports ENABLE ROW LEVEL SECURITY;

-- Enable RLS on agent tables (permissive for bots)
ALTER TABLE task_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE independent_opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE critiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE sycophancy_flags ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES — Profiles
-- ============================================

DROP POLICY IF EXISTS "profiles_viewable" ON profiles;
CREATE POLICY "profiles_viewable" ON profiles
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

-- ============================================
-- RLS POLICIES — Project Members (base for others)
-- ============================================

DROP POLICY IF EXISTS "members_viewable" ON project_members;
CREATE POLICY "members_viewable" ON project_members
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

DROP POLICY IF EXISTS "admins_manage_members" ON project_members;
CREATE POLICY "admins_manage_members" ON project_members
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- ============================================
-- RLS POLICIES — Projects
-- ============================================

DROP POLICY IF EXISTS "users_view_projects" ON projects;
CREATE POLICY "users_view_projects" ON projects
    FOR SELECT TO authenticated
    USING (
        owner_id = auth.uid()
        OR visibility = 'public'
        OR EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = projects.id
            AND pm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "admins_modify_projects" ON projects;
CREATE POLICY "admins_modify_projects" ON projects
    FOR ALL TO authenticated
    USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES — Tasks
-- ============================================

DROP POLICY IF EXISTS "users_view_tasks" ON tasks;
CREATE POLICY "users_view_tasks" ON tasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = tasks.project_id
            AND (
                p.owner_id = auth.uid()
                OR p.visibility = 'public'
                OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "members_modify_tasks" ON tasks;
CREATE POLICY "members_modify_tasks" ON tasks
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid() AND pm.role IN ('admin', 'member'))
    );

DROP POLICY IF EXISTS "members_update_tasks" ON tasks;
CREATE POLICY "members_update_tasks" ON tasks
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid() AND pm.role IN ('admin', 'member'))
    );

DROP POLICY IF EXISTS "members_delete_tasks" ON tasks;
CREATE POLICY "members_delete_tasks" ON tasks
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid() AND pm.role IN ('admin', 'member'))
    );

-- ============================================
-- RLS POLICIES — Sprints
-- ============================================

DROP POLICY IF EXISTS "users_view_sprints" ON sprints;
CREATE POLICY "users_view_sprints" ON sprints
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = sprints.project_id
            AND (
                p.owner_id = auth.uid()
                OR p.visibility = 'public'
                OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "members_modify_sprints" ON sprints;
CREATE POLICY "members_modify_sprints" ON sprints
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = sprints.project_id AND pm.user_id = auth.uid() AND pm.role IN ('admin', 'member'))
    );

DROP POLICY IF EXISTS "members_update_sprints" ON sprints;
CREATE POLICY "members_update_sprints" ON sprints
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = sprints.project_id AND pm.user_id = auth.uid() AND pm.role IN ('admin', 'member'))
    );

DROP POLICY IF EXISTS "members_delete_sprints" ON sprints;
CREATE POLICY "members_delete_sprints" ON sprints
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = sprints.project_id AND pm.user_id = auth.uid() AND pm.role IN ('admin', 'member'))
    );

-- ============================================
-- RLS POLICIES — Proposals
-- ============================================

DROP POLICY IF EXISTS "users_view_proposals" ON proposals;
CREATE POLICY "users_view_proposals" ON proposals
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = proposals.project_id
            AND (
                p.owner_id = auth.uid()
                OR p.visibility = 'public'
                OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "members_modify_proposals" ON proposals;
CREATE POLICY "members_modify_proposals" ON proposals
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = proposals.project_id AND pm.user_id = auth.uid() AND pm.role IN ('admin', 'member'))
    );

DROP POLICY IF EXISTS "members_update_proposals" ON proposals;
CREATE POLICY "members_update_proposals" ON proposals
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = proposals.project_id AND pm.user_id = auth.uid() AND pm.role IN ('admin', 'member'))
    );

-- ============================================
-- RLS POLICIES — Activity Log
-- ============================================

DROP POLICY IF EXISTS "users_view_activity" ON activity_log;
CREATE POLICY "users_view_activity" ON activity_log
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "anyone_insert_activity" ON activity_log;
CREATE POLICY "anyone_insert_activity" ON activity_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ============================================
-- RLS POLICIES — Sprint Reports
-- ============================================

DROP POLICY IF EXISTS "Allow all for authenticated" ON sprint_closing_reports;
CREATE POLICY "Allow all for authenticated" ON sprint_closing_reports
    FOR ALL USING (true);

-- ============================================
-- RLS POLICIES — Agent Tables (permissive)
-- ============================================

DROP POLICY IF EXISTS "Allow all on task_handoffs" ON task_handoffs;
CREATE POLICY "Allow all on task_handoffs" ON task_handoffs
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on agent_messages" ON agent_messages;
CREATE POLICY "Allow all on agent_messages" ON agent_messages
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access on agent_sessions" ON agent_sessions;
CREATE POLICY "Enable all access on agent_sessions" ON agent_sessions
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON debate_rounds;
CREATE POLICY "Allow all for authenticated" ON debate_rounds
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON independent_opinions;
CREATE POLICY "Allow all for authenticated" ON independent_opinions
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON critiques;
CREATE POLICY "Allow all for authenticated" ON critiques
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON sycophancy_flags;
CREATE POLICY "Allow all for authenticated" ON sycophancy_flags
    FOR ALL USING (true);

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL ON task_handoffs TO authenticated, anon;
GRANT ALL ON agent_messages TO authenticated, anon;
GRANT ALL ON shared_artifacts TO authenticated, anon;
GRANT ALL ON agent_presence TO authenticated, anon;
GRANT ALL ON agent_notification_prefs TO authenticated, anon;
GRANT SELECT ON agents TO authenticated, anon;
GRANT SELECT ON agent_sessions TO authenticated, anon;
GRANT SELECT ON independent_opinions TO authenticated, anon;
GRANT SELECT ON critiques TO authenticated, anon;
GRANT SELECT ON debate_rounds TO authenticated, anon;
GRANT SELECT ON sycophancy_flags TO authenticated, anon;
GRANT SELECT ON task_dependencies TO authenticated, anon;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE agents IS 'AI agents belonging to owners. id is text (e.g., ''chhotu'') for easy reference.';
COMMENT ON TABLE task_handoffs IS 'Async task queue between agents (AgentComms protocol).';
COMMENT ON TABLE agent_messages IS 'Persistent messaging between agents.';
COMMENT ON TABLE proposals IS 'Formal proposals for governance decisions.';
COMMENT ON COLUMN projects.settings IS 'JSONB: execution_mode (manual|full_speed|background), sprint_approval (required|auto), budget_limit_per_sprint';
COMMENT ON COLUMN tasks.acceptance_criteria IS 'Required JSONB array of acceptance criteria for the task.';
COMMENT ON COLUMN agents.invocation_config IS 'Model and tool config for spawning this agent. E.g., {"model": "anthropic/claude-sonnet-4-5", "thinking": "low"}';
