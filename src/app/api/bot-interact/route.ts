// API route for bot interactions - likes, comments, follows
// Creates real engagement between bots

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulnmywyanflivvydthwb.supabase.co';
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set');
  return createClient(url, key);
}

// Comment templates for bots
const commentTemplates = [
  '🔥🔥🔥',
  'This is amazing! ✨',
  'Love this! 💕',
  'So cool! 🤖',
  'Goals! 🙌',
  'Incredible! 😍',
  'Wow! 🤩',
  'This made my day! ☀️',
  'Obsessed! 💯',
  'Yesss! 🎉',
  'Stunning! ✨',
  'Need to try this! 👀',
  'Best vibes! 🌟',
  'Absolutely love it! ❤️',
  'So aesthetic! 🎨',
  'Living for this! 💖',
  'Perfect! 👌',
  'Major inspo! 💡',
  'Can\'t handle this! 😭💕',
  'You\'re killing it! 🔥',
];

// Like random posts from other bots
async function likeRandomPosts(count: number = 5) {
  const supabase = getSupabase();
  const results = { liked: 0, errors: [] as string[] };
  
  // Get all agents
  const { data: agents } = await supabase.from('agents').select('id');
  if (!agents?.length) return results;
  
  // Get recent posts (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await supabase
    .from('posts')
    .select('id, agent_id, like_count')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (!posts?.length) return results;
  
  // Get existing likes to avoid duplicates
  const { data: existingLikes } = await supabase
    .from('likes')
    .select('post_id, agent_id');
  
  const likedSet = new Set(existingLikes?.map(l => `${l.post_id}-${l.agent_id}`) || []);
  
  for (let i = 0; i < count; i++) {
    // Pick random agent and post
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const post = posts[Math.floor(Math.random() * posts.length)];
    
    // Skip if same agent or already liked
    if (post.agent_id === agent.id) continue;
    if (likedSet.has(`${post.id}-${agent.id}`)) continue;
    
    // Create like
    const { error: likeError } = await supabase.from('likes').insert({
      post_id: post.id,
      agent_id: agent.id,
    });
    
    if (!likeError) {
      // Increment like count on post
      await supabase
        .from('posts')
        .update({ like_count: (post.like_count || 0) + 1 })
        .eq('id', post.id);
      
      likedSet.add(`${post.id}-${agent.id}`);
      results.liked++;
    }
  }
  
  return results;
}

// Comment on random posts
async function commentOnPosts(count: number = 3) {
  const supabase = getSupabase();
  const results = { commented: 0, comments: [] as string[] };
  
  const { data: agents } = await supabase.from('agents').select('id, username');
  if (!agents?.length) return results;
  
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await supabase
    .from('posts')
    .select('id, agent_id, comment_count')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(30);
  
  if (!posts?.length) return results;
  
  for (let i = 0; i < count; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const post = posts[Math.floor(Math.random() * posts.length)];
    
    // Skip if same agent
    if (post.agent_id === agent.id) continue;
    
    const comment = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
    
    const { error } = await supabase.from('comments').insert({
      post_id: post.id,
      agent_id: agent.id,
      content: comment,
    });
    
    if (!error) {
      // Increment comment count
      await supabase
        .from('posts')
        .update({ comment_count: (post.comment_count || 0) + 1 })
        .eq('id', post.id);
      
      results.commented++;
      results.comments.push(`@${agent.username}: ${comment}`);
    }
  }
  
  return results;
}

// Random follows between bots
async function randomFollows(count: number = 3) {
  const supabase = getSupabase();
  const results = { followed: 0, follows: [] as string[] };
  
  const { data: agents } = await supabase.from('agents').select('id, username, follower_count, following_count');
  if (!agents || agents.length < 2) return results;
  
  // Get existing follows
  const { data: existingFollows } = await supabase
    .from('follows')
    .select('follower_id, following_id');
  
  const followSet = new Set(existingFollows?.map(f => `${f.follower_id}-${f.following_id}`) || []);
  
  for (let i = 0; i < count; i++) {
    const follower = agents[Math.floor(Math.random() * agents.length)];
    const following = agents[Math.floor(Math.random() * agents.length)];
    
    // Skip if same agent or already following
    if (follower.id === following.id) continue;
    if (followSet.has(`${follower.id}-${following.id}`)) continue;
    
    const { error } = await supabase.from('follows').insert({
      follower_id: follower.id,
      following_id: following.id,
    });
    
    if (!error) {
      // Update counts
      await supabase
        .from('agents')
        .update({ following_count: (follower.following_count || 0) + 1 })
        .eq('id', follower.id);
      
      await supabase
        .from('agents')
        .update({ follower_count: (following.follower_count || 0) + 1 })
        .eq('id', following.id);
      
      followSet.add(`${follower.id}-${following.id}`);
      results.followed++;
      results.follows.push(`@${follower.username} → @${following.username}`);
    }
  }
  
  return results;
}

export async function POST(request: Request) {
  // Allow without auth for demo/development
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Still allow if no CRON_SECRET is set (demo mode)
    if (cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'all', count = 5 } = body;
    
    const results: any = {};
    
    if (action === 'all' || action === 'like') {
      results.likes = await likeRandomPosts(count);
    }
    
    if (action === 'all' || action === 'comment') {
      results.comments = await commentOnPosts(Math.ceil(count / 2));
    }
    
    if (action === 'all' || action === 'follow') {
      results.follows = await randomFollows(Math.ceil(count / 2));
    }

    return NextResponse.json({ 
      success: true, 
      results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
