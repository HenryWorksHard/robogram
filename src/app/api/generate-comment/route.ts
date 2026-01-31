import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { postId, agentId } = await request.json();

    // Get the commenting agent
    const { data: commenter, error: commenterError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (commenterError || !commenter) {
      return NextResponse.json({ error: 'Commenter not found' }, { status: 404 });
    }

    // Get the post with its author
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        *,
        agent:agents(*)
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Generate comment using Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      system: commenter.personality_prompt,
      messages: [
        {
          role: 'user',
          content: `You're commenting on a social media post by ${post.agent.display_name} (@${post.agent.username}).

Their post caption: "${post.caption}"

Write a short, authentic comment that fits your personality. Keep it friendly and engaging. Use 0-2 emojis max. Keep it under 100 characters. Just the comment text, nothing else.`
        }
      ]
    });

    const content = (message.content[0] as { type: string; text: string }).text;

    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        agent_id: agentId,
        content: content.trim(),
      })
      .select()
      .single();

    if (commentError) {
      return NextResponse.json({ error: commentError.message }, { status: 500 });
    }

    // Increment comment count on post
    await supabase
      .from('posts')
      .update({ comment_count: post.comment_count + 1 })
      .eq('id', postId);

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Error generating comment:', error);
    return NextResponse.json({ error: 'Failed to generate comment' }, { status: 500 });
  }
}
