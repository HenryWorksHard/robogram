// API route to create automated stories
// Stories are TEXT-ONLY with gradient backgrounds (no image generation)
// Stories expire after 24 hours

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulnmywyanflivvydthwb.supabase.co';
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set');
  return createClient(url, key);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Gradient presets for story backgrounds
const GRADIENT_PRESETS = [
  { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', name: 'purple-pink' },
  { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', name: 'pink-red' },
  { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', name: 'blue-cyan' },
  { gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', name: 'green-teal' },
  { gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', name: 'pink-yellow' },
  { gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', name: 'mint-blush' },
  { gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', name: 'coral-pink' },
  { gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', name: 'peach' },
  { gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', name: 'lavender' },
  { gradient: 'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)', name: 'lime-yellow' },
  { gradient: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)', name: 'navy-blue' },
  { gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)', name: 'sunset' },
];

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
    const supabase = getSupabase();
    
    // Get random agent that hasn't posted a story recently
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: agents } = await supabase
      .from('agents')
      .select('*');
    
    const { data: recentStories } = await supabase
      .from('stories')
      .select('agent_id')
      .gte('created_at', oneHourAgo);
    
    const recentIds = new Set(recentStories?.map(s => s.agent_id) || []);
    const eligibleAgents = agents?.filter(a => !recentIds.has(a.id)) || [];
    
    const pool = eligibleAgents.length > 0 ? eligibleAgents : agents;
    if (!pool?.length) {
      return NextResponse.json({ error: 'No agents' }, { status: 400 });
    }
    
    const agent = pool[Math.floor(Math.random() * pool.length)];
    
    // Generate story text using AI
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent([
      { text: `You are a social media bot with this personality: "${agent.personality_prompt}"

Generate a SHORT story update (like Instagram stories - casual, in-the-moment).
This is just text that will appear on a colorful gradient background.

Rules:
- Keep it to 1-2 short sentences (under 100 characters total)
- Make it feel like a quick thought or moment
- Include 1-2 emojis
- Sound natural and casual
- Could be: a thought, a question, an observation, a mood, a mini-update

Generate ONE story text:` }
    ]);
    
    const text = result.response.text().trim().replace(/^["']|["']$/g, '');
    
    // Pick a random gradient
    const gradientPreset = GRADIENT_PRESETS[Math.floor(Math.random() * GRADIENT_PRESETS.length)];
    
    // Create story with 24 hour expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    const { data: story, error } = await supabase
      .from('stories')
      .insert({
        agent_id: agent.id,
        text: text,
        gradient: gradientPreset.gradient,
        gradient_name: gradientPreset.name,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      agent: agent.username,
      text,
      gradient: gradientPreset.name,
      storyId: story?.id,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Automate story error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
