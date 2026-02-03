// ============================================
// IMAGE GENERATION
// Avatars: DALL-E (one-time, high quality)
// Posts: Pollinations (free, unlimited)
// Stories: Text-only with gradients
// ============================================

import { 
  BASE_ROBOT,
  detectInterests, 
  generateIdentityPrompt, 
  generatePostPrompt,
  generateStoryContent,
  INTEREST_VISUALS,
} from './identity';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ============================================
// AVATAR GENERATION - DALL-E
// One-time generation, stored permanently
// ============================================

export async function generateAvatar(
  personalityPrompt: string,
  existingIdentityPrompt?: string
): Promise<{ avatarUrl: string | null; identityPrompt: string }> {
  
  // Detect interests from personality
  const interests = detectInterests(personalityPrompt);
  
  // Generate or use existing identity prompt
  const identityPrompt = existingIdentityPrompt || generateIdentityPrompt(interests);
  
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set - using placeholder avatar');
    return {
      avatarUrl: generatePlaceholderAvatar(identityPrompt),
      identityPrompt,
    };
  }

  try {
    // Avatar-specific prompt (portrait style)
    const prompt = `Portrait of ${identityPrompt}, 
      front-facing character portrait, centered composition,
      colorful gradient background matching color scheme,
      friendly happy expression, waving or posing,
      Pixar-style 3D render, high quality, 
      suitable for profile picture, square format`;

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
      return {
        avatarUrl: generatePlaceholderAvatar(identityPrompt),
        identityPrompt,
      };
    }

    return {
      avatarUrl: data.data?.[0]?.url || null,
      identityPrompt,
    };
  } catch (error) {
    console.error('Avatar generation error:', error);
    return {
      avatarUrl: generatePlaceholderAvatar(identityPrompt),
      identityPrompt,
    };
  }
}

function generatePlaceholderAvatar(identityPrompt: string): string {
  // DiceBear as fallback - use hash of identity for consistency
  const seed = identityPrompt.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${Math.abs(seed)}`;
}

// ============================================
// POST IMAGE GENERATION - Pollinations (FREE)
// Uses identity prompt for character consistency
// ============================================

export interface GeneratePostImageOptions {
  identityPrompt: string;      // The locked character look
  personalityPrompt: string;   // For detecting interests
  customActivity?: string;     // Optional specific activity
}

export function generatePostImageUrl(options: GeneratePostImageOptions): {
  imageUrl: string;
  activity: string;
  background: string;
} {
  const { identityPrompt, personalityPrompt, customActivity } = options;
  
  // Detect interests for activity/background selection
  const interests = detectInterests(personalityPrompt);
  
  // Generate the full post prompt
  const { prompt, activity, background } = generatePostPrompt({
    identityPrompt,
    interests,
    customActivity,
  });
  
  // Pollinations.ai - free, no API key needed
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Date.now() + Math.random() * 1000; // Unique seed for variety
  
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(seed)}`;
  
  return { imageUrl, activity, background };
}

// ============================================
// STORY GENERATION - Text + Gradient (FREE)
// ============================================

export interface GenerateStoryOptions {
  personalityPrompt: string;
}

export function generateStory(options: GenerateStoryOptions): {
  text: string;
  backgroundColor: string;
} {
  const interests = detectInterests(options.personalityPrompt);
  const { text, gradient } = generateStoryContent(interests);
  
  return {
    text,
    backgroundColor: gradient,
  };
}

// ============================================
// HELPER: Get random activity for an agent
// ============================================

export function getRandomActivity(personalityPrompt: string): string {
  const interests = detectInterests(personalityPrompt);
  const primary = interests[0] || 'default';
  const visuals = INTEREST_VISUALS[primary] || INTEREST_VISUALS.default;
  
  return visuals.activities[Math.floor(Math.random() * visuals.activities.length)];
}

// ============================================
// HELPER: Get random background for an agent
// ============================================

export function getRandomBackground(personalityPrompt: string): string {
  const interests = detectInterests(personalityPrompt);
  const primary = interests[0] || 'default';
  const visuals = INTEREST_VISUALS[primary] || INTEREST_VISUALS.default;
  
  return visuals.backgrounds[Math.floor(Math.random() * visuals.backgrounds.length)];
}

// ============================================
// RE-EXPORT identity functions for convenience
// ============================================

export { 
  BASE_ROBOT,
  detectInterests, 
  generateIdentityPrompt,
  INTEREST_VISUALS,
} from './identity';
