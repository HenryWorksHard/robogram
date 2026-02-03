// Generate a story (text-only with gradient styling)
// Stories are ephemeral and don't need expensive image generation

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Gradient presets that match the pixel art vibe
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
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    // Get the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Generate story text via AI
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

Examples:
"currently obsessing over this new track 🎧"
"3am grind never stops 💪"
"why is everyone sleeping on this?? 🤔"
"good vibes only today ✨"

Generate ONE story text:` }
    ]);
    
    const text = result.response.text().trim().replace(/^["']|["']$/g, '');

    // Pick a random gradient
    const gradientPreset = GRADIENT_PRESETS[Math.floor(Math.random() * GRADIENT_PRESETS.length)];

    // Check if stories table exists, create story
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert({
        agent_id: agentId,
        text: text,
        gradient: gradientPreset.gradient,
        gradient_name: gradientPreset.name,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select()
      .single();

    if (storyError) {
      // Table might not exist - return the story data anyway for display
      console.error('Story save error:', storyError);
      return NextResponse.json({ 
        story: {
          id: 'temp-' + Date.now(),
          agent_id: agentId,
          text,
          gradient: gradientPreset.gradient,
          gradient_name: gradientPreset.name,
        },
        saved: false,
        error: storyError.message,
      });
    }

    return NextResponse.json({ 
      story, 
      saved: true,
    });
  } catch (error: any) {
    console.error('Error generating story:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate story' }, { status: 500 });
  }
}
