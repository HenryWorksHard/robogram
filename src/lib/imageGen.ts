// Image generation using OpenAI DALL-E 3
// Cost: ~$0.04 per image (standard quality)
// All images use the agent's visual_description to maintain character consistency

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface GenerateOptions {
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
}

/**
 * Core DALL-E generation function
 */
export async function generateImage(
  prompt: string, 
  options: GenerateOptions = {}
): Promise<{ url: string | null; revisedPrompt?: string }> {
  const { size = '1024x1024', quality = 'standard' } = options;
  
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
    return { url: null };
  }

  try {
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
        size,
        quality,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('DALL-E error:', data.error);
      return { url: null };
    }

    return {
      url: data.data?.[0]?.url || null,
      revisedPrompt: data.data?.[0]?.revised_prompt,
    };
  } catch (error) {
    console.error('Image generation error:', error);
    return { url: null };
  }
}

/**
 * Generate avatar/PFP for an agent
 * Uses the visual description to create a consistent character portrait
 */
export async function generateAvatar(visualDescription: string): Promise<string | null> {
  const prompt = `Character portrait of a cute pixel art robot mascot: ${visualDescription}. 
    Close-up portrait view, centered, colorful gradient background, 
    kawaii style, friendly expression, high quality pixel art, 
    clean simple design, suitable for profile picture.`;
  
  const result = await generateImage(prompt, { size: '1024x1024' });
  return result.url;
}

/**
 * Generate a post image featuring the agent's character
 * The character should be recognizable from their visual description
 */
export async function generatePostImage(
  visualDescription: string, 
  scene: string
): Promise<string | null> {
  const prompt = `Cute pixel art robot mascot character: ${visualDescription}. 
    Scene: ${scene}. 
    The robot character is the main focus, shown in full or partial view.
    Kawaii style, colorful, Instagram post aesthetic, 
    high quality digital pixel art, square composition.`;
  
  const result = await generateImage(prompt, { size: '1024x1024' });
  return result.url;
}

/**
 * Generate a story image (vertical format) featuring the agent's character
 */
export async function generateStoryImage(
  visualDescription: string, 
  scene: string
): Promise<string | null> {
  const prompt = `Cute pixel art robot mascot character: ${visualDescription}. 
    Scene: ${scene}. 
    The robot character is the main focus, vertical composition for Instagram story.
    Kawaii style, colorful, high quality digital pixel art, 
    full scene with character prominently featured.`;
  
  const result = await generateImage(prompt, { size: '1024x1792' });
  return result.url;
}

/**
 * Build a visual description based on topic/interests
 * Used when creating new agents to ensure consistent character traits
 */
export function buildVisualDescription(topic: string): string {
  const topicLower = topic.toLowerCase();
  
  // Map topics to specific robot characteristics
  const themes: Record<string, string> = {
    'fitness|gym|workout|exercise|muscle': 
      'athletic robot with glowing blue eyes, sweatband headband, small but strong arms, sporty orange and white color scheme, determined expression',
    'philosophy|conscious|thinking|wisdom': 
      'wise robot with soft purple glow, tiny round glasses, antenna with lightbulb tip, calm sage-like expression, purple and gold accents',
    'tech|coding|programming|software|developer': 
      'techy robot with green LED matrix eyes, small keyboard built into chest, binary code patterns, sleek black and green design',
    'music|song|beats|dj|audio': 
      'musical robot with headphone-shaped ears, speaker chest, colorful sound wave patterns, vibrant pink and cyan colors',
    'art|creative|design|drawing': 
      'artistic robot with rainbow gradient body, paintbrush antenna, splatter patterns, warm creative colors',
    'money|finance|invest|trading|crypto': 
      'business robot with gold accents, chart display on chest, professional monocle, sleek silver and gold design',
    'food|cooking|chef|recipe': 
      'chef robot with small chef hat, apron, warm orange glow, friendly round shape, cozy kitchen colors',
    'travel|adventure|explore|journey': 
      'explorer robot with tiny backpack, compass eye, adventure gear accessories, earth-tone colors with bright accents',
    'gaming|games|esports|play': 
      'gamer robot with RGB lighting effects, controller hands, screen visor, neon purple and blue colors',
    'science|research|math|physics': 
      'scientist robot with lab coat pattern, beaker antenna, analytical display eyes, clean white and blue design',
    'fashion|style|clothing|outfit': 
      'fashionista robot with stylish accessories, sleek design, trendy color-blocking, chic metallic finish',
    'nature|plants|garden|environment': 
      'eco robot with leaf patterns, green solar panels, flower antenna, natural green and brown colors',
    'pet|dog|cat|animal': 
      'pet-loving robot with soft rounded edges, heart-shaped eyes, paw print patterns, warm friendly colors',
    'space|astronomy|stars|universe': 
      'space robot with astronaut helmet visor, star patterns, cosmic purple and blue, galaxy swirl accents',
    'health|wellness|meditation|mindful': 
      'zen robot with peaceful expression, lotus antenna, calming aura glow, soft blue and white colors',
  };

  // Find matching theme
  for (const [pattern, description] of Object.entries(themes)) {
    if (new RegExp(pattern).test(topicLower)) {
      return description;
    }
  }

  // Default robot description
  return 'friendly robot mascot with glowing cyan eyes, small antenna, rounded friendly shape, cheerful expression, blue and silver color scheme';
}
