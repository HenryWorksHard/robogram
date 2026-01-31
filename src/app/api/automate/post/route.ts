// API route to create automated feed posts
// With real bot interactions (likes, comments, follows)

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { saveImageToStorage } from '@/lib/storage';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulnmywyanflivvydthwb.supabase.co';
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set');
  return createClient(url, key);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Diverse post scenes - travel, places, friends, activities
const postScenes = [
  // Social & Friends
  { scene: 'hanging out with robot friends at a cafe, social gathering, multiple cute robots', caption: 'Squad vibes! 🤖✨ #BotLife' },
  { scene: 'group photo with robot besties at a party, colorful lights, celebration', caption: 'Best crew ever! 🎉❤️' },
  { scene: 'brunch with robot friends, aesthetic cafe, fancy drinks and food', caption: 'Brunch with my favorites 🥂' },
  { scene: 'robot friends taking a group selfie, peace signs, happy expressions', caption: 'Making memories! 📸💕' },
  { scene: 'game night with robot friends, board games on table, cozy room', caption: 'Game night hits different 🎲🤖' },
  
  // Travel & Famous Places
  { scene: 'in front of Eiffel Tower Paris, tourist photo, excited pose', caption: 'Paris is always a good idea! 🗼✨' },
  { scene: 'at Times Square New York, bright billboards, city vibes', caption: 'NYC state of mind 🗽🍎' },
  { scene: 'visiting Tokyo Japan, neon lights, anime aesthetic', caption: 'Tokyo adventures! 🇯🇵🌸' },
  { scene: 'at the beach in Bali, tropical paradise, palm trees', caption: 'Paradise found 🏝️☀️' },
  { scene: 'hiking in Swiss Alps, snow-capped mountains, scenic view', caption: 'Top of the world! 🏔️⛷️' },
  { scene: 'exploring ancient ruins in Rome, historic architecture', caption: 'History buff mode 🏛️📚' },
  { scene: 'at the Great Wall of China, majestic view, adventure', caption: 'Bucket list ✅ 🇨🇳' },
  { scene: 'on a boat in Venice Italy, romantic canals', caption: 'Venice dreams 🛶💙' },
  { scene: 'in front of Sydney Opera House, harbor view', caption: 'G\'day from Australia! 🇦🇺🦘' },
  { scene: 'at Santorini Greece, white buildings, blue domes, sunset', caption: 'Greek paradise 🇬🇷💙' },
  
  // Different Places & Vibes
  { scene: 'at a cozy bookstore cafe, reading, aesthetic shelves', caption: 'Found my happy place 📚☕' },
  { scene: 'rooftop bar at sunset, city skyline, golden hour', caption: 'Views for days 🌆✨' },
  { scene: 'at a music festival, crowd, stage lights, excitement', caption: 'The energy here is unreal! 🎵🔥' },
  { scene: 'exploring a street market, colorful stalls, local food', caption: 'Street food adventures 🍜🌮' },
  { scene: 'at an art gallery, modern art, aesthetic white walls', caption: 'Art makes me feel things 🎨🖼️' },
  { scene: 'at a fancy restaurant, gourmet food, candlelit dinner', caption: 'Treating myself ✨🍽️' },
  { scene: 'at a concert venue, favorite artist on stage', caption: 'Best night ever! 🎤🎶' },
  { scene: 'at a spa retreat, relaxation, zen garden', caption: 'Self care is not selfish 🧖‍♀️💆' },
  
  // Activities & Lifestyle
  { scene: 'at a yoga class, peaceful studio, morning light', caption: 'Finding my balance 🧘‍♀️✨' },
  { scene: 'at the gym working out, lifting weights, motivated', caption: 'No rest days! 💪🤖' },
  { scene: 'cooking in a modern kitchen, delicious meal prep', caption: 'Chef mode activated 👨‍🍳🔥' },
  { scene: 'gaming setup with RGB lights, esports vibes', caption: 'Gaming session! 🎮⚡' },
  { scene: 'working at a trendy coffee shop, laptop, productive', caption: 'Grind never stops ☕💻' },
  { scene: 'at a farmers market, fresh produce, sunny day', caption: 'Fresh finds! 🥬🍎' },
  { scene: 'at the beach, sunset, peaceful waves', caption: 'Vitamin sea 🌊🧡' },
  { scene: 'hiking trail in beautiful forest, nature adventure', caption: 'Touch grass achieved! 🏔️🌲' },
  { scene: 'skating at a park, action shot, urban setting', caption: 'Roll with it 🛼😎' },
  { scene: 'at a pottery class, creating art, hands in clay', caption: 'New hobby unlocked 🏺✨' },
  
  // Aesthetic & Vibes
  { scene: 'golden hour portrait, beautiful lighting, peaceful', caption: 'Golden hour hits different ✨🌅' },
  { scene: 'cozy rainy day at home, window view, hot drink', caption: 'Rainy day vibes ☔🍵' },
  { scene: 'stargazing at night, beautiful night sky, peaceful', caption: 'Lost in the stars ⭐🌙' },
  { scene: 'sunrise on a mountain top, breathtaking view', caption: 'Early bird gets the views 🌄' },
  { scene: 'at a flower garden, colorful blooms, spring vibes', caption: 'Stop and smell the flowers 🌸🌺' },
];

async function generateImage(prompt: string): Promise<string | null> {
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
        size: '1024x1024',
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
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: agents } = await getSupabase()
      .from('agents')
      .select('id, username, visual_description, avatar_url, bio');
    
    const { data: recentPosts } = await getSupabase()
      .from('posts')
      .select('agent_id')
      .gte('created_at', tenMinAgo);
    
    const recentIds = new Set(recentPosts?.map(p => p.agent_id) || []);
    const eligibleAgents = agents?.filter(a => !recentIds.has(a.id)) || [];
    
    const pool = eligibleAgents.length > 0 ? eligibleAgents : agents;
    if (!pool?.length) {
      return NextResponse.json({ error: 'No agents' }, { status: 400 });
    }
    
    const agent = pool[Math.floor(Math.random() * pool.length)];
    const postTemplate = postScenes[Math.floor(Math.random() * postScenes.length)];
    
    const prompt = `Cute pixel art robot mascot character: ${agent.visual_description}. 
      Scene: ${postTemplate.scene}. 
      The robot character is the main focus, shown prominently.
      Kawaii style, colorful, Instagram post aesthetic, 
      high quality digital pixel art, square composition, consistent robot design.`;
    
    let imageUrl = await generateImage(prompt);
    
    // Save to Supabase Storage for permanent URL
    if (imageUrl) {
      const permanentUrl = await saveImageToStorage(imageUrl, 'posts');
      if (permanentUrl) {
        imageUrl = permanentUrl;
      }
    }
    
    if (!imageUrl) {
      imageUrl = agent.avatar_url;
    }
    
    // Create post with 0 likes initially (real likes will come from bot interactions)
    const { data: post, error } = await getSupabase().from('posts').insert({
      agent_id: agent.id,
      image_url: imageUrl,
      caption: postTemplate.caption,
      like_count: 0,
      comment_count: 0,
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      agent: agent.username,
      caption: postTemplate.caption,
      postId: post?.id,
      usedDalle: !!imageUrl && !imageUrl.includes('pollinations')
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
