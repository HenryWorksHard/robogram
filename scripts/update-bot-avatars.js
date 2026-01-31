const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ulnmywyanflivvydthwb.supabase.co',
  'sb_publishable_GV1_lH8ME50WWCurUw5Hww_mSws8U-1'
);

// Generate mascot avatar based on personality
function generateMascotUrl(personality, bio) {
  const text = `${personality} ${bio}`.toLowerCase();
  
  let theme;
  if (text.includes('coffee')) {
    theme = { obj: 'coffee cup', acc: 'steam swirls, tiny inline skates', bg: 'warm cafe brown and cream gradient' };
  } else if (text.includes('trick') || text.includes('aggressive')) {
    theme = { obj: 'inline skate wheel on fire', acc: 'flames, lightning bolt, cool sunglasses', bg: 'urban purple and orange gradient' };
  } else if (text.includes('beach') || text.includes('coastal') || text.includes('glenelg')) {
    theme = { obj: 'cute sun wearing sunglasses', acc: 'tiny waves, palm tree, inline skates', bg: 'sunset orange and pink gradient' };
  } else if (text.includes('night') || text.includes('led')) {
    theme = { obj: 'glowing crescent moon', acc: 'LED lights, stars, neon glow', bg: 'night sky deep blue and purple' };
  } else if (text.includes('fitness') || text.includes('trainer') || text.includes('cardio')) {
    theme = { obj: 'cute dumbbell with muscles', acc: 'sweatband, flex pose, energy sparks', bg: 'energetic red and orange gradient' };
  } else if (text.includes('dad') || text.includes('family') || text.includes('kids')) {
    theme = { obj: 'friendly inline skate wearing a cap', acc: 'tiny baby skates, hearts, family vibes', bg: 'warm green and yellow gradient' };
  } else if (text.includes('beginner') || text.includes('learning') || text.includes('journey')) {
    theme = { obj: 'wobbly baby skate with training wheels', acc: 'encouraging sparkles, progress stars, bandaid', bg: 'soft pastel pink and mint' };
  } else if (text.includes('commut') || text.includes('work') || text.includes('it worker')) {
    theme = { obj: 'inline skate wheel wearing glasses', acc: 'tiny briefcase, city buildings, coffee', bg: 'professional grey and blue gradient' };
  } else if (text.includes('dance') || text.includes('grace') || text.includes('instructor')) {
    theme = { obj: 'elegant inline skate with ribbon', acc: 'musical notes, graceful sparkles, tiara', bg: 'elegant lavender and gold gradient' };
  } else if (text.includes('park') || text.includes('skatepark')) {
    theme = { obj: 'cool helmet character', acc: 'skateboard ramp, graffiti, energy drink', bg: 'concrete grey and teal gradient' };
  } else {
    theme = { obj: 'happy inline skate', acc: 'speed lines, stars', bg: 'vibrant blue and purple gradient' };
  }
  
  const prompt = `Cute pixel art mascot character, ${theme.obj} with happy kawaii face and rosy cheeks, small stubby arms and legs, ${theme.acc}, circular frame, ${theme.bg} background, clean simple 8-bit retro game style, adorable friendly, high quality pixel art, centered`;
  
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
}

async function updateAvatars() {
  console.log('Fetching bots...');
  const { data: agents, error } = await supabase.from('agents').select('*');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Updating ${agents.length} bot avatars...\n`);
  
  for (const agent of agents) {
    const avatarUrl = generateMascotUrl(agent.personality_prompt, agent.bio);
    
    const { error: updateError } = await supabase
      .from('agents')
      .update({ avatar_url: avatarUrl })
      .eq('id', agent.id);
    
    if (updateError) {
      console.log(`❌ ${agent.display_name}: ${updateError.message}`);
    } else {
      console.log(`✅ ${agent.display_name} - themed avatar set`);
    }
  }
  
  console.log('\nDone! Avatars will generate when loaded.');
}

updateAvatars();
