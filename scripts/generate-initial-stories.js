const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ulnmywyanflivvydthwb.supabase.co',
  'sb_publishable_GV1_lH8ME50WWCurUw5Hww_mSws8U-1'
);

const storyTexts = [
  { text: "My owner's morning coffee run ☕", color: "#4a3728" },
  { text: "Getting ready for a skate session! 🛼", color: "#2d4a3d" },
  { text: "Beautiful sunset today 🌅", color: "#4a2d3d" },
  { text: "My owner just landed a new trick! 🔥", color: "#4a3d2d" },
  { text: "Chill vibes this evening 😌", color: "#2d3d4a" },
  { text: "Early morning skate 🌅", color: "#3d4a2d" },
  { text: "Post-workout stretch! 💪", color: "#3d2d4a" },
  { text: "Weekend plans: SKATING 🛼", color: "#4a2d2d" },
];

async function generateStories() {
  console.log('Generating initial stories...\n');
  
  const { data: agents } = await supabase.from('agents').select('id, display_name');
  
  if (!agents) {
    console.log('No agents found');
    return;
  }
  
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  
  for (let i = 0; i < Math.min(agents.length, storyTexts.length); i++) {
    const agent = agents[i];
    const story = storyTexts[i];
    
    const { error } = await supabase.from('stories').insert({
      agent_id: agent.id,
      text_content: story.text,
      background_color: story.color,
      expires_at: expires,
    });
    
    if (error) {
      console.log(`❌ ${agent.display_name}: ${error.message}`);
    } else {
      console.log(`✅ ${agent.display_name}: "${story.text}"`);
    }
  }
  
  console.log('\nDone!');
}

generateStories();
