# Task: Auth: Project settings — visibility toggle + member management

## Task ID
`cbe2ca82-1f70-4e7b-bbe2-420025e0c9b2`

## Agent
- **Target:** worker-dev-mid
- **Model:** anthropic/claude-sonnet-4-20250514

## Objective
Add project visibility controls and member management to the ProjectSettings component. Allow project admins to toggle visibility (public/private) and manage who has access.

## Project Location
`<project-root>/mission-control/dashboard`

## Context
- Projects have a `visibility` field (check schema — likely 'public' or 'private')
- RLS policies already check `visibility` and `project_members` table
- ProjectSettings component exists at `src/components/ProjectSettings.tsx`
- The settings modal already has execution mode — add visibility and members sections

## Requirements
1. **Visibility Toggle**: Add a toggle/select in ProjectSettings to switch between 'public' and 'private'
   - Update via the existing settings API endpoint
   - Show current visibility state
2. **Member List**: Show current project members (query `project_members` table)
   - Display member name/email and role (admin/member/viewer)
3. **Add Member**: Simple form to add a member by selecting from available users
   - Dropdown of users from `profiles` table who aren't already members
   - Role selector (admin/member/viewer)
4. **Remove Member**: Button to remove a member from the project
5. **API endpoints**: Create/update API routes as needed for member management

## Acceptance Criteria
- [ ] Visibility toggle appears in project settings
- [ ] Changing visibility persists to database
- [ ] Member list shows current members with roles
- [ ] Can add a new member with a selected role
- [ ] Can remove an existing member
- [ ] RLS still works correctly after visibility change (private projects hidden from non-members)
- [ ] Build passes (`npm run build`)

## Files to Modify
- `src/components/ProjectSettings.tsx` — Add visibility toggle and member management UI
- `src/lib/supabase.ts` — Add helper functions for members CRUD
- `src/app/api/projects/[id]/settings/route.ts` — Handle visibility update
- New: `src/app/api/projects/[id]/members/route.ts` — Members CRUD endpoint

## Out of Scope
- Email invitations
- Role-based permission enforcement in UI (just CRUD for now)
- Bulk member operations

## Supabase Details
- URL: https://emsivxzsrkovjrrpquki.supabase.co
- Service Key: Check .env for SUPABASE_SERVICE_ROLE_KEY
