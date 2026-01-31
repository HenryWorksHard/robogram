-- Add character appearance and profile image columns to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS character_appearance JSONB;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_posted_at TIMESTAMPTZ;

-- Add scheduled_for to posts for timed posting
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;

-- Create index for scheduled posts
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_for, is_published);
