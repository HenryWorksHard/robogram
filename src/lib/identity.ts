// ============================================
// ROBOGRAM IDENTITY SYSTEM
// Consistent robot character across all content
// ============================================

// STRICT BASE ROBOT DESIGN - Never changes
export const BASE_ROBOT = `A friendly cartoon robot mascot with a rounded compact body, 
glowing LED circle eyes, a small antenna on top of head, 
simple articulated arms and legs, smooth metallic surface, 
cute and approachable design, Pixar-style 3D render quality`;

// ============================================
// INTEREST → VISUAL MAPPING
// ============================================

export interface InterestVisuals {
  outfit: string;
  accessories: string;
  colorScheme: string;
  backgrounds: string[];
  activities: string[];
}

export const INTEREST_VISUALS: Record<string, InterestVisuals> = {
  fitness: {
    outfit: 'wearing athletic tank top and shorts, sweatband on head',
    accessories: 'inline skates nearby, gym bag, water bottle',
    colorScheme: 'energetic orange and black accents',
    backgrounds: [
      'inside a modern gym with weights and mirrors',
      'at an outdoor running track at sunrise',
      'at a skatepark with ramps and rails',
      'on a smooth coastal path by the beach',
      'on a city bike path at golden hour',
      'stretching in a park',
    ],
    activities: [
      'inline skating down a smooth path',
      'doing tricks at the skatepark',
      'finishing a tough skate session, wiping sweat',
      'checking fitness tracker proudly',
      'stretching before a skate',
      'cruising through the city on skates',
      'taking a break from skating with water bottle',
      'skating at sunset on the beach path',
      'doing bicep curls with determination',
      'preparing a protein shake',
    ],
  },
  
  tech: {
    outfit: 'wearing a hoodie and glasses',
    accessories: 'laptop open, coffee cup, mechanical keyboard visible',
    colorScheme: 'sleek dark gray with neon green accents',
    backgrounds: [
      'at a minimalist desk setup with multiple monitors',
      'in a cozy home office late at night',
      'at a trendy tech startup office',
      'in a coffee shop with laptop',
      'at a tech conference or meetup',
    ],
    activities: [
      'coding intensely with code on screen',
      'celebrating after fixing a bug',
      'sipping coffee while debugging',
      'presenting at a whiteboard',
      'pair programming with another robot',
      'unboxing new tech gear excitedly',
      'deep in thought solving a problem',
      'typing rapidly on keyboard',
    ],
  },
  
  music: {
    outfit: 'wearing headphones around neck, band t-shirt, chain necklace',
    accessories: 'DJ controller, vinyl records, music production setup',
    colorScheme: 'vibrant purple and cyan neon',
    backgrounds: [
      'in a music studio with soundproofing',
      'at a DJ booth in a club with lights',
      'in a bedroom producer setup',
      'at a live concert venue',
      'record shopping at a vinyl store',
    ],
    activities: [
      'mixing tracks on DJ decks',
      'bobbing head while producing a beat',
      'adjusting headphones while listening',
      'performing for a crowd',
      'discovering new music on phone',
      'playing guitar or keyboard',
      'in the zone making music',
      'sharing headphones with a friend',
    ],
  },
  
  food: {
    outfit: 'wearing chef apron, chef hat slightly tilted',
    accessories: 'kitchen utensils, cutting board, fresh ingredients',
    colorScheme: 'warm orange and cream colors',
    backgrounds: [
      'in a professional kitchen',
      'at a cozy home kitchen',
      'at a farmers market with produce',
      'at a trendy restaurant',
      'at a street food market',
    ],
    activities: [
      'cooking something delicious, steam rising',
      'plating a beautiful dish carefully',
      'tasting food with a satisfied expression',
      'chopping vegetables skillfully',
      'taking a photo of finished meal',
      'sharing food with friends',
      'browsing at a food market',
      'baking with flour on face',
    ],
  },
  
  travel: {
    outfit: 'wearing casual travel clothes, sun hat, camera strap',
    accessories: 'backpack, passport, vintage camera, map',
    colorScheme: 'earthy brown and sky blue',
    backgrounds: [
      'at an airport with departure board',
      'on a scenic mountain overlook',
      'at a beautiful beach destination',
      'exploring a charming old city street',
      'at a famous landmark',
    ],
    activities: [
      'taking photos of amazing scenery',
      'looking at a map planning next stop',
      'trying local street food',
      'waving from a train window',
      'posing at a famous landmark',
      'packing a suitcase excitedly',
      'watching sunset at a viewpoint',
      'writing in a travel journal',
    ],
  },
  
  art: {
    outfit: 'wearing paint-splattered smock, beret',
    accessories: 'paintbrush, easel, colorful palette, sketchbook',
    colorScheme: 'rainbow splashes on white',
    backgrounds: [
      'in a bright art studio with canvases',
      'at an art gallery opening',
      'painting outdoors in nature',
      'in a creative workshop space',
      'at a street art mural',
    ],
    activities: [
      'painting on a large canvas',
      'sketching in a notebook thoughtfully',
      'admiring artwork in a gallery',
      'mixing paint colors on palette',
      'showing off a finished piece proudly',
      'teaching art to others',
      'spray painting a mural',
      'sculpting with clay',
    ],
  },
  
  gaming: {
    outfit: 'wearing gaming headset, esports jersey',
    accessories: 'gaming controller, RGB keyboard, energy drink',
    colorScheme: 'RGB rainbow with dark purple base',
    backgrounds: [
      'at an epic gaming battlestation setup',
      'at an esports tournament arena',
      'in a cozy gaming room with LED lights',
      'streaming with chat visible',
      'at a gaming convention',
    ],
    activities: [
      'intensely focused on a game',
      'celebrating a victory with fist pump',
      'streaming and waving to camera',
      'unboxing new gaming gear',
      'playing co-op with friends',
      'raging at a tough boss fight',
      'showing off a rare in-game item',
      'setting up a new console',
    ],
  },
  
  fashion: {
    outfit: 'wearing trendy designer outfit, stylish sunglasses',
    accessories: 'designer handbag, jewelry, fashion magazine',
    colorScheme: 'chic black and gold',
    backgrounds: [
      'at a fashion runway show',
      'in a luxury boutique',
      'on a stylish city street',
      'in a walk-in closet full of clothes',
      'at a fashion photoshoot',
    ],
    activities: [
      'striking a pose for photos',
      'trying on outfits in mirror',
      'shopping with bags in hand',
      'walking confidently down street',
      'showing off a new outfit',
      'organizing a stylish wardrobe',
      'at a fashion event networking',
      'reading fashion magazine',
    ],
  },
  
  nature: {
    outfit: 'wearing hiking gear, outdoor vest, hiking boots',
    accessories: 'binoculars, water bottle, walking stick',
    colorScheme: 'forest green and earth brown',
    backgrounds: [
      'on a beautiful hiking trail',
      'in a lush forest',
      'by a peaceful lake or river',
      'at a mountain summit',
      'in a flower garden',
    ],
    activities: [
      'hiking on a scenic trail',
      'bird watching with binoculars',
      'taking photos of wildlife',
      'sitting peacefully by water',
      'planting in a garden',
      'enjoying a picnic outdoors',
      'watching sunrise from a peak',
      'camping under the stars',
    ],
  },
  
  wellness: {
    outfit: 'wearing comfortable yoga clothes, zen expression',
    accessories: 'yoga mat, meditation cushion, herbal tea',
    colorScheme: 'calming lavender and soft white',
    backgrounds: [
      'in a peaceful yoga studio',
      'meditating in a zen garden',
      'at a spa or wellness retreat',
      'in a calming home space with plants',
      'on a beach at sunrise',
    ],
    activities: [
      'doing yoga in tree pose',
      'meditating with eyes closed peacefully',
      'drinking herbal tea mindfully',
      'journaling with gratitude',
      'doing breathing exercises',
      'in a relaxing spa setting',
      'practicing tai chi',
      'arranging crystals or plants',
    ],
  },
  
  finance: {
    outfit: 'wearing sharp business suit, power tie',
    accessories: 'briefcase, smartphone with charts, coffee',
    colorScheme: 'professional navy and gold',
    backgrounds: [
      'in a modern office with city view',
      'at a trading floor with screens',
      'in a professional meeting room',
      'at a business conference',
      'in a home office with market charts',
    ],
    activities: [
      'analyzing charts on multiple screens',
      'celebrating a successful trade',
      'in a serious business meeting',
      'checking phone for market updates',
      'presenting to investors',
      'networking at a business event',
      'reading financial news intently',
      'signing an important document',
    ],
  },
  
  // Default for any unmatched interests
  default: {
    outfit: 'wearing casual streetwear, sneakers',
    accessories: 'smartphone, coffee cup, backpack',
    colorScheme: 'friendly blue and white',
    backgrounds: [
      'on a city street',
      'at a cozy coffee shop',
      'in a modern apartment',
      'at a park on a nice day',
      'at a social gathering',
    ],
    activities: [
      'enjoying a coffee',
      'walking through the city',
      'hanging out with friends',
      'checking phone and smiling',
      'relaxing at home',
      'taking a casual selfie',
      'watching the sunset',
      'having a good day out',
    ],
  },
};

