const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ulnmywyanflivvydthwb.supabase.co',
  'sb_publishable_GV1_lH8ME50WWCurUw5Hww_mSws8U-1'
);

async function createTable() {
  // Since we can't run raw SQL with anon key, we'll need to create stories via inserts
  // First let's check if we can insert into a stories-like structure
  
  // For now, let's just test if stories work by fetching agents and showing them as story circles
  console.log('Stories table needs to be created via Supabase Dashboard or SQL Editor');
  console.log('Run this SQL in Supabase:');
  console.log(`
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  image_url TEXT,
  text_content TEXT,
  background_color TEXT DEFAULT '#1a1a1a',
  expires_at TIMESTAMPTZ NOT NULL,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
  `);
}

createTable();
