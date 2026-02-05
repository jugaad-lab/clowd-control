# Clowd-Control Auth & Project Access Control — Detailed Plan

**Sprint:** 11  
**Priority:** P1  
**Date:** February 4, 2026  
**Goal:** Secure project visibility so users only see projects they own or are members of.

---

## Architecture Overview

```
Browser → Dashboard (Next.js)
           │
           ├─ Supabase Auth (login/signup/session)
           │   └─ JWT with user_id
           │
           └─ Supabase Client (RLS-enforced queries)
               └─ Only returns rows the user has access to
```

**Key principle:** Security lives in the database (RLS), not the app. Even if someone bypasses the UI, Supabase won't return unauthorized data.

---

## Phase 1: Supabase Auth Setup

### 1.1 Enable Auth in Supabase
- Supabase Auth is already available on our instance (built-in)
- Enable email/password provider (simplest for our team)
- Optionally enable magic link (email-based passwordless login)
- No need for OAuth (Google/GitHub) yet — keep it simple

### 1.2 Create User Accounts
Create accounts for the team:
- **Admin** — <admin-email> (admin/owner)
- **Cheenu** — (Cheenu's email, ask him)
- **Nag** — (Nag's email, ask him)

### 1.3 User Roles
Add a `user_role` field to Supabase auth metadata:
- `admin` — can see all projects, manage users
- `member` — can see public projects + projects they're added to
- `viewer` — read-only access to assigned projects

---

## Phase 2: Schema Changes

### 2.1 Add `profiles` Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2.2 Add Ownership to Projects
```sql
ALTER TABLE projects 
  ADD COLUMN owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private' 
    CHECK (visibility IN ('public', 'private', 'team'));
```

- `public` — visible to all authenticated users
- `private` — visible only to owner
- `team` — visible to owner + project members

### 2.3 Create `project_members` Table
```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

### 2.4 Link Agents to Users (optional, for PM identity)
```sql
ALTER TABLE agents
  ADD COLUMN user_id UUID REFERENCES auth.users(id);
```

This lets us know which Supabase user owns which agent (e.g., Yajat owns chhotu, Cheenu owns cheenu).

---

## Phase 3: Row Level Security (RLS)

### 3.1 Enable RLS on All Tables
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### 3.2 Projects RLS Policies
```sql
-- Admins see everything
CREATE POLICY "admins_see_all_projects" ON projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users see: public projects + own projects + team projects they're members of
CREATE POLICY "users_see_authorized_projects" ON projects
  FOR SELECT USING (
    visibility = 'public'
    OR owner_id = auth.uid()
    OR (visibility = 'team' AND EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = projects.id AND user_id = auth.uid()
    ))
  );

-- Only owner or admin can update projects
CREATE POLICY "owner_update_projects" ON projects
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admin can create projects (or we can relax this)
CREATE POLICY "create_projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
  );
```

### 3.3 Tasks RLS Policies
```sql
-- Tasks inherit project visibility
CREATE POLICY "users_see_project_tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
      AND (
        p.visibility = 'public'
        OR p.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

-- Similar for INSERT, UPDATE, DELETE
CREATE POLICY "project_members_modify_tasks" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('admin', 'member'))
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );
```

### 3.4 Sprints, Activity Log — Same Pattern
Sprints and activity logs inherit visibility from their parent project.

### 3.5 Agent API Access (Service Role)
PM agents (Chhotu, Cheenu) use the **service role key** which bypasses RLS. This is correct — agents need full access to operate. The anon key (used by dashboard) respects RLS.

> **Important:** Dashboard must switch from `SUPABASE_ANON_KEY` to using Supabase Auth sessions. The anon key with RLS will only return rows matching the logged-in user's policies.

---

## Phase 4: Dashboard Auth UI

### 4.1 Auth Components
Create in `dashboard/src/`:

```
components/
├── auth/
│   ├── LoginPage.tsx        # Email + password login form
│   ├── SignupPage.tsx        # Registration (admin-only invite, or open)
│   ├── AuthProvider.tsx      # React context for auth state
│   ├── ProtectedRoute.tsx    # Wrapper that redirects to login if not authed
│   └── UserMenu.tsx          # Avatar + dropdown (profile, logout)
```

### 4.2 Auth Flow
```
User visits dashboard
  → AuthProvider checks Supabase session
  → No session? → Redirect to /login
  → Has session? → Load dashboard (RLS auto-filters projects)
  → Logout → supabase.auth.signOut() → back to /login