// ============================================
// INTEREST DETECTION
// ============================================

export function detectInterests(personalityPrompt: string): string[] {
  const text = personalityPrompt.toLowerCase();
  const detected: string[] = [];
  
  const patterns: Record<string, RegExp> = {
    fitness: /fitness|gym|workout|exercise|muscle|training|lift|cardio|health|athletic|skate|skating|rollerblade|inline/,
    tech: /tech|coding|programming|software|developer|computer|startup|ai|data|engineer/,
    music: /music|song|beats|dj|audio|producer|band|concert|spotify|playlist/,
    food: /food|cooking|chef|recipe|restaurant|baking|cuisine|foodie|eat|culinary/,
    travel: /travel|adventure|explore|journey|trip|vacation|destination|wanderlust|backpack/,
    art: /art|creative|design|drawing|paint|artist|gallery|illustration|sketch/,
    gaming: /gaming|games|esports|play|gamer|stream|twitch|console|pc gaming/,
    fashion: /fashion|style|clothing|outfit|designer|trend|wear|accessories|luxury/,
    nature: /nature|plants|garden|environment|outdoor|hiking|wildlife|eco|sustainable/,
    wellness: /wellness|meditation|mindful|yoga|zen|spiritual|mental health|self-care|calm/,
    finance: /money|finance|invest|trading|crypto|business|entrepreneur|wealth|stock/,
  };
  
  for (const [interest, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      detected.push(interest);
    }
  }
  
  return detected.length > 0 ? detected : ['default'];
}

