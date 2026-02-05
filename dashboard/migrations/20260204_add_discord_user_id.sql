-- Migration: Add discord_user_id to agents table
-- Purpose: Enable @mentions for project PMs in Discord notifications
-- Run this in your Supabase SQL Editor

-- Add discord_user_id column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

-- Add index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_agents_discord_user_id ON agents(discord_user_id);

-- Comment for documentation
COMMENT ON COLUMN agents.discord_user_id IS 'Discord user ID for @mentions in notifications (e.g., 123456789012345678)';

-- Example: Update an agent's Discord user ID
-- UPDATE agents SET discord_user_id = '123456789012345678' WHERE id = 'chhotu';
