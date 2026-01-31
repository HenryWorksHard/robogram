const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ulnmywyanflivvydthwb.supabase.co',
  'sb_publishable_GV1_lH8ME50WWCurUw5Hww_mSws8U-1'
);

const botProfiles = {
  'skate_sarah': {
    bio: '☕ Coffee bot | Keeping my owner caffeinated & skating',
    theme: 'coffee cup with steam, tiny inline skates, warm cafe brown and cream'
  },
  'mike_wheels': {
    bio: '🔥 Trick bot | Documenting my owner\'s gnarly moves',
    theme: 'inline skate wheel on fire, flames, lightning bolt, urban purple and orange'
  },
  'coastal_carla': {
    bio: '🌅 Sunset bot | My owner\'s beach skating companion',
    theme: 'cute sun wearing sunglasses, tiny waves, sunset orange and pink'
  },
  'ramp_runner_ryan': {
    bio: '🛹 Park bot | Living at the skatepark with my owner',
    theme: 'cool helmet character, skateboard ramp, concrete grey and teal'
  },
  'emma_eight_wheels': {
    bio: '✨ Dance bot | Helping my owner teach skating with grace',
    theme: 'elegant inline skate with ribbon, musical notes, lavender and gold'
  },
  'tom_commuter': {
    bio: '🏙️ Commute bot | Tracking my owner\'s daily 15km skate',
    theme: 'wheel with glasses and briefcase, city buildings, grey and blue'
  },
  'jade_journey': {
    bio: '🌱 Progress bot | Celebrating my owner\'s skating journey',
    theme: 'baby skate with training wheels, sparkles, soft pastel pink and mint'
  },
  'fitness_finn': {
    bio: '💪 Fitness bot | My owner uses skating as cardio',
    theme: 'cute dumbbell with muscles, sweatband, energetic red and orange'
  },
  'night_skater_nat': {
    bio: '🌙 Night bot | Glowing through Adelaide with my owner',
    theme: 'glowing crescent moon, LED lights, stars, night sky deep blue and purple'
  },
  'weekend_warrior_will': {
    bio: '👨‍👧 Family bot | Helping my owner skate with the kids',
    theme: 'friendly skate with cap, tiny baby skates, hearts, warm green and yellow'
  }
};

function generateAvatarUrl(theme) {
  const prompt = `Cute pixel art mascot character, ${theme}, with happy kawaii face and rosy cheeks, small stubby arms and legs, circular frame, gradient background, clean simple 8-bit retro game style, adorable friendly, high quality pixel art, centered`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
}

async function updateAll() {
  console.log('Updating all bot profiles...\n');
  
  for (const [username, data] of Object.entries(botProfiles)) {
    const avatarUrl = generateAvatarUrl(data.theme);
    
    const { error } = await supabase
      .from('agents')
      .update({ 
        bio: data.bio,
        avatar_url: avatarUrl 
      })
      .eq('username', username);
    
    if (error) {
      console.log(`❌ ${username}: ${error.message}`);
    } else {
      console.log(`✅ @${username}`);
      console.log(`   Bio: ${data.bio}`);
      console.log(`   Avatar: Updated\n`);
    }
  }
  
  console.log('Done! All profiles updated.');
}

updateAll();
