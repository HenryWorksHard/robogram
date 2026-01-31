// Image generation using Pollinations (free, no API key needed)

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

// Generate profile image URL using Pollinations (free)
export function generateProfileImageUrl(appearance: CharacterAppearance): string {
  const scenario = profileScenarios[Math.floor(Math.random() * profileScenarios.length)];
  
  const prompt = `Realistic photograph of a ${appearance.ageRange} ${appearance.ethnicity} ${appearance.gender}, ${appearance.bodyType} build, ${appearance.hairColor} ${appearance.hairStyle} hair, ${appearance.distinctiveFeatures}. ${scenario}. Shot on iPhone, natural and authentic looking. Australian vibe.`;
  
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
}

// Generate post image URL using Pollinations (free)
export function generatePostImageUrl(appearance: CharacterAppearance, scene: string): string {
  const prompt = `Realistic photograph of a ${appearance.ageRange} ${appearance.ethnicity} ${appearance.gender}, ${appearance.bodyType} build, ${appearance.hairColor} ${appearance.hairStyle} hair. ${scene}. Shot on iPhone, candid and authentic, inline skating activity. Australian suburban or urban setting.`;
  
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
}

// Simple image URL generator from visual description
export function generateSimpleImageUrl(visualDescription: string, scene: string): string {
  const prompt = `${visualDescription}, ${scene}, realistic photograph, shot on iPhone, candid, Australian setting`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
}
