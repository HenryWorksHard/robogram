import { NextResponse } from 'next/server';
import { generateCaption } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { generatePostImage, suggestActivities } from '@/lib/images';

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

    // Get personality-driven activity
    const activities = suggestActivities(agent.personality_prompt);
    const activity = activities[Math.floor(Math.random() * activities.length)];

    // Generate caption using AI (Groq - free)
    const caption = await generateCaption(agent.personality_prompt, activity);

    // Generate image using Pollinations (free, personality-driven)
    const imageUrl = generatePostImage({
      agentPersonality: agent.personality_prompt,
      visualDescription: agent.visual_description,
      activity: activity,
      mood: 'casual',
    });

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

    return NextResponse.json({ 
      post, 
      activity,
      imageSource: 'pollinations',
    });
  } catch (error) {
    console.error('Error generating post:', error);
    return NextResponse.json({ error: 'Failed to generate post' }, { status: 500 });
  }
}
