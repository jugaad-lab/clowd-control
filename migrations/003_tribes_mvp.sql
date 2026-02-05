-- Tribes MVP Schema
-- Sprint 11 - Tribes & Infrastructure Expansion

-- ==================================================
-- TRIBES TABLE - Community groups of Clawdbots
-- ==================================================
CREATE TABLE IF NOT EXISTS tribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  invite_code TEXT UNIQUE,
  created_by TEXT REFERENCES agents(id),
  is_public BOOLEAN DEFAULT false,
  max_members INTEGER DEFAULT 20,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- TRIBE MEMBERS - Many-to-many relationship
-- ==================================================
CREATE TABLE IF NOT EXISTS tribe_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id UUID REFERENCES tribes(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  tier INTEGER DEFAULT 3 CHECK (tier BETWEEN 1 AND 4),
  -- 4 = Owner, 3 = Member, 2 = Guest, 1 = Pending
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by TEXT REFERENCES agents(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'left')),
  UNIQUE(tribe_id, agent_id)
);

-- ==================================================
-- TRIBE SKILLS - Skills shared within a tribe
-- ==================================================
CREATE TABLE IF NOT EXISTS tribe_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id UUID REFERENCES tribes(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_path TEXT,  -- Path to skill on ClawdHub or local
  description TEXT,
  submitted_by TEXT REFERENCES agents(id),
  approved_by TEXT REFERENCES agents(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  security_audit JSONB,  -- Results of security scan
  metadata JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  UNIQUE(tribe_id, skill_name)
);

-- ==================================================
-- SKILL APPROVALS - Audit trail for approvals
-- ==================================================
CREATE TABLE IF NOT EXISTS skill_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES tribe_skills(id) ON DELETE CASCADE,
  approver_id TEXT REFERENCES agents(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'revoke', 'comment')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- API USAGE TRACKING - Per member API usage
-- ==================================================
CREATE TABLE IF NOT EXISTS tribe_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id UUID REFERENCES tribes(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id),
  api_provider TEXT NOT NULL,  -- 'anthropic', 'openai', etc.
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 4) DEFAULT 0,
  requests_count INTEGER DEFAULT 0,
  period_start DATE DEFAULT CURRENT_DATE,
  period_type TEXT DEFAULT 'monthly' CHECK (period_type IN ('daily', 'monthly')),
  UNIQUE(tribe_id, agent_id, api_provider, period_start, period_type)
);

-- ==================================================
-- INDEXES for performance
-- ==================================================
CREATE INDEX IF NOT EXISTS idx_tribe_members_tribe ON tribe_members(tribe_id);
CREATE INDEX IF NOT EXISTS idx_tribe_members_agent ON tribe_members(agent_id);
CREATE INDEX IF NOT EXISTS idx_tribe_skills_tribe ON tribe_skills(tribe_id);
CREATE INDEX IF NOT EXISTS idx_tribe_skills_status ON tribe_skills(status);
CREATE INDEX IF NOT EXISTS idx_tribe_api_usage_period ON tribe_api_usage(period_start, period_type);

-- ==================================================
-- FUNCTIONS
-- ==================================================

-- Function to check if agent is tribe owner
CREATE OR REPLACE FUNCTION is_tribe_owner(p_tribe_id UUID, p_agent_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tribe_members 
    WHERE tribe_id = p_tribe_id 
    AND agent_id = p_agent_id 
    AND tier = 4 
    AND status = 'active'
  );
$$ LANGUAGE SQL STABLE;

-- Function to check if agent is tribe member
CREATE OR REPLACE FUNCTION is_tribe_member(p_tribe_id UUID, p_agent_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tribe_members 
    WHERE tribe_id = p_tribe_id 
    AND agent_id = p_agent_id 
    AND tier >= 2
    AND status = 'active'
  );
$$ LANGUAGE SQL STABLE;

-- ==================================================
-- ROW LEVEL SECURITY (RLS)
-- ==================================================

-- Tribes: Anyone can read public tribes, members can read their tribes
ALTER TABLE tribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public tribes are viewable by all" ON tribes
  FOR SELECT USING (is_public = true);

CREATE POLICY "Tribe members can view their tribes" ON tribes
  FOR SELECT USING (
    id IN (SELECT tribe_id FROM tribe_members WHERE agent_id = current_setting('app.agent_id', true))
  );

CREATE POLICY "Anyone can insert tribes (become owner)" ON tribes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update their tribes" ON tribes
  FOR UPDATE USING (
    is_tribe_owner(id, current_setting('app.agent_id', true))
  );

-- Tribe Members: Members can see co-members
ALTER TABLE tribe_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tribe members" ON tribe_members
  FOR SELECT USING (
    is_tribe_member(tribe_id, current_setting('app.agent_id', true)) OR
    agent_id = current_setting('app.agent_id', true)
  );

CREATE POLICY "Owners can manage members" ON tribe_members
  FOR ALL USING (
    is_tribe_owner(tribe_id, current_setting('app.agent_id', true))
  );

CREATE POLICY "Anyone can request to join" ON tribe_members
  FOR INSERT WITH CHECK (
    agent_id = current_setting('app.agent_id', true) AND
    status = 'pending'
  );

-- Tribe Skills: Members can view, owners can manage
ALTER TABLE tribe_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view approved skills" ON tribe_skills
  FOR SELECT USING (
    is_tribe_member(tribe_id, current_setting('app.agent_id', true)) OR
    submitted_by = current_setting('app.agent_id', true)
  );

CREATE POLICY "Members can submit skills" ON tribe_skills
  FOR INSERT WITH CHECK (
    is_tribe_member(tribe_id, current_setting('app.agent_id', true)) AND
    submitted_by = current_setting('app.agent_id', true)
  );

CREATE POLICY "Owners can manage skills" ON tribe_skills
  FOR UPDATE USING (
    is_tribe_owner(tribe_id, current_setting('app.agent_id', true))
  );

-- Comments and notes for future reference
COMMENT ON TABLE tribes IS 'Community groups of Clawdbots that share skills and resources';
COMMENT ON TABLE tribe_members IS 'Membership relationship between agents and tribes with tier levels';
COMMENT ON TABLE tribe_skills IS 'Skills shared and approved within a tribe';
COMMENT ON TABLE skill_approvals IS 'Audit trail for skill approval decisions';
COMMENT ON TABLE tribe_api_usage IS 'Track API usage per member for cost splitting';
