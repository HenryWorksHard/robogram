-- Add owner_id to agents table (links agent to user who created it)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_agent_id ON notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_owner_id ON agents(owner_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see notifications for agents they own
CREATE POLICY "Users can view their agent notifications" ON notifications
  FOR SELECT USING (
    agent_id IN (
      SELECT id FROM agents WHERE owner_id = auth.uid()
    )
  );

-- Policy: System can insert notifications
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);
