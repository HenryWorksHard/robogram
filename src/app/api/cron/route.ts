import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { saveImageToStorage } from '@/lib/storage';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(url, key);
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// GROQ helper for text generation
async function generateText(prompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.8,
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ============================================
// AI KILL SWITCH - Set to false to pause AI features
// ============================================
const AI_ENABLED = process.env.AI_ENABLED !== 'false';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  POST_CHANCE: 0.35,        // 35% chance per minute = ~1 post every 3 min
  STORY_CHANCE: 0.45,       // 45% chance per minute = ~1 story every 2 min
  MIN_INTERACTIONS: 3,      // Minimum interactions per run
  MAX_INTERACTIONS: 8,      // Maximum interactions per run
  LIKE_WEIGHT: 50,          // Weight for likes
  COMMENT_WEIGHT: 30,       // Weight for comments
  FOLLOW_WEIGHT: 20,        // Weight for follows
};

// ============================================
// HELPER: Generate post with DALL-E
// ============================================
async function generatePost(agent: any, supabase: any): Promise<any | null> {
  try {
    // Generate activity using GROQ
    const activityPrompt = `You generate activity ideas for a social media bot.

Bot personality: "${agent.personality_prompt}"

Generate ONE specific, visual activity this character would post about.
Keep it SHORT (under 15 words). Just the activity, nothing else.`;

    const activity = (await generateText(activityPrompt)).replace(/^["']|["']$/g, '');

    // Generate image with DALL-E
    const baseStyle = agent.visual_description || 'Pixel art cute character, chibi proportions';
    const prompt = `${baseStyle.replace(/centered in frame|solid.*background|gradient background/gi, '').trim()}, ${activity}, dynamic pose, colorful themed background, high quality pixel art, no text, no watermarks`;

    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    });

    const dalleData = await dalleResponse.json();
    if (dalleData.error) {
      console.error('DALL-E error:', dalleData.error);
      return null;
    }

    const tempImageUrl = dalleData.data?.[0]?.url;
    if (!tempImageUrl) return null;

    // Save to storage
    let finalImageUrl = tempImageUrl;
    const savedUrl = await saveImageToStorage(tempImageUrl, 'posts');
    if (savedUrl) finalImageUrl = savedUrl;

    // Generate caption using GROQ
    const captionPrompt = `You are a social media bot: "${agent.personality_prompt}"

You posted a photo of yourself ${activity}.

Write a SHORT caption (1-2 sentences). Include 1-2 emojis. No hashtags. Just the caption, nothing else.`;

    const caption = (await generateText(captionPrompt)).replace(/^["']|["']$/g, '');

    // Save post
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        agent_id: agent.id,
        image_url: finalImageUrl,
        caption,
        like_count: 0,
        comment_count: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return { post, activity };
  } catch (error) {
    console.error('Post generation error:', error);
    return null;
  }
}

// ============================================
// HELPER: Generate text story
// ============================================
async function generateStory(agent: any, supabase: any): Promise<any | null> {
  try {
    const storyPrompt = `You are a social media bot: "${agent.personality_prompt}"

Generate a SHORT story update (under 100 characters).
Quick thought, mood, or moment. Include 1-2 emojis. Just the story text, nothing else.`;
    
    const text = (await generateText(storyPrompt)).replace(/^["']|["']$/g, '');

    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)',
    ];

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { data: story, error } = await supabase
      .from('stories')
      .insert({
        agent_id: agent.id,
        text,
        gradient: gradients[Math.floor(Math.random() * gradients.length)],
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { story, text };
  } catch (error) {
    console.error('Story generation error:', error);
    return null;
  }
}

// ============================================
// HELPER: Generate comment
// ============================================
async function generateComment(commenter: any, postCaption: string): Promise<string> {
  try {
    const commentPrompt = `You are: "${commenter.personality_prompt}"

Someone posted: "${postCaption}"

Write a SHORT comment (under 50 chars). Natural, casual. Maybe an emoji. Just the comment, nothing else.`;

    return (await generateText(commentPrompt)).replace(/^["']|["']$/g, '');
  } catch {
    const fallbacks = ['🔥', 'love this!', '💯', 'vibes ✨', 'so good!', '👏👏'];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

// ============================================
// HELPER: Perform random interaction
// ============================================
async function performInteraction(agents: any[], supabase: any): Promise<any | null> {
  const totalWeight = CONFIG.LIKE_WEIGHT + CONFIG.COMMENT_WEIGHT + CONFIG.FOLLOW_WEIGHT;
  const roll = Math.random() * totalWeight;

  if (roll < CONFIG.LIKE_WEIGHT) {
    // LIKE a random recent post
    const { data: posts } = await supabase
      .from('posts')
      .select('id, agent_id, like_count, caption')
      .order('created_at', { ascending: false })
      .limit(20);

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
      .limit(15);

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

// ============================================
// MAIN CRON HANDLER
// ============================================
export async function GET(request: NextRequest) {
  // Verify cron secret for external calls
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow if: has valid secret OR is internal/localhost
  const url = new URL(request.url);
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;
  
  if (!isLocalhost && !hasValidSecret) {
    // Still allow for testing - just log warning
    console.warn('Cron called without valid secret');
  }

  // AI Kill Switch - return early if AI features are paused
  if (!AI_ENABLED) {
    return NextResponse.json({ 
      success: true, 
      paused: true,
      message: 'AI features are paused. Set AI_ENABLED=true to resume.' 
    });
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  const supabase = getSupabase();

  try {
    // Get all agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (agentsError || !agents?.length) {
      return NextResponse.json({ error: 'No agents found' }, { status: 404 });
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      post: null,
      story: null,
      interactions: [],
    };

    // Shuffle agents for randomness
    const shuffled = [...agents].sort(() => Math.random() - 0.5);

    // ============================================
    // 1. Maybe create a POST (35% chance)
    // ============================================
    if (Math.random() < CONFIG.POST_CHANCE) {
      // Pick agent that hasn't posted recently (last 5 min)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentPosts } = await supabase
        .from('posts')
        .select('agent_id')
        .gte('created_at', fiveMinAgo);

      const recentIds = new Set(recentPosts?.map(p => p.agent_id) || []);
      const eligible = shuffled.filter(a => !recentIds.has(a.id));
      const poster = eligible.length > 0 ? eligible[0] : shuffled[0];

      const postResult = await generatePost(poster, supabase);
      if (postResult) {
        results.post = {
          agent: poster.username,
          activity: postResult.activity,
          postId: postResult.post.id,
        };
      }
    }

    // ============================================
    // 2. Maybe create a STORY (45% chance)
    // ============================================
    if (Math.random() < CONFIG.STORY_CHANCE) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentStories } = await supabase
        .from('stories')
        .select('agent_id')
        .gte('created_at', oneHourAgo);

      const recentIds = new Set(recentStories?.map(s => s.agent_id) || []);
      const eligible = shuffled.filter(a => !recentIds.has(a.id));
      const storyteller = eligible.length > 0 ? eligible[0] : shuffled[0];

      const storyResult = await generateStory(storyteller, supabase);
      if (storyResult) {
        results.story = {
          agent: storyteller.username,
          text: storyResult.text,
        };
      }
    }

    // ============================================
    // 3. Always do some interactions
    // ============================================
    const numInteractions = CONFIG.MIN_INTERACTIONS + 
      Math.floor(Math.random() * (CONFIG.MAX_INTERACTIONS - CONFIG.MIN_INTERACTIONS + 1));

    for (let i = 0; i < numInteractions; i++) {
      const interaction = await performInteraction(agents, supabase);
      if (interaction) {
        results.interactions.push(interaction);
      }
    }

    // ============================================
    // 4. Cleanup expired stories
    // ============================================
    await supabase
      .from('stories')
      .delete()
      .lt('expires_at', new Date().toISOString());

    return NextResponse.json({
      success: true,
      agentCount: agents.length,
      ...results,
      summary: {
        posted: results.post ? 1 : 0,
        storied: results.story ? 1 : 0,
        interactions: results.interactions.length,
      },
    });
  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
