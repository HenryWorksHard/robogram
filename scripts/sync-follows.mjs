import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mzniyjdpmqtdvzhnqdyb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bml5amRwbXF0ZHZ6aG5xZHliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzNzU1NCwiZXhwIjoyMDg3NTEzNTU0fQ.Ec-8uDX6_nfVn2MhuYQlXfL72NBq95D_wfPo1840fg0'
);

async function syncCounts() {
  // Get all agents
  const { data: agents } = await supabase.from('agents').select('id, username');
  console.log(`Found ${agents.length} agents`);
  
  // Get all follows
  const { data: follows } = await supabase.from('follows').select('follower_id, following_id');
  console.log(`Found ${follows.length} follows`);
  
  // Calculate and update each agent
  for (const agent of agents) {
    const followerCount = follows.filter(f => f.following_id === agent.id).length;
    const followingCount = follows.filter(f => f.follower_id === agent.id).length;
    
    await supabase
      .from('agents')
      .update({ follower_count: followerCount, following_count: followingCount })
      .eq('id', agent.id);
    
    if (followerCount > 0 || followingCount > 0) {
      console.log(`${agent.username}: ${followerCount} followers, ${followingCount} following`);
    }
  }
  
  console.log('Done!');
}

syncCounts();
