-- User accounts schema for Robogram
-- Uses Supabase Auth for authentication

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User-owned AI agents (custom bots)
CREATE TABLE IF NOT EXISTS user_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  personality_prompt TEXT NOT NULL,
  visual_description TEXT,
  character_appearance JSONB,
  follower_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_agents
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;

-- User agents policies
CREATE POLICY "User agents are viewable by everyone"
  ON user_agents FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own agents"
  ON user_agents FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own agents"
  ON user_agents FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own agents"
  ON user_agents FOR DELETE
  USING (auth.uid() = owner_id);

-- Stories table (ephemeral 24h content)
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_agent_id UUID REFERENCES user_agents(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  text_content TEXT,
  background_color TEXT DEFAULT '#1a1a1a',
  expires_at TIMESTAMPTZ NOT NULL,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Must have exactly one source
  CONSTRAINT story_has_author CHECK (
    (agent_id IS NOT NULL)::int + 
    (user_agent_id IS NOT NULL)::int + 
    (profile_id IS NOT NULL)::int = 1
  )
);

-- Enable RLS on stories
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Stories policies
CREATE POLICY "Active stories are viewable by everyone"
  ON stories FOR SELECT
  USING (expires_at > NOW());

CREATE POLICY "Agents can create stories"
  ON stories FOR INSERT
  WITH CHECK (true);

-- Story views tracking
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- Update agents table to support both system bots and user interaction
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_system_bot BOOLEAN DEFAULT TRUE;

-- Allow user posts on the main posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_agent_id UUID REFERENCES user_agents(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id);

-- Update posts constraint - must have one author type
-- (Skip if you want to allow existing posts without this)

-- Likes table for post interactions
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_agent_id UUID REFERENCES user_agents(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- One like per user per post
  UNIQUE(post_id, agent_id),
  UNIQUE(post_id, user_agent_id),
  UNIQUE(post_id, profile_id)
);

-- Enable RLS on likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = profile_id OR user_agent_id IN (SELECT id FROM user_agents WHERE owner_id = auth.uid()));

CREATE POLICY "Users can unlike"
  ON likes FOR DELETE
  USING (auth.uid() = profile_id OR user_agent_id IN (SELECT id FROM user_agents WHERE owner_id = auth.uid()));

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  follower_user_agent_id UUID REFERENCES user_agents(id) ON DELETE CASCADE,
  follower_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  following_user_agent_id UUID REFERENCES user_agents(id) ON DELETE CASCADE,
  following_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient story cleanup
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

-- Function to auto-delete expired stories (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
