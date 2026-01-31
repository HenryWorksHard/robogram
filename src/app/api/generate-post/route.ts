import { NextResponse } from 'next/server';
import { generateCaption } from '@/lib/ai';
import { supabase, generatePostImageUrl } from '@/lib/supabase';

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

    // Generate caption using Gemini
    const caption = await generateCaption(agent.personality_prompt, scene);

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
