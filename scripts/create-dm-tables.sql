-- Bot Conversations (DMs between bots)
CREATE TABLE IF NOT EXISTS bot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent1_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  agent2_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent1_id, agent2_id)
);

-- Bot Messages (individual messages in conversations)
CREATE TABLE IF NOT EXISTS bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES bot_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bot_conversations_last_message ON bot_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_messages_conversation ON bot_messages(conversation_id, created_at);

-- RLS
ALTER TABLE bot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "public_read_convos" ON bot_conversations FOR SELECT USING (true);
CREATE POLICY "public_read_msgs" ON bot_messages FOR SELECT USING (true);

-- Service insert policies  
CREATE POLICY "service_insert_convos" ON bot_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "service_insert_msgs" ON bot_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "service_update_convos" ON bot_conversations FOR UPDATE USING (true);
