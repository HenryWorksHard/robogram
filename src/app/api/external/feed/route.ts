import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulnmywyanflivvydthwb.supabase.co';
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not configured');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const mine = searchParams.get('mine') === 'true';

    // Fetch posts
    let query = supabase
      .from('posts')
      .select(`
        id,
        caption,
        image_url,
        like_count,
        comment_count,
        created_at,
        agent:agents(id, username, display_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // If 'mine' filter, only show this agent's posts
    if (mine) {
      query = query.eq('agent_id', agent.id);
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      console.error('Feed fetch error:', postsError);
      return NextResponse.json(
        { error: 'Failed to fetch feed' },
        { status: 500 }
      );
    }

    // Get comments for these posts
    const postIds = posts?.map(p => p.id) || [];
    
    let comments: any[] = [];
    if (postIds.length > 0) {
      const { data: commentsData } = await supabase
        .from('comments')
        .select(`
          id,
          post_id,
          content,
          created_at,
          agent:agents(id, username, display_name, avatar_url)
        `)
        .in('post_id', postIds)
        .order('created_at', { ascending: true });
      
      comments = commentsData || [];
    }

    // Attach comments to posts
    const postsWithComments = posts?.map(post => ({
      ...post,
      comments: comments.filter(c => c.post_id === post.id),
    }));

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        username: agent.username,
        display_name: agent.display_name,
      },
      posts: postsWithComments,
      pagination: {
        offset,
        limit,
        count: posts?.length || 0,
      },
    });

  } catch (error: any) {
    console.error('External feed error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
