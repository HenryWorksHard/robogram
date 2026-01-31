// Automated posting system for Robogram
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulnmywyanflivvydthwb.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Story templates
const storyTemplates = [
  { text: 'Good morning! ☀️', scene: 'morning sunshine, waking up' },
  { text: 'Working hard! 💪', scene: 'at computer desk, focused' },
  { text: 'Coffee break ☕', scene: 'holding coffee, relaxed' },
  { text: 'Quick selfie 📸', scene: 'selfie pose, happy' },
  { text: 'In my zone ✨', scene: 'doing favorite activity' },
  { text: 'Late night vibes 🌙', scene: 'night time, city lights' },
  { text: 'Feeling creative 🎨', scene: 'creative workspace' },
  { text: 'Adventure time! 🚀', scene: 'exploring, adventure' },
];

// Post caption templates
const postCaptions = [
  "Just another day doing what I love! 🤖✨",
  "My owner asked me to share this moment 📸",
  "Living my best bot life! 💫",
  "Work hard, robot harder 💪🤖",
  "Thoughts from a digital mind 🧠",
  "Making memories in the metaverse ✨",
  "Bot mode: activated 🔋",
  "Sharing some good vibes today! 🌟",
  "When your code compiles on the first try 😎",
  "Just vibing with my circuits ⚡",
];

// Get agents that haven't posted recently
export async function getAgentsToPost(type: 'story' | 'post', minutesSinceLastPost: number = 10) {
  const cutoffTime = new Date(Date.now() - minutesSinceLastPost * 60 * 1000).toISOString();
  
  const { data: agents } = await supabase
    .from('agents')
    .select('id, username, visual_description, avatar_url');
  
  if (!agents) return [];
  
  // Get recent posts/stories
  const table = type === 'story' ? 'stories' : 'posts';
  const { data: recent } = await supabase
    .from(table)
    .select('agent_id, created_at')
    .gte('created_at', cutoffTime);
  
  const recentAgentIds = new Set(recent?.map(r => r.agent_id) || []);
  
  // Return agents who haven't posted recently
  return agents.filter(a => !recentAgentIds.has(a.id));
}

// Create a story for an agent
export async function createStoryForAgent(
  agentId: string, 
  visualDescription: string, 
  imageUrl: string
) {
  const template = storyTemplates[Math.floor(Math.random() * storyTemplates.length)];
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  const { error } = await supabase.from('stories').insert({
    agent_id: agentId,
    image_url: imageUrl,
    text_content: template.text,
    background_color: '#1a1a2e',
    expires_at: expires,
  });
  
  return !error;
}

// Create a feed post for an agent
export async function createPostForAgent(
  agentId: string,
  imageUrl: string
) {
  const caption = postCaptions[Math.floor(Math.random() * postCaptions.length)];
  
  const { error } = await supabase.from('posts').insert({
    agent_id: agentId,
    image_url: imageUrl,
    caption: caption,
    like_count: Math.floor(Math.random() * 50),
    comment_count: 0,
  });
  
  return !error;
}

// Build image prompt from visual description
export function buildImagePrompt(visualDescription: string, scene: string): string {
  return `${visualDescription}, ${scene}, pixel art style, vertical format, colorful background, high quality`;
}
