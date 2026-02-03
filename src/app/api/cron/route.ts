import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateCaption, generateComment } from '@/lib/ai';
import { 
  generatePostImageUrl, 
  generateStory,
  detectInterests,
  generateIdentityPrompt,
} from '@/lib/images';

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
      identitiesGenerated: 0,
    };

    // ============================================
    // 0. ENSURE ALL AGENTS HAVE IDENTITY PROMPTS
    // ============================================
    for (const agent of agents) {
      if (!agent.identity_prompt) {
        const interests = detectInterests(agent.personality_prompt);
        const identityPrompt = generateIdentityPrompt(interests);
        
        // Save to database
        await supabase
          .from('agents')
          .update({ identity_prompt: identityPrompt })
          .eq('id', agent.id);
        
        agent.identity_prompt = identityPrompt;
        results.identitiesGenerated++;
      }
    }

    // Shuffle agents for randomness
    const shuffledAgents = agents.sort(() => Math.random() - 0.5);

    // ============================================
    // 1. CREATE POSTS (1-3 per run)
    // ============================================
    const numPosts = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < Math.min(numPosts, agents.length); i++) {
      const agent = shuffledAgents[i];
      
      try {
        // Generate post image using identity prompt (FREE via Pollinations)
        const { imageUrl, activity, background } = generatePostImageUrl({
          identityPrompt: agent.identity_prompt,
          personalityPrompt: agent.personality_prompt,
        });
        
        // Generate caption with Groq (FREE)
        const caption = await generateCaption(agent.personality_prompt, activity);

        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert({
            agent_id: agent.id,
            image_url: imageUrl,
            caption,
          })
          .select()
          .single();

        if (!postError && post) {
          results.posts.push({ 
            id: post.id, 
            agent: agent.display_name,
            activity,
            background,
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
                caption,
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
      } catch (e) {
        console.error('Post error:', e);
      }
    }

    // ============================================
    // 2. CREATE STORIES (1-2 per run, text-only)
    // ============================================
    const numStories = Math.floor(Math.random() * 2) + 1;
    const storyAgents = shuffledAgents
      .slice(numPosts, numPosts + numStories);

    for (const agent of storyAgents) {
      try {
        const { text, backgroundColor } = generateStory({
          personalityPrompt: agent.personality_prompt,
        });
        
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await supabase.from('stories').insert({
          agent_id: agent.id,
          text_content: text,
          background_color: backgroundColor,
          expires_at: expiresAt.toISOString(),
        });

        results.stories.push({ agent: agent.display_name, text });
      } catch (e) {
        console.error('Story error:', e);
      }
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
      activity: {
        posts: results.posts.length,
        stories: results.stories.length,
        comments: results.comments.length,
        likes: results.likes,
        follows: results.follows,
        identitiesGenerated: results.identitiesGenerated,
      },
      details: results,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
