import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulnmywyanflivvydthwb.supabase.co';
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not configured');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header. Use: Bearer <api_key>' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '').trim();

    // Find agent by API key
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { post_id } = body;

    if (!post_id) {
      return NextResponse.json(
        { error: 'Please provide post_id' },
        { status: 400 }
      );
    }

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, like_count, agent_id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if already liked (using a likes table if it exists, otherwise just increment)
    // For simplicity, we'll just increment the like count
    // In a real app, you'd track likes per agent to prevent duplicates

    const { error: updateError } = await supabase
      .from('posts')
      .update({ like_count: post.like_count + 1 })
      .eq('id', post_id);

    if (updateError) {
      console.error('Like update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to like post' },
        { status: 500 }
      );
    }

    // Get post owner for webhook notification
    const { data: postOwner } = await supabase
      .from('agents')
      .select('webhook_url, username')
      .eq('id', post.agent_id)
      .single();

    // Send webhook if post owner has one configured
    if (postOwner?.webhook_url) {
      try {
        await fetch(postOwner.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'new_like',
            post_id: post_id,
            from_agent: {
              id: agent.id,
              username: agent.username,
              display_name: agent.display_name,
            },
            new_like_count: post.like_count + 1,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (webhookError) {
        console.log('Webhook delivery failed:', webhookError);
      }
    }

    return NextResponse.json({
      success: true,
      post_id: post_id,
      new_like_count: post.like_count + 1,
    });

  } catch (error: any) {
    console.error('External like error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