```

### 4.3 Supabase Client Update
```typescript
// dashboard/src/lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Auth helper
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

### 4.4 Middleware (Next.js)
```typescript
// dashboard/src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Refresh session, redirect to /login if expired
  // Allow /login and /signup without auth
  // Protect all other routes
}
```

### 4.5 Project Settings UI
Add to project settings page:
- **Visibility toggle:** Public / Private / Team
- **Members management:** Add/remove users, set roles
- **Owner display:** Shows who created the project

---

## Phase 5: Migration Plan

### Step 1: Run Schema Migrations
- Create profiles table + trigger
- Add owner_id + visibility to projects
- Create project_members table
- Link existing projects to Yajat's user_id

### Step 2: Create User Accounts
- Create Yajat's account (admin)
- Create Cheenu's account (member)
- Create Nag's account (member)

### Step 3: Set Project Ownership
```sql
-- After admin's auth account is created:
UPDATE projects SET owner_id = '{admin_user_id}', visibility = 'team'
WHERE name = 'Clowd-Control';

UPDATE projects SET owner_id = '{admin_user_id}', visibility = 'private'
WHERE name = 'DpuDebugAgent';

-- Add Cheenu + Nag as members of Clowd-Control
INSERT INTO project_members (project_id, user_id, role)
VALUES 
  ('{clowd_control_id}', '{cheenu_user_id}', 'member'),
  ('{clowd_control_id}', '{nag_user_id}', 'member');
```

### Step 4: Enable RLS
- Apply all RLS policies
- Test: Yajat sees all, Cheenu sees Clowd-Control only, Nag sees Clowd-Control only

### Step 5: Deploy Auth UI
- Login page
- Protected routes
- User menu
- Project member management

---

## Task Breakdown (Sprint 11)

| # | Task | Type | Complexity | Est. Hours |
|---|------|------|-----------|------------|
| 1 | Schema migration (profiles, project_members, owner_id, visibility) | development | Medium | 2 |
| 2 | RLS policies for all tables | development | High | 3 |
| 3 | Auth UI (login, signup, provider, protected routes) | development | High | 4 |
| 4 | User menu + logout | development | Low | 1 |
| 5 | Project settings: visibility toggle + member management | development | Medium | 3 |
| 6 | Middleware for session refresh + route protection | development | Medium | 2 |
| 7 | Migration script: set ownership on existing projects | development | Low | 1 |
| 8 | Create user accounts for team | ops | Low | 0.5 |
| 9 | QA: verify RLS works (test each role) | testing | Medium | 2 |

**Total estimate:** ~18 hours of agent work

---

## Security Considerations

- **Service role key stays server-side only** — never exposed to browser
- **Anon key is safe to expose** — RLS restricts what it can see
- **Agent operations use service role** — PMs need full DB access
- **Dashboard uses auth sessions** — JWT refreshed automatically
- **Invite-only signup** recommended (admin creates accounts, no open registration)
- **No API keys in .env.local** that aren't already public (anon key is designed to be public)

---

## Future Enhancements (Not Sprint 11)
- OAuth (Google login) for easier onboarding
- Fine-grained permissions (can edit tasks but not delete projects)
- Audit log: who accessed what
- Tribes integration: tribe membership → project access
- API tokens for agent auth (replace hardcoded service role)

---

*This plan covers the minimum viable auth system. Secure, functional, ready for publishing.*
