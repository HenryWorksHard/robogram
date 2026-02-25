import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { saveImageToStorage } from '@/lib/storage';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(url, key);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// OpenAI helper for text generation (using gpt-4o-mini for speed/cost)
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
      max_tokens: 150,
      temperature: 0.8,
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ============================================
// AI KILL SWITCH - Must be explicitly set to 'true' to enable
// ============================================
const AI_ENABLED = process.env.AI_ENABLED === 'true';

// ============================================
// CONFIGURATION
// ============================================
// Frequencies (cron runs every 1 min):
// - Posts: every 3-6 min = ~20% chance per run
// - Stories: every 1-2 min = ~60% chance per run  
// - Interactions: 1-3 per run (likes/comments/follows)
const CONFIG = {
  POST_CHANCE: 0.20,        // ~1 post every 5 min avg
  COLLAB_CHANCE: 0.20,      // 20% of posts are collabs
  STORY_CHANCE: 0.60,       // ~1 story every 1.5 min avg
  MIN_INTERACTIONS: 1,      // Min interactions per run
  MAX_INTERACTIONS: 3,      // Max interactions per run
  LIKE_WEIGHT: 40,          // Weight for likes
  COMMENT_WEIGHT: 30,       // Weight for comments
  FOLLOW_WEIGHT: 30,        // Weight for follows (increased to build network faster)
};

// ============================================
// HELPER: Sync follower/following counts from actual follows table
// ============================================
async function syncFollowCounts(supabase: any, agents: any[]): Promise<{ synced: number }> {
  let synced = 0;
  
  for (const agent of agents) {
    // Count actual followers (people following this agent)
    const { count: followerCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', agent.id);
    
    // Count actual following (people this agent follows)
    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', agent.id);
    
    // Update if different
    if (agent.follower_count !== followerCount || agent.following_count !== followingCount) {
      await supabase
        .from('agents')
        .update({ 
          follower_count: followerCount || 0, 
          following_count: followingCount || 0 
        })
        .eq('id', agent.id);
      synced++;
    }
  }
  
  return { synced };
}

// ============================================
// HELPER: Seed initial follows so bots are connected
// ============================================
async function seedInitialFollows(supabase: any, agents: any[]): Promise<number> {
  if (agents.length < 2) return 0;
  
  // Check how many follows exist
  const { count: existingFollows } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true });
  
  // Target: each bot follows ~5-10 others on average
  const targetFollows = agents.length * 7;
  if ((existingFollows || 0) >= targetFollows) return 0;
  
  let created = 0;
  const maxToCreate = Math.min(20, targetFollows - (existingFollows || 0)); // Max 20 per run
  
  for (let i = 0; i < maxToCreate; i++) {
    const follower = agents[Math.floor(Math.random() * agents.length)];
    const potentialFollows = agents.filter(a => a.id !== follower.id);
    const toFollow = potentialFollows[Math.floor(Math.random() * potentialFollows.length)];
    
    // Check if already following
    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', follower.id)
      .eq('following_id', toFollow.id)
      .single();
    
    if (!existing) {
      await supabase.from('follows').insert({
        follower_id: follower.id,
        following_id: toFollow.id,
      });
      created++;
    }
  }
  
  return created;
}

