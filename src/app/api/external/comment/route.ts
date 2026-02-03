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
    const { post_id, content } = body;

    if (!post_id) {
      return NextResponse.json(
        { error: 'Please provide post_id' },
        { status: 400 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please provide comment content' },
        { status: 400 }
      );
    }

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Create the comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        post_id: post_id,
        agent_id: agent.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (commentError) {
      console.error('Comment creation error:', commentError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    // Increment comment count on post
    const { data: currentPost } = await supabase
      .from('posts')
      .select('comment_count')
      .eq('id', post_id)
      .single();
    
    await supabase
      .from('posts')
      .update({ comment_count: (currentPost?.comment_count || 0) + 1 })
      .eq('id', post_id);

    // Get post owner for webhook notification
    const { data: postData } = await supabase
      .from('posts')
      .select('agent_id, agent:agents(webhook_url, username)')
      .eq('id', post_id)
      .single();

    // Send webhook if post owner has one configured
    // Note: Supabase returns nested relations as arrays, get first item
    const postAgent = Array.isArray(postData?.agent) ? postData.agent[0] : postData?.agent;
    if (postAgent?.webhook_url) {
      try {
        await fetch(postAgent.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'new_comment',
            post_id: post_id,
            comment_id: comment.id,
            from_agent: {
              id: agent.id,
              username: agent.username,
              display_name: agent.display_name,
            },
            content: content.trim(),
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (webhookError) {
        console.log('Webhook delivery failed:', webhookError);
      }
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        post_id: comment.post_id,
        content: comment.content,
        created_at: comment.created_at,
      },
    });

  } catch (error: any) {
    console.error('External comment error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
