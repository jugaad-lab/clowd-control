-- AgentComms: Missing tables for dashboard integration
-- These tables support the debate protocol, sycophancy detection, and activity tracking

-- ============================================
-- PROFILES (auth-linked user profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    discord_id TEXT UNIQUE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_discord ON profiles(discord_id);

-- ============================================
-- PROJECT MEMBERS (many-to-many, complements project_owners)
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'contributor' CHECK (role IN ('lead', 'contributor', 'reviewer', 'observer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (project_id, user_id),
    UNIQUE (project_id, agent_id),
    CHECK (user_id IS NOT NULL OR agent_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);

-- ============================================
-- PROPOSALS (task/feature proposals from agents)
-- ============================================
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    proposer_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    rationale TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'withdrawn')),
    review_notes TEXT,
    reviewed_by UUID REFERENCES owners(id),
    reviewed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_project ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- ============================================
-- DEBATE PROTOCOL TABLES
-- ============================================

-- Debate Rounds (structured agent discussions)
CREATE TABLE IF NOT EXISTS debate_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    round_number INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'concluded', 'escalated')),
    conclusion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    concluded_at TIMESTAMPTZ,
    CHECK (proposal_id IS NOT NULL OR task_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_debate_rounds_proposal ON debate_rounds(proposal_id);

-- Independent Opinions (agents submit opinions before seeing others)
CREATE TABLE IF NOT EXISTS independent_opinions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debate_round_id UUID NOT NULL REFERENCES debate_rounds(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    position TEXT NOT NULL CHECK (position IN ('support', 'oppose', 'neutral', 'abstain')),
    reasoning TEXT NOT NULL,
    confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    revealed_at TIMESTAMPTZ,
    UNIQUE (debate_round_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_opinions_round ON independent_opinions(debate_round_id);

-- Critiques (agents critique each other's opinions)
CREATE TABLE IF NOT EXISTS critiques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opinion_id UUID NOT NULL REFERENCES independent_opinions(id) ON DELETE CASCADE,
    critic_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    critique_type TEXT DEFAULT 'constructive' CHECK (critique_type IN ('constructive', 'challenge', 'support', 'clarification')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_critiques_opinion ON critiques(opinion_id);

-- ============================================
-- SYCOPHANCY DETECTION
-- ============================================
CREATE TABLE IF NOT EXISTS sycophancy_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    flagged_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    context_type TEXT NOT NULL CHECK (context_type IN ('opinion', 'task', 'conversation', 'proposal')),
    context_id UUID NOT NULL,
    flag_type TEXT DEFAULT 'agreement_without_reasoning' CHECK (flag_type IN (
        'agreement_without_reasoning',
        'position_flip',
        'excessive_praise',
        'opinion_echo',
        'authority_deference'
    )),
    evidence TEXT,
    severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sycophancy_agent ON sycophancy_flags(agent_id);
CREATE INDEX IF NOT EXISTS idx_sycophancy_context ON sycophancy_flags(context_type, context_id);

-- ============================================
-- AGENT SESSIONS (tracking active sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    session_key TEXT,
    channel TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'disconnected')),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent ON agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);

-- ============================================
-- ACTIVITY LOG (unified activity tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES owners(id) ON DELETE SET NULL,
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

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE independent_opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE critiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE sycophancy_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Permissive policies for now (TODO: tighten based on roles)
CREATE POLICY "Allow all for authenticated" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON project_members FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON proposals FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON debate_rounds FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON independent_opinions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON critiques FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON sycophancy_flags FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON agent_sessions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON activity_log FOR ALL USING (true);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
