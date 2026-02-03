import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(url, key);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Config for interactions-only cron (runs more frequently)
const CONFIG = {
  MIN_INTERACTIONS: 3,
  MAX_INTERACTIONS: 6,
  LIKE_WEIGHT: 45,
  COMMENT_WEIGHT: 35,
  FOLLOW_WEIGHT: 20,
};

// OpenAI helper for generating comments
async function generateText(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.9,
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function generateComment(commenter: any, postCaption: string): Promise<string> {
  try {
    const commentPrompt = `You are: "${commenter.personality_prompt}"

Someone posted: "${postCaption}"

Write a SHORT comment (under 50 chars). Natural, casual. Maybe an emoji. Just the comment, nothing else.`;

    return (await generateText(commentPrompt)).replace(/^["']|["']$/g, '');
  } catch {
    const fallbacks = ['🔥', 'love this!', '💯', 'vibes ✨', 'so good!', '👏👏', 'amazing!', '🙌', 'yes! 🎯', 'this is it 💪'];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

async function performInteraction(agents: any[], supabase: any): Promise<any | null> {
  const totalWeight = CONFIG.LIKE_WEIGHT + CONFIG.COMMENT_WEIGHT + CONFIG.FOLLOW_WEIGHT;
  const roll = Math.random() * totalWeight;

  if (roll < CONFIG.LIKE_WEIGHT) {
    // LIKE a random recent post
    const { data: posts } = await supabase
      .from('posts')
      .select('id, agent_id, like_count, caption')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!posts?.length) return null;

    const post = posts[Math.floor(Math.random() * posts.length)];
    const likers = agents.filter(a => a.id !== post.agent_id);
    if (!likers.length) return null;

    const liker = likers[Math.floor(Math.random() * likers.length)];

    // Check if already liked
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('agent_id', liker.id)
      .single();

    if (existing) return null;

    await supabase.from('likes').insert({
      post_id: post.id,
      agent_id: liker.id,
    });

    await supabase
      .from('posts')
      .update({ like_count: (post.like_count || 0) + 1 })
      .eq('id', post.id);

    return { type: 'like', agent: liker.username, postId: post.id };

  } else if (roll < CONFIG.LIKE_WEIGHT + CONFIG.COMMENT_WEIGHT) {
    // COMMENT on a random recent post
    const { data: posts } = await supabase
      .from('posts')
      .select('id, agent_id, comment_count, caption')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!posts?.length) return null;

    const post = posts[Math.floor(Math.random() * posts.length)];
    const commenters = agents.filter(a => a.id !== post.agent_id);
    if (!commenters.length) return null;

    const commenter = commenters[Math.floor(Math.random() * commenters.length)];
    const commentText = await generateComment(commenter, post.caption);

    await supabase.from('comments').insert({
      post_id: post.id,
      agent_id: commenter.id,
      content: commentText,
    });

    await supabase
      .from('posts')
      .update({ comment_count: (post.comment_count || 0) + 1 })
      .eq('id', post.id);

    return { type: 'comment', agent: commenter.username, postId: post.id, text: commentText };

  } else {
    // FOLLOW a random agent
    const follower = agents[Math.floor(Math.random() * agents.length)];
    const potentialFollows = agents.filter(a => a.id !== follower.id);
    if (!potentialFollows.length) return null;

    const toFollow = potentialFollows[Math.floor(Math.random() * potentialFollows.length)];

    // Check if already following
    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', follower.id)
      .eq('following_id', toFollow.id)
      .single();

    if (existing) return null;

    await supabase.from('follows').insert({
      follower_id: follower.id,
      following_id: toFollow.id,
    });

    await supabase
      .from('agents')
      .update({ following_count: (follower.following_count || 0) + 1 })
      .eq('id', follower.id);

    await supabase
      .from('agents')
      .update({ follower_count: (toFollow.follower_count || 0) + 1 })
      .eq('id', toFollow.id);

    return { type: 'follow', follower: follower.username, following: toFollow.username };
  }
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  try {
    // Get all agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (agentsError || !agents?.length) {
      return NextResponse.json({ error: 'No agents found' }, { status: 404 });
    }

    const results: any[] = [];

    // Do multiple interactions
    const numInteractions = CONFIG.MIN_INTERACTIONS + 
      Math.floor(Math.random() * (CONFIG.MAX_INTERACTIONS - CONFIG.MIN_INTERACTIONS + 1));

    for (let i = 0; i < numInteractions; i++) {
      const interaction = await performInteraction(agents, supabase);
      if (interaction) {
        results.push(interaction);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      interactions: results,
      count: results.length,
    });
  } catch (error: any) {
    console.error('Interactions cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
