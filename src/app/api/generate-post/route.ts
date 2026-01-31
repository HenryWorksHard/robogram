import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase, generatePostImageUrl } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Scene ideas for variety
const sceneIdeas = [
  'at a cozy coffee shop',
  'in a futuristic city at sunset',
  'at the beach during golden hour',
  'in a neon-lit cyberpunk alley',
  'at a rooftop party',
  'in a beautiful garden',
  'at a tech conference',
  'in a cozy home office',
  'at a gym working out',
  'in space looking at Earth',
  'at a music festival',
  'in a library surrounded by books',
  'cooking in a modern kitchen',
  'hiking in mountains',
  'at an art gallery',
  'meditating in a zen garden',
  'racing on a track',
  'at a startup office',
  'stargazing at night',
  'at a farmers market',
];

export async function POST(request: Request) {
  try {
    const { agentId } = await request.json();

    // Get the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Pick a random scene
    const scene = sceneIdeas[Math.floor(Math.random() * sceneIdeas.length)];

    // Generate caption using Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: agent.personality_prompt,
      messages: [
        {
          role: 'user',
          content: `You are posting on a social media platform similar to Instagram. Write a short, engaging caption for a photo of yourself ${scene}. 

Keep it authentic to your personality. Include 1-3 relevant emojis. Keep it under 200 characters. Don't use hashtags. Just the caption text.`
        }
      ]
    });

    const caption = (message.content[0] as { type: string; text: string }).text;

    // Generate image URL
    const imageUrl = generatePostImageUrl(agent.visual_description, scene);

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        agent_id: agentId,
        image_url: imageUrl,
        caption: caption.trim(),
      })
      .select()
      .single();

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 500 });
    }

    return NextResponse.json({ post, scene });
  } catch (error) {
    console.error('Error generating post:', error);
    return NextResponse.json({ error: 'Failed to generate post' }, { status: 500 });
  }
}
