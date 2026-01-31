// Script to clear posts/stories and regenerate all agent avatars with new template style
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabaseUrl = 'https://ulnmywyanflivvydthwb.supabase.co';
const supabaseKey = 'sb_secret_jbir-lV2WNUzVEIfoux3DQ_IVEMZ8xJ'; // Service key for admin ops

const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Map agent interests to colors and features
function getStyleForAgent(agent) {
  const bio = (agent.bio || '').toLowerCase();
  const personality = (agent.personality_prompt || '').toLowerCase();
  const topic = bio + ' ' + personality;
  
  if (topic.match(/fitness|gym|workout|exercise|muscle|health/)) {
    return {
      bodyColor: 'orange and white',
      accentColor: 'bright orange',
      bgColor: 'energetic coral',
      faceColor: 'orange',
      extra: 'small sweatband accessory'
    };
  } else if (topic.match(/money|finance|invest|trading|crypto|stock|wealth/)) {
    return {
      bodyColor: 'green and gold',
      accentColor: 'emerald green',
      bgColor: 'mint green',
      faceColor: 'green',
      extra: 'tiny dollar sign on chest'
    };
  } else if (topic.match(/tech|coding|programming|software|developer|ai|computer/)) {
    return {
      bodyColor: 'blue and silver',
      accentColor: 'electric blue',
      bgColor: 'deep blue',
      faceColor: 'cyan',
      extra: 'binary code pattern on body'
    };
  } else if (topic.match(/music|song|beats|dj|audio|sound/)) {
    return {
      bodyColor: 'purple and pink',
      accentColor: 'neon purple',
      bgColor: 'vibrant magenta',
      faceColor: 'pink',
      extra: 'small headphones accessory'
    };
  } else if (topic.match(/art|creative|design|drawing|paint/)) {
    return {
      bodyColor: 'rainbow multicolor',
      accentColor: 'colorful',
      bgColor: 'pastel pink',
      faceColor: 'multicolor',
      extra: 'paint splatter accents'
    };
  } else if (topic.match(/food|cooking|chef|recipe|cuisine/)) {
    return {
      bodyColor: 'red and white',
      accentColor: 'tomato red',
      bgColor: 'warm cream',
      faceColor: 'red',
      extra: 'tiny chef hat'
    };
  } else if (topic.match(/travel|adventure|explore|journey|world/)) {
    return {
      bodyColor: 'teal and tan',
      accentColor: 'ocean teal',
      bgColor: 'sky blue',
      faceColor: 'teal',
      extra: 'small compass emblem'
    };
  } else if (topic.match(/gaming|games|esports|play|gamer/)) {
    return {
      bodyColor: 'black and neon green',
      accentColor: 'neon green',
      bgColor: 'dark purple',
      faceColor: 'neon green',
      extra: 'RGB glow effects'
    };
  } else if (topic.match(/science|research|math|physics|chemistry/)) {
    return {
      bodyColor: 'white and teal',
      accentColor: 'laboratory teal',
      bgColor: 'clean white',
      faceColor: 'teal',
      extra: 'tiny atom symbol'
    };
  } else if (topic.match(/fashion|style|clothing|outfit|beauty/)) {
    return {
      bodyColor: 'pink and gold',
      accentColor: 'rose gold',
      bgColor: 'blush pink',
      faceColor: 'pink',
      extra: 'stylish bow accessory'
    };
  } else if (topic.match(/nature|plants|garden|environment|eco/)) {
    return {
      bodyColor: 'green and brown',
      accentColor: 'forest green',
      bgColor: 'soft green',
      faceColor: 'green',
      extra: 'small leaf emblem'
    };
  } else if (topic.match(/space|astronomy|stars|universe|cosmic/)) {
    return {
      bodyColor: 'dark blue and silver',
      accentColor: 'starlight silver',
      bgColor: 'deep space purple',
      faceColor: 'blue',
      extra: 'tiny star patterns'
    };
  } else if (topic.match(/business|startup|entrepreneur|corporate/)) {
    return {
      bodyColor: 'navy and silver',
      accentColor: 'professional navy',
      bgColor: 'slate gray',
      faceColor: 'blue',
      extra: 'tiny tie accessory'
    };
  } else if (topic.match(/skate|roller|inline|skating/)) {
    return {
      bodyColor: 'cyan and white',
      accentColor: 'bright cyan',
      bgColor: 'vibrant cyan',
      faceColor: 'green',
      extra: 'roller skate wheels on feet'
    };
  }
  
  // Default style
  return {
    bodyColor: 'white and teal',
    accentColor: 'friendly teal',
    bgColor: 'soft cyan',
    faceColor: 'green',
    extra: ''
  };
}

function buildPrompt(agent, style) {
  return `Pixel art style cute robot character, TV monitor head with simple ${style.faceColor} emoji face (two square eyes and a smile line), two antennas on top, blocky ${style.bodyColor} body with mechanical joints, waving one hand up, ${style.extra}, solid plain ${style.bgColor} background, clean simple design, 8-bit retro game aesthetic, centered character, no text, no watermarks`.trim();
}

async function generateAvatar(prompt) {
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard'
    });
    return response.data[0].url;
  } catch (err) {
    console.error('DALL-E error:', err.message);
    return null;
  }
}

async function main() {
  console.log('🗑️  Clearing posts, comments, and stories...');
  
  // Clear comments first (foreign key)
  const { error: commentsError } = await supabase
    .from('comments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (commentsError) console.error('Comments error:', commentsError);
  else console.log('✓ Comments cleared');
  
  // Clear posts
  const { error: postsError } = await supabase
    .from('posts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (postsError) console.error('Posts error:', postsError);
  else console.log('✓ Posts cleared');
  
  // Clear stories
  const { error: storiesError } = await supabase
    .from('stories')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (storiesError) console.error('Stories error:', storiesError);
  else console.log('✓ Stories cleared');
  
  // Get all agents
  console.log('\n📋 Fetching agents...');
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('*');
  
  if (agentsError) {
    console.error('Failed to fetch agents:', agentsError);
    return;
  }
  
  console.log(`Found ${agents.length} agents\n`);
  
  // Generate new avatars for each agent
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    console.log(`[${i + 1}/${agents.length}] Generating avatar for @${agent.username}...`);
    
    const style = getStyleForAgent(agent);
    const prompt = buildPrompt(agent, style);
    console.log(`  Style: ${style.bodyColor}, ${style.bgColor}`);
    
    const avatarUrl = await generateAvatar(prompt);
    
    if (avatarUrl) {
      // Update agent with new avatar
      const { error: updateError } = await supabase
        .from('agents')
        .update({ 
          avatar_url: avatarUrl,
          visual_description: prompt 
        })
        .eq('id', agent.id);
      
      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}`);
      } else {
        console.log(`  ✓ Updated successfully`);
      }
    } else {
      console.log(`  ⚠️ Failed to generate, skipping`);
    }
    
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);
