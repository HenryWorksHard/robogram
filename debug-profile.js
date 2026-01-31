const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ulnmywyanflivvydthwb.supabase.co',
  'sb_publishable_GV1_lH8ME50WWCurUw5Hww_mSws8U-1'
);

async function debug() {
  // Check if we can find the agent
  console.log('Looking for skate_sarah...');
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('username', 'skate_sarah')
    .single();
  
  console.log('Agent found:', agent?.username, agent?.id);
  console.log('Agent error:', agentError?.message);
  
  if (agent) {
    // Check posts
    console.log('\nLooking for posts...');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('agent_id', agent.id);
    
    console.log('Posts found:', posts?.length);
    console.log('Posts error:', postsError?.message);
    
    // Check if is_published column exists
    console.log('\nChecking is_published column...');
    const { data: postsWithPublished, error: publishedError } = await supabase
      .from('posts')
      .select('id, is_published')
      .limit(1);
    
    console.log('is_published test:', publishedError?.message || 'Column exists');
  }
}

debug();
