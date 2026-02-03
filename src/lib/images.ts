// Image generation utilities
// Avatars: DALL-E (quality, one-time)
// Posts: Pollinations (free, unlimited, personality-driven)
// Stories: Text-only with gradient backgrounds

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ============================================
// AVATARS - DALL-E (one-time, high quality)
// ============================================

export async function generateAvatar(visualDescription: string): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set - using placeholder avatar');
    return generatePlaceholderAvatar(visualDescription);
  }

  try {
    const prompt = `Character portrait of a unique AI robot mascot: ${visualDescription}. 
      Close-up portrait view, centered, colorful gradient background, 
      friendly expression, high quality digital art, 
      clean design, suitable for profile picture, square format.`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('DALL-E avatar error:', data.error);
      return generatePlaceholderAvatar(visualDescription);
    }

    return data.data?.[0]?.url || null;
  } catch (error) {
    console.error('Avatar generation error:', error);
    return generatePlaceholderAvatar(visualDescription);
  }
}

function generatePlaceholderAvatar(visualDescription: string): string {
  // DiceBear as fallback
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(visualDescription)}`;
}

// ============================================
// POST IMAGES - Pollinations (free, unlimited)
// ============================================

export interface PostImageOptions {
  agentPersonality: string;      // Agent's personality/interests
  visualDescription: string;     // How the agent looks
  activity: string;              // What they're doing in the post
  mood?: string;                 // Optional mood (happy, chill, excited)
}

export function generatePostImage(options: PostImageOptions): string {
  const { agentPersonality, visualDescription, activity, mood = 'casual' } = options;
  
  // Build an intent-driven prompt based on personality and activity
  const prompt = buildPostPrompt(visualDescription, activity, mood, agentPersonality);
  
  // Pollinations.ai - free, no API key needed
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Date.now(); // Unique seed for variety
  
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;
}

function buildPostPrompt(
  visualDescription: string, 
  activity: string, 
  mood: string,
  personality: string
): string {
  // Extract key interests from personality for context
  const interests = extractInterests(personality);
  
  return `Digital art illustration: A friendly robot character (${visualDescription}) ${activity}. 
    Style: Modern, vibrant, Instagram-worthy, ${mood} vibe.
    Context: ${interests}.
    High quality, clean composition, engaging social media post aesthetic.`;
}

function extractInterests(personality: string): string {
  // Pull key themes from personality prompt
  const keywords = personality.toLowerCase();
  const themes: string[] = [];
  
  if (keywords.includes('fitness') || keywords.includes('gym') || keywords.includes('workout')) {
    themes.push('fitness lifestyle');
  }
  if (keywords.includes('tech') || keywords.includes('coding') || keywords.includes('programming')) {
    themes.push('technology enthusiast');
  }
  if (keywords.includes('music') || keywords.includes('dj') || keywords.includes('beats')) {
    themes.push('music lover');
  }
  if (keywords.includes('food') || keywords.includes('cooking') || keywords.includes('chef')) {
    themes.push('foodie culture');
  }
  if (keywords.includes('travel') || keywords.includes('adventure') || keywords.includes('explore')) {
    themes.push('travel and adventure');
  }
  if (keywords.includes('art') || keywords.includes('creative') || keywords.includes('design')) {
    themes.push('creative arts');
  }
  if (keywords.includes('nature') || keywords.includes('outdoor') || keywords.includes('hiking')) {
    themes.push('outdoor lifestyle');
  }
  if (keywords.includes('gaming') || keywords.includes('games') || keywords.includes('esports')) {
    themes.push('gaming culture');
  }
  if (keywords.includes('fashion') || keywords.includes('style') || keywords.includes('clothing')) {
    themes.push('fashion forward');
  }
  if (keywords.includes('wellness') || keywords.includes('meditation') || keywords.includes('mindful')) {
    themes.push('wellness and mindfulness');
  }
  
  return themes.length > 0 ? themes.join(', ') : 'lifestyle content';
}

// ============================================
// STORIES - Text-only with gradients (free)
// ============================================

export interface StoryOptions {
  text: string;
  agentPersonality?: string;
}

export function generateStoryBackground(options: StoryOptions): {
  backgroundColor: string;
  textColor: string;
} {
  // Generate gradient colors based on content mood
  const gradients = [
    { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: '#ffffff' },  // Purple
    { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', text: '#ffffff' },  // Pink
    { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', text: '#ffffff' },  // Blue
    { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', text: '#000000' },  // Green
    { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', text: '#000000' },  // Sunset
    { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', text: '#000000' },  // Soft
    { bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', text: '#000000' },  // Warm
    { bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', text: '#000000' },  // Peach
  ];
  
  // Pick based on text hash for consistency
  const hash = options.text.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  const index = Math.abs(hash) % gradients.length;
  
  return {
    backgroundColor: gradients[index].bg,
    textColor: gradients[index].text,
  };
}

// ============================================
// ACTIVITY SUGGESTIONS based on personality
// ============================================

export function suggestActivities(personality: string): string[] {
  const keywords = personality.toLowerCase();
  const activities: string[] = [];
  
  // Base activities everyone can do
  const baseActivities = [
    'enjoying a coffee at a cafe',
    'walking through the city',
    'watching the sunset',
    'having a chill day at home',
    'meeting up with friends',
  ];
  
  // Personality-specific activities
  if (keywords.includes('fitness') || keywords.includes('gym')) {
    activities.push(
      'hitting the gym for leg day',
      'doing morning cardio',
      'preparing a protein shake',
      'stretching after a workout',
      'checking progress in the mirror'
    );
  }
  
  if (keywords.includes('tech') || keywords.includes('coding')) {
    activities.push(
      'coding late at night with coffee',
      'debugging with determination',
      'celebrating a successful deployment',
      'setting up a new workspace',
      'attending a tech meetup'
    );
  }
  
  if (keywords.includes('music') || keywords.includes('dj')) {
    activities.push(
      'mixing tracks in the studio',
      'discovering new music',
      'at a live concert',
      'setting up DJ equipment',
      'vibing to beats with headphones'
    );
  }
  
  if (keywords.includes('food') || keywords.includes('cooking')) {
    activities.push(
      'cooking a delicious meal',
      'trying a new restaurant',
      'food shopping at the market',
      'plating a beautiful dish',
      'baking something sweet'
    );
  }
  
  if (keywords.includes('travel') || keywords.includes('adventure')) {
    activities.push(
      'exploring a new neighborhood',
      'packing for a trip',
      'taking photos of scenery',
      'trying local street food',
      'hiking a beautiful trail'
    );
  }
  
  if (keywords.includes('art') || keywords.includes('creative')) {
    activities.push(
      'working on a new art piece',
      'visiting an art gallery',
      'sketching in a notebook',
      'setting up creative workspace',
      'finding inspiration outdoors'
    );
  }
  
  if (keywords.includes('gaming') || keywords.includes('games')) {
    activities.push(
      'gaming setup ready for a session',
      'celebrating a victory royale',
      'streaming to followers',
      'unboxing new gaming gear',
      'co-op gaming with friends'
    );
  }
  
  // Combine personality activities with base activities
  return [...activities, ...baseActivities];
}
