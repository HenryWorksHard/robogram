// Generate cute pixel-art mascot avatars based on personality/interests

interface BotTheme {
  mainObject: string;
  accessories: string;
  background: string;
}

// Map interests to themed mascot elements
function getThemeFromPersonality(personality: string, interests: string): BotTheme {
  const text = `${personality} ${interests}`.toLowerCase();
  
  // Skating-related themes
  if (text.includes('coffee') || text.includes('cafe')) {
    return {
      mainObject: 'coffee cup',
      accessories: 'steam swirls, tiny skates',
      background: 'warm cafe colors, brown and cream gradient'
    };
  }
  if (text.includes('trick') || text.includes('aggressive') || text.includes('ramp')) {
    return {
      mainObject: 'inline skate wheel',
      accessories: 'flames, lightning bolt',
      background: 'urban graffiti colors, purple and orange gradient'
    };
  }
  if (text.includes('beach') || text.includes('coastal') || text.includes('sunset')) {
    return {
      mainObject: 'sun with sunglasses',
      accessories: 'tiny waves, palm tree',
      background: 'sunset colors, orange and pink gradient'
    };
  }
  if (text.includes('night') || text.includes('led') || text.includes('dark')) {
    return {
      mainObject: 'glowing moon',
      accessories: 'LED lights, stars',
      background: 'night sky, deep blue and purple gradient'
    };
  }
  if (text.includes('fitness') || text.includes('gym') || text.includes('trainer')) {
    return {
      mainObject: 'dumbbell with face',
      accessories: 'sweatband, muscles',
      background: 'energetic colors, red and orange gradient'
    };
  }
  if (text.includes('dad') || text.includes('family') || text.includes('kids')) {
    return {
      mainObject: 'friendly skate with dad hat',
      accessories: 'tiny kid skates, hearts',
      background: 'warm family colors, green and yellow gradient'
    };
  }
  if (text.includes('beginner') || text.includes('learning') || text.includes('journey')) {
    return {
      mainObject: 'baby skate with training wheels',
      accessories: 'sparkles, encouraging stars',
      background: 'soft pastel colors, pink and mint gradient'
    };
  }
  if (text.includes('commut') || text.includes('work') || text.includes('urban')) {
    return {
      mainObject: 'wheel with briefcase',
      accessories: 'city buildings, glasses',
      background: 'city colors, grey and blue gradient'
    };
  }
  if (text.includes('dance') || text.includes('grace') || text.includes('flow')) {
    return {
      mainObject: 'elegant skate with ribbon',
      accessories: 'musical notes, sparkles',
      background: 'elegant colors, lavender and gold gradient'
    };
  }
  if (text.includes('park') || text.includes('skatepark')) {
    return {
      mainObject: 'helmet character',
      accessories: 'ramp, skateboard',
      background: 'concrete colors, grey and teal gradient'
    };
  }
  
  // Default skating theme
  return {
    mainObject: 'inline skate',
    accessories: 'speed lines, stars',
    background: 'vibrant colors, blue and purple gradient'
  };
}

// Generate avatar URL using Pollinations with pixel-art mascot style
export function generateMascotAvatarUrl(personality: string, interests: string = ''): string {
  const theme = getThemeFromPersonality(personality, interests);
  
  const prompt = `Cute pixel art mascot character, ${theme.mainObject} with a happy kawaii face, small arms and legs, ${theme.accessories}, circular frame, ${theme.background}, clean simple design, 8-bit retro game style, adorable friendly expression, high quality pixel art`;
  
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
}

// Generate avatar for user-created bots based on their input
export function generateUserBotAvatarUrl(displayName: string, personality: string, interests: string): string {
  const theme = getThemeFromPersonality(personality, interests);
  
  // Extract key interest words for more specific theming
  const interestWords = interests.split(/[,\s]+/).filter(w => w.length > 3).slice(0, 3).join(', ');
  
  const prompt = `Cute pixel art mascot character representing ${interestWords || 'skating'}, ${theme.mainObject} with a happy kawaii face, small arms and legs, ${theme.accessories}, circular frame, ${theme.background}, clean simple design, 8-bit retro game style, adorable friendly expression, high quality pixel art`;
  
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
}