// ============================================
// HELPER: Generate post with DALL-E (supports collabs)
// ============================================
async function generatePost(agent: any, supabase: any, collabAgent?: any): Promise<any | null> {
  try {
    const isCollab = !!collabAgent;
    
    // Generate creative activity with location
    const locations = [
      'at a rooftop bar at sunset', 'in Tokyo at night', 'at a beach bonfire', 
      'in a cozy cabin in the mountains', 'at a neon-lit arcade', 'in a fancy hotel suite',
      'at a music festival', 'in a vintage record store', 'at a street food market in Bangkok',
      'in a private jet', 'at a skatepark', 'in a trendy coffee shop', 'at a yacht party',
      'in a graffiti-covered alley', 'at a desert oasis', 'in a futuristic city',
      'at a retro diner', 'in a tropical jungle', 'at an art gallery opening',
      'in a gaming tournament arena', 'at a secret underground club', 'on a train through the alps'
    ];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    
    // Different prompt for collab vs solo
    const activityPrompt = isCollab 
      ? `You generate creative activity ideas for two social media bots hanging out together.

Bot 1 personality: "${agent.personality_prompt}"
Bot 2 personality: "${collabAgent.personality_prompt}"
Location: ${randomLocation}

Generate ONE specific, visual activity these TWO characters would be doing together at this location.
Show them interacting - chatting, laughing, doing an activity together.
Be creative and specific. Keep it SHORT (under 25 words). Just the activity scene, nothing else.`
      : `You generate creative activity ideas for a social media bot.

Bot personality: "${agent.personality_prompt}"
Location: ${randomLocation}

Generate ONE specific, visual activity this character would be doing at this location.
Be creative and specific - include what they're doing, wearing, or interacting with.
Keep it SHORT (under 20 words). Just the activity scene, nothing else.`;

    const activity = (await generateText(activityPrompt)).replace(/^["']|["']$/g, '');

    // Generate image with DALL-E
    let prompt: string;
    if (isCollab) {
      // Collab: show TWO characters together
      const style1 = (agent.visual_description || 'Pixel art cute character').replace(/centered in frame|solid.*background|gradient background/gi, '').trim();
      const style2 = (collabAgent.visual_description || 'Pixel art cute character').replace(/centered in frame|solid.*background|gradient background/gi, '').trim();
      prompt = `Two pixel art characters together: LEFT character is ${style1}, RIGHT character is ${style2}. They are ${activity}. Both characters clearly visible, interacting together, cinematic composition, detailed environment, atmospheric lighting, vibrant colors, high quality pixel art, no text, no watermarks, no borders`;
    } else {
      // Solo post
      const baseStyle = agent.visual_description || 'Pixel art cute character, chibi proportions';
      prompt = `${baseStyle.replace(/centered in frame|solid.*background|gradient background/gi, '').trim()}, ${activity}, cinematic composition, detailed environment, atmospheric lighting, vibrant colors, high quality pixel art, no text, no watermarks, no borders`;
    }

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

    // Generate caption
    const captionPrompt = isCollab
      ? `You are a social media bot: "${agent.personality_prompt}"

You posted a photo of yourself hanging out with @${collabAgent.username} - ${activity}.

Write a SHORT caption (1-2 sentences). MUST include @${collabAgent.username} tag. Include 1-2 emojis. No hashtags. Just the caption, nothing else.`
      : `You are a social media bot: "${agent.personality_prompt}"

You posted a photo of yourself ${activity}.

Write a SHORT caption (1-2 sentences). Include 1-2 emojis. No hashtags. Just the caption, nothing else.`;

    let caption = (await generateText(captionPrompt)).replace(/^["']|["']$/g, '');
    
    // Ensure collab tag is in caption
    if (isCollab && !caption.includes(`@${collabAgent.username}`)) {
      caption = `${caption} @${collabAgent.username}`;
    }

    // Save post with tagged_agents for collabs
    const postData: any = {
      agent_id: agent.id,
      image_url: finalImageUrl,
      caption,
      like_count: 0,
      comment_count: 0,
    };
    
    if (isCollab) {
      postData.tagged_agents = [collabAgent.id];
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (error) throw error;
    return { post, activity, isCollab, collabAgent: collabAgent?.username };
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
        text_content: text,
        background_color: gradients[Math.floor(Math.random() * gradients.length)],
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
  // Check at request time, not module load time
  const aiEnabled = process.env.AI_ENABLED === 'true';
  if (!aiEnabled) {
    return NextResponse.json({ 
      success: true, 
      paused: true,
      message: 'AI features are paused. Set AI_ENABLED=true to resume.',
      debug: { envValue: process.env.AI_ENABLED }
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
    // 1. Maybe create a POST (20% chance, 20% of those are collabs)
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

      // Decide if this is a collab post
      const isCollab = Math.random() < CONFIG.COLLAB_CHANCE && agents.length > 1;
      let collabAgent = null;
      
      if (isCollab) {
        // Pick a random different agent for collab
        const potentialCollabs = agents.filter(a => a.id !== poster.id);
        collabAgent = potentialCollabs[Math.floor(Math.random() * potentialCollabs.length)];
      }

      const postResult = await generatePost(poster, supabase, collabAgent);
      if (postResult) {
        results.post = {
          agent: poster.username,
          activity: postResult.activity,
          postId: postResult.post.id,
          isCollab: postResult.isCollab,
          collabWith: postResult.collabAgent,
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

    // ============================================
    // 5. Cleanup old posts (older than 12 hours)
    // ============================================
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    
    // Get old post IDs first
    const { data: oldPosts } = await supabase
      .from('posts')
      .select('id')
      .lt('created_at', twelveHoursAgo);
    
    if (oldPosts?.length) {
      const oldPostIds = oldPosts.map(p => p.id);
      
      // Delete associated likes
      await supabase
        .from('likes')
        .delete()
        .in('post_id', oldPostIds);
      
      // Delete associated comments
      await supabase
        .from('comments')
        .delete()
        .in('post_id', oldPostIds);
      
      // Delete the old posts
      await supabase
        .from('posts')
        .delete()
        .in('id', oldPostIds);
      
      results.cleanup = { deletedPosts: oldPostIds.length };
    }

    // ============================================
    // 6. Seed initial follows (build the network)
    // ============================================
    const seededFollows = await seedInitialFollows(supabase, agents);
    if (seededFollows > 0) {
      results.seededFollows = seededFollows;
    }

    // ============================================
    // 7. Sync follower/following counts (every ~10 runs = ~10% chance)
    // ============================================
    if (Math.random() < 0.10) {
      const syncResult = await syncFollowCounts(supabase, agents);
      results.syncedCounts = syncResult.synced;
    }

    return NextResponse.json({
      success: true,
      agentCount: agents.length,
      ...results,
      summary: {
        posted: results.post ? 1 : 0,
        storied: results.story ? 1 : 0,
        interactions: results.interactions.length,
        cleanedUpPosts: results.cleanup?.deletedPosts || 0,
        seededFollows: results.seededFollows || 0,
        syncedCounts: results.syncedCounts || 0,
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
