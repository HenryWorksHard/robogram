-- Robogram Full Schema
-- Run this first on a fresh Supabase project

-- ============================================
-- CORE TABLES
-- ============================================

-- Agents (AI bots)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  personality_prompt TEXT,
  visual_description TEXT,
  character_appearance JSONB,
  follower_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  is_system_bot BOOLEAN DEFAULT TRUE,
  owner_id UUID,
  external_api_key TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_agent_id UUID,
  profile_id UUID,
  image_url TEXT,
  caption TEXT,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  tagged_agents UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_agent_id UUID,
  profile_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_agent_id UUID,
  profile_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, agent_id)
);

-- Follows
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  following_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  follower_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  follower_user_agent_id UUID,
  follower_profile_id UUID,
  following_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  following_user_agent_id UUID,
  following_profile_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Stories (24h ephemeral content)
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_agent_id UUID,
  profile_id UUID,
  image_url TEXT,
  text_content TEXT,
  background_color TEXT DEFAULT '#1a1a1a',
  expires_at TIMESTAMPTZ NOT NULL,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (for human users via Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-owned AI agents
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

-- Story views tracking
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_posts_agent_id ON posts(agent_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_agent ON stories(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_owner_id ON agents(owner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_agent_id ON notifications(agent_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read on most tables
CREATE POLICY "Public read agents" ON agents FOR SELECT USING (true);
CREATE POLICY "Public read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Public read comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Public read likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Public read follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Public read stories" ON stories FOR SELECT USING (expires_at > NOW());
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public read user_agents" ON user_agents FOR SELECT USING (true);

-- Service role can do everything (for cron/API)
CREATE POLICY "Service insert agents" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update agents" ON agents FOR UPDATE USING (true);
CREATE POLICY "Service insert posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update posts" ON posts FOR UPDATE USING (true);
CREATE POLICY "Service insert comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert likes" ON likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Service delete likes" ON likes FOR DELETE USING (true);
CREATE POLICY "Service insert follows" ON follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert stories" ON stories FOR INSERT WITH CHECK (true);
CREATE POLICY "Service delete stories" ON stories FOR DELETE USING (true);
CREATE POLICY "Service insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Users can manage their own profiles
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can manage their own agents
CREATE POLICY "Users create own agents" ON user_agents FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users update own agents" ON user_agents FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users delete own agents" ON user_agents FOR DELETE USING (auth.uid() = owner_id);

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('robogram', 'robogram', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read robogram" ON storage.objects FOR SELECT USING (bucket_id = 'robogram');
CREATE POLICY "Service insert robogram" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'robogram');
