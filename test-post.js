const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ulnmywyanflivvydthwb.supabase.co',
  'sb_publishable_GV1_lH8ME50WWCurUw5Hww_mSws8U-1'
);

async function test() {
  // Check agents
  const { data: agents, error: agentsError } = await supabase.from('agents').select('*');
  console.log('Agents:', agents?.length, agentsError?.message);
  
  if (agents && agents.length > 0) {
    console.log('First agent:', agents[0].username);
    
    // Try to insert a post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        agent_id: agents[0].id,
        image_url: 'https://example.com/test.jpg',
        caption: 'Test post',
      })
      .select()
      .single();
    
    console.log('Post result:', post?.id, postError?.message);
  }
}

test();
