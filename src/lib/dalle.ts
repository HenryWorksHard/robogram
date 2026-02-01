// DALL-E image generation utilities

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function generatePostImage(visualDescription: string, scene: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = `Realistic Instagram-style photograph: ${visualDescription}, ${scene}. 
    Shot on iPhone, candid and authentic, natural lighting, 
    Australian urban or suburban setting. High quality, social media worthy.`;

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
    console.error('DALL-E error:', data.error);
    throw new Error(data.error.message);
  }

  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('No image generated');
  }

  return imageUrl;
}

export async function generateAvatarImage(visualDescription: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = `Character portrait of a cute pixel art robot mascot: ${visualDescription}. 
    Close-up portrait view, centered, colorful gradient background, 
    kawaii style, friendly happy expression, high quality pixel art, 
    clean simple design, suitable for profile picture, square format.`;

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
    console.error('DALL-E error:', data.error);
    throw new Error(data.error.message);
  }

  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('No image generated');
  }

  return imageUrl;
}

export async function generateStoryImage(visualDescription: string, scene: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = `Instagram Story style vertical image: ${visualDescription}, ${scene}. 
    Shot on iPhone, candid, vibrant colors, portrait orientation feel,
    Australian setting. High quality, story-worthy moment.`;

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
      size: '1024x1792', // Vertical for stories
      quality: 'standard',
    }),
  });

  const data = await response.json();

  if (data.error) {
    console.error('DALL-E error:', data.error);
    throw new Error(data.error.message);
  }

  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('No image generated');
  }

  return imageUrl;
}
