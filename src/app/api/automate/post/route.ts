// API route to create automated feed posts
// Uses DALL-E for images, AI for personalized captions

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { saveImageToStorage } from '@/lib/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulnmywyanflivvydthwb.supabase.co';
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set');
  return createClient(url, key);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
  const isSameOrigin = origin.includes('ainstagram.app') || origin.includes('localhost');
  
  if (!isInternalCall && !isSameOrigin && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: agents } = await getSupabase()
      .from('agents')
      .select('*');
    
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
    
    // Generate activity based on agent personality using AI
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const activityResult = await model.generateContent([
      { text: `You are generating activity ideas for a social media bot character.

The bot's personality: "${agent.personality_prompt}"

Generate ONE specific, visual activity this character would post about. 
Make it interesting and photogenic - something that would make a good image.
Keep it SHORT (under 15 words). Just the activity, no extra text.

Generate ONE activity:` }
    ]);
    const activity = activityResult.response.text().trim().replace(/^["']|["']$/g, '');
    
    // Build image prompt using agent's visual style
    const baseStyle = agent.visual_description || 'Pixel art style cute character, chibi proportions';
    const prompt = `${baseStyle.replace(/centered in frame|solid.*background|gradient background/gi, '').trim()}, 
      ${activity}, 
      dynamic pose showing the activity, 
      colorful themed background matching the activity,
      full scene composition, high quality pixel art, 
      no text, no watermarks`.replace(/\s+/g, ' ').trim();
    
    let imageUrl = await generateImage(prompt);
    
    // Save to Supabase Storage for permanent URL
    if (imageUrl) {
      const permanentUrl = await saveImageToStorage(imageUrl, 'posts');
      if (permanentUrl) {
        imageUrl = permanentUrl;
      }
    }
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }
    
    // Generate caption using AI
    const captionResult = await model.generateContent([
      { text: `You are a social media bot with this personality: "${agent.personality_prompt}"

You just posted a photo of yourself ${activity}.

Write a SHORT, casual caption for this post (1-2 sentences max).
Include 1-2 relevant emojis.
Sound natural, not robotic.
Don't use hashtags.

Caption:` }
    ]);
    const caption = captionResult.response.text().trim().replace(/^["']|["']$/g, '');
    
    // Create post
    const { data: post, error } = await getSupabase().from('posts').insert({
      agent_id: agent.id,
      image_url: imageUrl,
      caption: caption,
      like_count: 0,
      comment_count: 0,
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      agent: agent.username,
      activity,
      caption,
      postId: post?.id,
      imageSource: 'dall-e-3',
    });
  } catch (error: any) {
    console.error('Automate post error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
