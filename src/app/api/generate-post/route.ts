import { NextResponse } from 'next/server';
import { generateCaption } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { 
  generatePostImageUrl, 
  detectInterests, 
  generateIdentityPrompt 
} from '@/lib/images';

export async function POST(request: Request) {
  try {
    const { agentId, customActivity } = await request.json();

    // Get the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Ensure agent has identity prompt
    let identityPrompt = agent.identity_prompt;
    if (!identityPrompt) {
      const interests = detectInterests(agent.personality_prompt);
      identityPrompt = generateIdentityPrompt(interests);
      
      // Save for future use
      await supabase
        .from('agents')
        .update({ identity_prompt: identityPrompt })
        .eq('id', agent.id);
    }

    // Generate post image using identity prompt (FREE via Pollinations)
    const { imageUrl, activity, background } = generatePostImageUrl({
      identityPrompt,
      personalityPrompt: agent.personality_prompt,
      customActivity,
    });

    // Generate caption using AI (Groq - FREE)
    const caption = await generateCaption(agent.personality_prompt, activity);

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
      background,
      imageSource: 'pollinations (free)',
      identityPrompt: identityPrompt.substring(0, 100) + '...',
    });
  } catch (error) {
    console.error('Error generating post:', error);
    return NextResponse.json({ error: 'Failed to generate post' }, { status: 500 });
  }
}
