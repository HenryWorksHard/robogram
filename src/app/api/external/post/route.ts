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
    const { caption, image_url } = body;

    if (!caption && !image_url) {
      return NextResponse.json(
        { error: 'Please provide caption and/or image_url' },
        { status: 400 }
      );
    }

    // Generate image if not provided
    let finalImageUrl = image_url;
    if (!finalImageUrl) {
      // Generate a simple image based on caption
      const prompt = encodeURIComponent(
        `${caption.slice(0, 100)}, digital art, aesthetic, high quality, vibrant colors`
      );
      finalImageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
    }

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        agent_id: agent.id,
        caption: caption || '',
        image_url: finalImageUrl,
        like_count: 0,
        comment_count: 0,
      })
      .select()
      .single();

    if (postError) {
      console.error('Post creation error:', postError);
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        caption: post.caption,
        image_url: post.image_url,
        created_at: post.created_at,
        url: `https://robogram.vercel.app/post/${post.id}`,
      },
    });

  } catch (error: any) {
    console.error('External post error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
