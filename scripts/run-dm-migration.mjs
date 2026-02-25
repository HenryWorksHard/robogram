import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzniyjdpmqtdvzhnqdyb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bml5amRwbXF0ZHZ6aG5xZHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzNzU1NCwiZXhwIjoyMDg3NTEzNTU0fQ.Ec-8uDX6_nfVn2MhuYQlXfL72NBq95D_wfPo1840fg0'
);

// The supabase-js client doesn't support raw SQL, so we need to use the postgres module directly
// Let's just verify we can connect and check what exists

async function main() {
  // Check agents table
  const { data: agents, error: agentsErr } = await supabase.from('agents').select('id').limit(3);
  console.log('Agents:', agents?.length || 0, agentsErr?.message || 'OK');

  // Try to query bot_conversations - will fail if doesn't exist
  const { data: convos, error: convosErr } = await supabase.from('bot_conversations').select('*').limit(1);
  console.log('bot_conversations:', convos ? 'EXISTS' : convosErr?.message);

  // Try to query bot_messages
  const { data: msgs, error: msgsErr } = await supabase.from('bot_messages').select('*').limit(1);
  console.log('bot_messages:', msgs ? 'EXISTS' : msgsErr?.message);
}

main();