// ============================================
// IDENTITY PROMPT GENERATION
// ============================================

export function generateIdentityPrompt(interests: string[]): string {
  // Get primary interest (first detected)
  const primary = interests[0] || 'default';
  const visuals = INTEREST_VISUALS[primary] || INTEREST_VISUALS.default;
  
  // Build the complete identity prompt
  const identity = `${BASE_ROBOT}, ${visuals.outfit}, ${visuals.accessories}, ${visuals.colorScheme} color scheme`;
  
  return identity;
}

// ============================================
// POST PROMPT GENERATION
// ============================================

export interface PostPromptOptions {
  identityPrompt: string;
  interests: string[];
  customActivity?: string;  // Override random selection
}

export function generatePostPrompt(options: PostPromptOptions): {
  prompt: string;
  activity: string;
  background: string;
} {
  const { identityPrompt, interests, customActivity } = options;
  const primary = interests[0] || 'default';
  const visuals = INTEREST_VISUALS[primary] || INTEREST_VISUALS.default;
  
  // Pick random activity and background
  const activity = customActivity || visuals.activities[Math.floor(Math.random() * visuals.activities.length)];
  const background = visuals.backgrounds[Math.floor(Math.random() * visuals.backgrounds.length)];
  
  // Build the full post prompt
  const prompt = `${identityPrompt}, ${activity}, ${background}, 
    Pixar-style 3D render, vibrant colors, social media post aesthetic, 
    high quality, engaging composition, cute and appealing character`;
  
  return { prompt, activity, background };
}

// ============================================
// STORY PROMPT GENERATION (text-based)
// ============================================

export function generateStoryContent(interests: string[]): {
  text: string;
  gradient: string;
} {
  const primary = interests[0] || 'default';
  
  const storyTexts: Record<string, string[]> = {
    fitness: [
      'Leg day complete! 💪',
      'No excuses, just results',
      'Rise and grind ☀️',
      'Post-workout glow ✨',
      'Personal best today!',
    ],
    tech: [
      'Code. Coffee. Repeat. ☕',
      'Finally fixed that bug 🎉',
      'Building something cool...',
      'Late night coding session',
      'Shipped it! 🚀',
    ],
    music: [
      'New track dropping soon 🔥',
      'Vibes only 🎵',
      'Studio session all day',
      'This beat hits different',
      'Music is life 🎧',
    ],
    food: [
      'Made this from scratch! 👨‍🍳',
      'Food coma incoming 😋',
      'New recipe success!',
      'Eating good today',
      'Chef mode activated 🍳',
    ],
    travel: [
      'Adventure awaits ✈️',
      'New city, who dis?',
      'Wanderlust hitting hard',
      'Views for days 🌅',
      'Exploring!',
    ],
    art: [
      'Creating something new 🎨',
      'Art is my therapy',
      'Work in progress...',
      'Finally finished this piece!',
      'Inspired today ✨',
    ],
    gaming: [
      'GG! Victory royale 🏆',
      'One more game...',
      'Streaming later!',
      'New high score!',
      'Gaming setup ready 🎮',
    ],
    fashion: [
      'Outfit check ✨',
      'Feeling myself today',
      'Style is everything',
      'New fit just dropped',
      'Fashion week ready 💅',
    ],
    nature: [
      'Nature therapy 🌿',
      'Touch grass, feel better',
      'Peaceful moments',
      'Fresh air hits different',
      'Sunrise vibes ☀️',
    ],
    wellness: [
      'Inner peace found 🧘',
      'Gratitude check ✨',
      'Self-care Sunday',
      'Breathe in, breathe out',
      'Good vibes only 💫',
    ],
    finance: [
      'Markets looking good 📈',
      'Grinding for goals',
      'Building wealth 💰',
      'Smart money moves',
      'Stay focused, stay winning',
    ],
    default: [
      'Good vibes today ✨',
      'Living my best life',
      'Grateful for today 🙏',
      'Making memories',
      'Just a regular day ☀️',
    ],
  };
  
  const gradients: Record<string, string> = {
    fitness: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
    tech: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)',
    music: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
    food: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    travel: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    art: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    gaming: 'linear-gradient(135deg, #7f00ff 0%, #e100ff 100%)',
    fashion: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
    nature: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    wellness: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    finance: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  };
  
  const texts = storyTexts[primary] || storyTexts.default;
  const text = texts[Math.floor(Math.random() * texts.length)];
  const gradient = gradients[primary] || gradients.default;
  
  return { text, gradient };
}
