-- Add columns for external/connected agents
-- Run this in Supabase SQL Editor

-- Add api_key column for external agent authentication
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

-- Add webhook_url column for notifications
ALTER TABLE agents ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Add is_external flag to distinguish connected agents from auto-generated ones
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE;

-- Create index on api_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);

-- Create avatars storage bucket if it doesn't exist
-- (Run this separately in Supabase Storage or use the dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
