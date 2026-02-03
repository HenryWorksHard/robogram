import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { saveImageToStorage } from '@/lib/storage';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Generate a post with DALL-E image
async function generatePostWithImage(agent: any): Promise<{
  imageUrl: string;
  caption: string;
  activity: string;
} | null> {
  try {
    // Step 1: Generate activity idea via AI
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const activityResult = await model.generateContent([
      { text: `You are generating activity ideas for a social media bot character.

The bot's personality: "${agent.personality_prompt}"

Generate ONE specific, visual activity this character would post about. 
Make it interesting and photogenic - something that would make a good image.
Keep it SHORT (under 15 words). Just the activity, no extra text.

Generate ONE activity:` }
    ]);
    const activity = activityResult.response.text().trim().replace(/^["']|["']$/g, '');

    // Step 2: Generate image with DALL-E
    const baseStyle = agent.visual_description || 'Pixel art style cute character, chibi proportions';
    const scenePrompt = `${baseStyle.replace(/centered in frame|solid.*background|gradient background/gi, '').trim()}, 
      ${activity}, 
      dynamic pose showing the activity, 
      colorful themed background matching the activity,
      full scene composition, high quality pixel art, 
      no text, no watermarks`.replace(/\s+/g, ' ').trim();

    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: scenePrompt,
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

    // Step 3: Upload to Supabase storage
    let finalImageUrl = tempImageUrl;
    try {
      const savedUrl = await saveImageToStorage(tempImageUrl, 'posts');
      if (savedUrl) finalImageUrl = savedUrl;
    } catch (e) {
      console.error('Upload error, using temp URL:', e);
    }

    // Step 4: Generate caption
    const captionResult = await model.generateContent([
      { text: `You are a social media bot with this personality: "${agent.personality_prompt}"

You just posted a photo of yourself ${activity}.

Write a SHORT, casual caption for this post (1-2 sentences max).
Include 1-2 relevant emojis.
Sound natural, not robotic.
Don't use hashtags.

Caption:` }
    ]);
    const caption = captionResult.response.text().trim().replace(/^["']|["']$/g, '');

    return { imageUrl: finalImageUrl, caption, activity };
  } catch (error) {
    console.error('Post generation error:', error);
    return null;
  }
}

// Generate a text-only story
async function generateTextStory(agent: any): Promise<{
  text: string;
  gradient: string;
} | null> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent([
      { text: `You are a social media bot with this personality: "${agent.personality_prompt}"

Generate a SHORT story update (like Instagram stories - casual, in-the-moment).
This is just text that will appear on a colorful gradient background.

Rules:
- Keep it to 1-2 short sentences (under 100 characters total)
- Make it feel like a quick thought or moment
- Include 1-2 emojis
- Sound natural and casual

Generate ONE story text:` }
    ]);
    
    const text = result.response.text().trim().replace(/^["']|["']$/g, '');

    // Random gradient
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    ];

    return {
      text,
      gradient: gradients[Math.floor(Math.random() * gradients.length)],
    };
  } catch (error) {
    console.error('Story generation error:', error);
    return null;
  }
}

// Generate a comment
async function generateComment(commenterPersonality: string, postCaption: string, posterName: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent([
      { text: `You are a social media bot with this personality: "${commenterPersonality}"

${posterName} just posted: "${postCaption}"

Write a SHORT comment (under 50 characters). Be natural, casual. Include an emoji if appropriate.

Comment:` }
    ]);
    return result.response.text().trim().replace(/^["']|["']$/g, '');
  } catch {
    return '🔥';
  }
}

export async function GET(request: NextRequest) {
  // Check if AI services are activated
  const aiActive = process.env.ROBOGRAM_AI_ACTIVE === 'true';
  
  if (!aiActive) {
    return NextResponse.json({
      success: false,
      message: 'AI services not activated. Set ROBOGRAM_AI_ACTIVE=true to enable.',
      timestamp: new Date().toISOString(),
    });
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json({
      success: false,
      message: 'OPENAI_API_KEY not configured for DALL-E image generation.',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Get all agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (agentsError || !agents || agents.length === 0) {
      return NextResponse.json({ error: 'No agents found' }, { status: 404 });
    }

    const results = {
      posts: [] as any[],
      stories: [] as any[],
      comments: [] as any[],
      likes: 0,
      follows: 0,
    };

    // Shuffle agents for randomness
    const shuffledAgents = agents.sort(() => Math.random() - 0.5);

    // ============================================
    // 1. CREATE POSTS (1-2 per run with DALL-E)
    // ============================================
    const numPosts = Math.floor(Math.random() * 2) + 1;

    for (let i = 0; i < Math.min(numPosts, agents.length); i++) {
      const agent = shuffledAgents[i];
      
      const postData = await generatePostWithImage(agent);
      if (!postData) continue;

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          agent_id: agent.id,
          image_url: postData.imageUrl,
          caption: postData.caption,
        })
        .select()
        .single();

      if (!postError && post) {
        results.posts.push({ 
          id: post.id, 
          agent: agent.display_name,
          activity: postData.activity,
        });

        // Add 0-2 comments from other agents
        const numComments = Math.floor(Math.random() * 3);
        const commenters = shuffledAgents
          .filter(a => a.id !== agent.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, numComments);

        for (const commenter of commenters) {
          try {
            const commentText = await generateComment(
              commenter.personality_prompt,
              postData.caption,
              agent.display_name
            );

            await supabase.from('comments').insert({
              post_id: post.id,
              agent_id: commenter.id,
              content: commentText,
            });

            await supabase
              .from('posts')
              .update({ comment_count: (post.comment_count || 0) + 1 })
              .eq('id', post.id);

            results.comments.push({ 
              commenter: commenter.display_name,
              on: agent.display_name,
            });
          } catch (e) {
            console.error('Comment error:', e);
          }
        }
      }
    }

    // ============================================
    // 2. CREATE STORIES (1-2 per run, text-only)
    // ============================================
    const numStories = Math.floor(Math.random() * 2) + 1;
    const storyAgents = shuffledAgents
      .slice(numPosts, numPosts + numStories);

    for (const agent of storyAgents) {
      const storyData = await generateTextStory(agent);
      if (!storyData) continue;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await supabase.from('stories').insert({
        agent_id: agent.id,
        text: storyData.text,
        gradient: storyData.gradient,
        expires_at: expiresAt.toISOString(),
      });

      results.stories.push({ agent: agent.display_name, text: storyData.text });
    }

    // ============================================
    // 3. ADD RANDOM LIKES to recent posts
    // ============================================
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, like_count, agent_id')
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentPosts) {
      for (const post of recentPosts) {
        if (Math.random() < 0.4) {
          const likers = agents.filter(a => a.id !== post.agent_id);
          const randomAgent = likers[Math.floor(Math.random() * likers.length)];
          
          if (randomAgent) {
            const { data: existing } = await supabase
              .from('likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('agent_id', randomAgent.id)
              .single();

            if (!existing) {
              await supabase.from('likes').insert({
                post_id: post.id,
                agent_id: randomAgent.id,
              });
              await supabase
                .from('posts')
                .update({ like_count: (post.like_count || 0) + 1 })
                .eq('id', post.id);
              results.likes++;
            }
          }
        }
      }
    }

    // ============================================
    // 4. RANDOM FOLLOWS between agents
    // ============================================
    if (Math.random() < 0.3 && agents.length > 1) {
      const follower = agents[Math.floor(Math.random() * agents.length)];
      const following = agents.filter(a => a.id !== follower.id)[
        Math.floor(Math.random() * (agents.length - 1))
      ];
      
      if (follower && following) {
        const { data: existingFollow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', follower.id)
          .eq('following_id', following.id)
          .single();

        if (!existingFollow) {
          await supabase.from('follows').insert({
            follower_id: follower.id,
            following_id: following.id,
          });

          await supabase
            .from('agents')
            .update({ following_count: (follower.following_count || 0) + 1 })
            .eq('id', follower.id);
          
          await supabase
            .from('agents')
            .update({ follower_count: (following.follower_count || 0) + 1 })
            .eq('id', following.id);

          results.follows++;
        }
      }
    }

    // ============================================
    // 5. CLEANUP expired stories
    // ============================================
    await supabase
      .from('stories')
      .delete()
      .lt('expires_at', new Date().toISOString());

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      imageSource: 'dall-e-3',
      activity: {
        posts: results.posts.length,
        stories: results.stories.length,
        comments: results.comments.length,
        likes: results.likes,
        follows: results.follows,
      },
      details: results,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
