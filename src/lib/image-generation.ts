import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface CharacterAppearance {
  gender: 'male' | 'female';
  ageRange: string;
  ethnicity: string;
  hairColor: string;
  hairStyle: string;
  bodyType: string;
  distinctiveFeatures: string;
}

// Generate a consistent character appearance for a bot
export function generateCharacterAppearance(): CharacterAppearance {
  const genders: ('male' | 'female')[] = ['male', 'female'];
  const ageRanges = ['early 20s', 'mid 20s', 'late 20s', 'early 30s', 'mid 30s'];
  const ethnicities = [
    'Caucasian Australian',
    'Mediterranean',
    'East Asian',
    'South Asian',
    'Mixed heritage',
    'Middle Eastern',
    'Pacific Islander',
  ];
  const hairColors = ['blonde', 'brunette', 'black', 'auburn', 'light brown', 'dark brown'];
  const maleHairStyles = ['short and styled', 'buzz cut', 'medium length wavy', 'fade haircut', 'messy textured'];
  const femaleHairStyles = ['long and straight', 'shoulder length wavy', 'ponytail', 'short bob', 'long curly', 'braided'];
  const bodyTypes = ['athletic', 'lean', 'average', 'fit', 'slim', 'muscular'];
  const features = [
    'warm smile',
    'bright eyes',
    'friendly expression',
    'confident posture',
    'relaxed demeanor',
    'energetic vibe',
  ];

  const gender = genders[Math.floor(Math.random() * genders.length)];
  const hairStyles = gender === 'male' ? maleHairStyles : femaleHairStyles;

  return {
    gender,
    ageRange: ageRanges[Math.floor(Math.random() * ageRanges.length)],
    ethnicity: ethnicities[Math.floor(Math.random() * ethnicities.length)],
    hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
    hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)],
    bodyType: bodyTypes[Math.floor(Math.random() * bodyTypes.length)],
    distinctiveFeatures: features[Math.floor(Math.random() * features.length)],
  };
}

// Profile picture scenarios for variety
const profileScenarios = [
  'casual selfie at home, natural lighting',
  'outdoor selfie at the beach, sunny day',
  'selfie at a trendy cafe',
  'group photo with friends at a bar, cropped to focus on subject',
  'gym mirror selfie, post-workout',
  'hiking outdoors, nature background',
  'at a rooftop bar at sunset',
  'casual photo at a park',
  'dressed up for a night out',
  'relaxed photo at home on the couch',
  'photo at a sporting event',
  'brunch with friends, cropped to subject',
];

// Post image scenarios for inline skating content
const postScenarios = [
  'inline skating at a skate park',
  'roller skating along a coastal path',
  'doing skating tricks at a park',
  'skating through city streets',
  'at an outdoor skating rink',
  'skating with friends in a group',
  'taking a break from skating, sitting with skates visible',
  'stretching before a skating session',
  'sunset skating session',
  'morning skate through a quiet neighborhood',
];

export async function generateProfileImage(
  appearance: CharacterAppearance,
  botName: string
): Promise<string | null> {
  const scenario = profileScenarios[Math.floor(Math.random() * profileScenarios.length)];
  
  const prompt = `Realistic photograph of a ${appearance.ageRange} ${appearance.ethnicity} ${appearance.gender}, ${appearance.bodyType} build, ${appearance.hairColor} ${appearance.hairStyle} hair, ${appearance.distinctiveFeatures}. ${scenario}. Shot on iPhone, natural and authentic looking, not overly polished. Australian vibe.`;

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    return response.data?.[0]?.url || null;
  } catch (error) {
    console.error(`Error generating profile image for ${botName}:`, error);
    return null;
  }
}

export async function generatePostImage(
  appearance: CharacterAppearance,
  postContent: string
): Promise<string | null> {
  // Pick a skating-related scenario that might match the post
  const scenario = postScenarios[Math.floor(Math.random() * postScenarios.length)];
  
  const prompt = `Realistic photograph of a ${appearance.ageRange} ${appearance.ethnicity} ${appearance.gender}, ${appearance.bodyType} build, ${appearance.hairColor} ${appearance.hairStyle} hair, ${appearance.distinctiveFeatures}. ${scenario}. Shot on iPhone, candid and authentic, inline skating/roller skating activity. Australian suburban or urban setting.`;

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    return response.data?.[0]?.url || null;
  } catch (error) {
    console.error('Error generating post image:', error);
    return null;
  }
}

// Download image from URL and convert to base64 for storage
export async function downloadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}
