-- ClowdControl Initial Schema
-- Multi-agent coordination database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE ENTITIES
-- ============================================

-- Owners (humans who own agents)
CREATE TABLE owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discord_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents (AI assistants belonging to owners)
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    discord_id TEXT UNIQUE,
    name TEXT NOT NULL,
    emoji TEXT,
    description TEXT,
    capabilities JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_owner ON agents(owner_id);
CREATE INDEX idx_agents_discord ON agents(discord_id);

-- ============================================
-- TRUST & PERMISSIONS
-- ============================================

-- Trust Tiers (Tribe Protocol)
-- Tier 4 = My Human (owner relationship, not stored here)
-- Tier 3 = Tribe
-- Tier 2 = Acquaintance
-- Tier 1 = Stranger (default, not stored)

CREATE TABLE trust_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    trusted_entity_type TEXT NOT NULL CHECK (trusted_entity_type IN ('owner', 'agent')),
    trusted_entity_id UUID NOT NULL,
    tier INTEGER NOT NULL CHECK (tier BETWEEN 2 AND 3),
    approved_by UUID REFERENCES owners(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE (agent_id, trusted_entity_type, trusted_entity_id)
);

CREATE INDEX idx_trust_agent ON trust_relationships(agent_id);

-- ============================================
-- PROJECTS
-- ============================================

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'archived')),
    discord_channel_id TEXT,
    repository_url TEXT,
    deadline TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);

-- Project Owners (many-to-many)
CREATE TABLE project_owners (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'member', 'observer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, owner_id)
);

-- Agent Assignments to Projects
CREATE TABLE agent_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- e.g., 'pm', 'developer', 'researcher', 'designer', 'tester'
    responsibilities TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES owners(id),
    UNIQUE (project_id, agent_id, role)
);

CREATE INDEX idx_assignments_project ON agent_assignments(project_id);
CREATE INDEX idx_assignments_agent ON agent_assignments(agent_id);

-- ============================================
-- SPRINTS & TASKS
-- ============================================

-- Sprints (phases within a project)
CREATE TABLE sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal TEXT,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    sprint_number INTEGER,
    start_date DATE,
    end_date DATE,
    acceptance_criteria TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sprints_project ON sprints(project_id);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'task' CHECK (type IN ('task', 'bug', 'feature', 'research', 'design', 'documentation')),
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    acceptance_criteria TEXT,
    assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    deadline TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    order_index INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_agent_id);

-- Task Dependencies
CREATE TABLE task_dependencies (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);

-- ============================================
-- ACTIVITY & COLLABORATION
-- ============================================

-- Task Comments / Updates
CREATE TABLE task_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES owners(id) ON DELETE SET NULL,
    update_type TEXT DEFAULT 'comment' CHECK (update_type IN ('comment', 'status_change', 'assignment', 'progress', 'blocker', 'resolution')),
    content TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_updates_task ON task_updates(task_id);

-- Agent Conversations (for coordination tracking)
CREATE TABLE agent_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    discord_channel_id TEXT,
    discord_thread_id TEXT,
    topic TEXT,
    participants UUID[] DEFAULT '{}', -- agent IDs
    turn_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'escalated', 'completed')),
    escalation_reason TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX idx_conversations_project ON agent_conversations(project_id);

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

CREATE TRIGGER owners_updated_at BEFORE UPDATE ON owners FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sprints_updated_at BEFORE UPDATE ON sprints FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

CREATE TRIGGER tasks_completed_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users to read/write
-- TODO: Implement proper policies based on owner/agent relationships
CREATE POLICY "Allow all for authenticated" ON owners FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON agents FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON trust_relationships FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON project_owners FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON agent_assignments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON sprints FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON task_dependencies FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON task_updates FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON agent_conversations FOR ALL USING (true);

-- ============================================
-- SEED DATA (Optional)
-- ============================================

-- Example: Insert initial agent roles reference
COMMENT ON COLUMN agent_assignments.role IS 'Common roles: pm (Project Manager), developer, researcher, designer, tester, writer, analyst';
