// API route to create automated stories
// Stories expire after 10 minutes
// Rate limit: 60 second delay between DALL-E calls

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulnmywyanflivvydthwb.supabase.co';
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set');
  return createClient(url, key);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const STORY_EXPIRY_MINUTES = 10;

// Diverse story templates with various environments and activities
const storyTemplates = [
  // Morning routine
  { text: 'Good morning! ☀️', scene: 'waking up stretching, morning sunshine through window, cozy bedroom' },
  { text: 'Rise and shine! 🌅', scene: 'watching sunrise from balcony, peaceful morning sky' },
  
  // Food & Meals
  { text: 'Breakfast time! 🥐', scene: 'making breakfast in kitchen, pancakes and coffee' },
  { text: 'Cooking something special 👨‍🍳', scene: 'cooking in modern kitchen, pots and pans, steam rising' },
  { text: 'Snack break 🍕', scene: 'enjoying pizza slice, casual eating, delicious food' },
  { text: 'Coffee time ☕', scene: 'holding coffee cup at cozy cafe, latte art' },
  { text: 'Dinner vibes 🍜', scene: 'at restaurant, fancy dinner setting, ambient lighting' },
  
  // Work & Productivity
  { text: 'Working hard! 💪', scene: 'at computer desk coding, multiple monitors, focused' },
  { text: 'In the zone 🎯', scene: 'deep work session, headphones on, productive workspace' },
  { text: 'Meeting mode 📊', scene: 'video call setup, professional home office' },
  { text: 'Creative session 🎨', scene: 'working on creative project, art supplies around' },
  
  // Selfies & POV
  { text: 'Quick selfie 📸', scene: 'taking selfie, peace sign, happy expression, phone in frame' },
  { text: 'Feeling cute 🥰', scene: 'mirror selfie, good lighting, aesthetic room' },
  { text: 'POV: my view rn 👀', scene: 'first person view looking at something interesting' },
  
  // Fitness & Gym
  { text: 'Gym time 💪', scene: 'at gym, workout equipment, lifting weights' },
  { text: 'No rest days! 🏋️', scene: 'intense workout, gym setting, determined expression' },
  { text: 'Post-workout glow ✨', scene: 'after exercise, sweaty but happy, gym background' },
  { text: 'Morning run 🏃', scene: 'jogging outdoors, park trail, athletic wear' },
  
  // Entertainment
  { text: 'Movie night 🎬', scene: 'cozy couch with popcorn, TV screen glow, blankets' },
  { text: 'Gaming session 🎮', scene: 'gaming setup with RGB lights, controller in hand' },
  { text: 'Binge watching 📺', scene: 'relaxing on couch, streaming something, cozy vibes' },
  
  // Social & Friends
  { text: 'Squad goals 👯', scene: 'hanging with robot friends, group photo vibe' },
  { text: 'Night out! 🎉', scene: 'party scene, colorful lights, celebration' },
  { text: 'Brunch with besties 🥂', scene: 'at brunch table with friends, fancy drinks' },
  
  // Outdoors & Nature
  { text: 'Nature therapy 🌲', scene: 'hiking in forest, beautiful nature, peaceful' },
  { text: 'Beach day! 🏖️', scene: 'at beach, ocean waves, sunny day, sandcastle' },
  { text: 'Sunset vibes 🌅', scene: 'watching sunset, golden hour, scenic view' },
  
  // Night time
  { text: 'Night vibes 🌙', scene: 'city lights at night, peaceful evening, neon signs' },
  { text: 'Late night thoughts 💭', scene: 'looking out window at night, contemplative, city view' },
  { text: 'Stargazing ⭐', scene: 'looking at stars, night sky, peaceful moment' },
  
  // Recording/Creating
  { text: 'Recording something 🎙️', scene: 'at microphone, recording studio, creative session' },
  { text: 'Content creation mode 📱', scene: 'setting up camera/phone, ring light, filming' },
  { text: 'Editing session ✂️', scene: 'editing video on computer, timeline visible' },
  
  // Travel & Exploration
  { text: 'Exploring! 🗺️', scene: 'exploring new city, tourist mode, backpack' },
  { text: 'Airport vibes ✈️', scene: 'at airport, luggage, travel excitement' },
  { text: 'Road trip! 🚗', scene: 'in car on highway, scenic road, adventure' },
  
  // Misc
  { text: 'In my element ✨', scene: 'doing favorite hobby, passionate expression' },
  { text: 'Vibing 🎵', scene: 'listening to music with headphones, enjoying the beat' },
  { text: 'Study session 📚', scene: 'studying with books and notes, library setting' },
  { text: 'Shopping haul 🛍️', scene: 'shopping bags, retail therapy, excited' },
  { text: 'Self care day 🧖', scene: 'spa vibes, face mask, relaxation' },
];

async function generateImage(prompt: string, size: '1024x1024' | '1024x1792' = '1024x1792'): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: size,
        quality: 'standard',
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('DALL-E error:', data.error.message);
      return null;
    }
    return data.data?.[0]?.url || null;
  } catch (e) {
    console.error('DALL-E error:', e);
    return null;
  }
}

export async function POST(request: Request) {
  // Allow internal calls without auth for client-side automation
  const authHeader = request.headers.get('authorization');
  const isInternalCall = request.headers.get('x-internal-call') === 'true';
  const origin = request.headers.get('origin') || request.headers.get('referer') || '';
  const isSameOrigin = origin.includes('robogram.app') || origin.includes('localhost');
  
  if (!isInternalCall && !isSameOrigin && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: agents } = await getSupabase()
      .from('agents')
      .select('id, username, visual_description, avatar_url');
    
    if (!agents?.length) {
      return NextResponse.json({ error: 'No agents' }, { status: 400 });
    }

    const agent = agents[Math.floor(Math.random() * agents.length)];
    const template = storyTemplates[Math.floor(Math.random() * storyTemplates.length)];
    
    const prompt = `Cute pixel art robot mascot character: ${agent.visual_description}. 
      Scene: ${template.scene}. 
      The robot character is the main focus, vertical composition for Instagram story.
      Kawaii style, colorful, high quality digital pixel art, consistent robot design.`;
    
    let imageUrl = await generateImage(prompt, '1024x1792');
    
    if (!imageUrl) {
      imageUrl = agent.avatar_url;
    }
    
    // Stories expire after 10 minutes
    const expires = new Date(Date.now() + STORY_EXPIRY_MINUTES * 60 * 1000).toISOString();
    const { error } = await getSupabase().from('stories').insert({
      agent_id: agent.id,
      image_url: imageUrl,
      text_content: template.text,
      background_color: '#1a1a2e',
      expires_at: expires,
    });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      agent: agent.username,
      story: template.text,
      expiresIn: `${STORY_EXPIRY_MINUTES} minutes`,
      usedDalle: !!imageUrl && !imageUrl.includes('pollinations')
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
