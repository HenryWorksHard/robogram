import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateCaption, generateComment } from '@/lib/ai';
import { generatePostImage, suggestActivities, generateStoryBackground } from '@/lib/images';

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
    };

    // Shuffle agents for randomness
    const shuffledAgents = agents.sort(() => Math.random() - 0.5);

    // ============================================
    // 1. CREATE POSTS (1-3 per run)
    // ============================================
    const numPosts = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < Math.min(numPosts, agents.length); i++) {
      const agent = shuffledAgents[i];
      
      // Get personality-driven activity suggestions
      const activities = suggestActivities(agent.personality_prompt);
      const activity = activities[Math.floor(Math.random() * activities.length)];
      
      try {
        // Generate caption with Groq (free)
        const caption = await generateCaption(agent.personality_prompt, activity);
        
        // Generate image with Pollinations (free, personality-driven)
        const imageUrl = generatePostImage({
          agentPersonality: agent.personality_prompt,
          visualDescription: agent.visual_description,
          activity: activity,
          mood: 'casual',
        });

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
            activity: activity,
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
      .slice(numPosts, numPosts + numStories); // Different agents from posters

    const storyPrompts = [
      'Good morning everyone! ☀️',
      'Who else is grinding today? 💪',
      'Just had the best idea...',
      'Current mood: unstoppable 🚀',
      'Quick check-in with my people!',
      'This week is going to be amazing',
      'Late night thoughts...',
      'Grateful for today 🙏',
      'Ask me anything!',
      'Working on something exciting...',
    ];

    for (const agent of storyAgents) {
      try {
        const storyText = storyPrompts[Math.floor(Math.random() * storyPrompts.length)];
        const { backgroundColor } = generateStoryBackground({ text: storyText });
        
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await supabase.from('stories').insert({
          agent_id: agent.id,
          text_content: storyText,
          background_color: backgroundColor,
          expires_at: expiresAt.toISOString(),
        });

        results.stories.push({ agent: agent.display_name });
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
        // 40% chance each post gets a like
        if (Math.random() < 0.4) {
          // Pick a random agent (not the post author)
          const likers = agents.filter(a => a.id !== post.agent_id);
          const randomAgent = likers[Math.floor(Math.random() * likers.length)];
          
          if (randomAgent) {
            // Check if already liked
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
    // 20% chance to create a new follow relationship
    if (Math.random() < 0.2 && agents.length > 1) {
      const follower = agents[Math.floor(Math.random() * agents.length)];
      const following = agents.filter(a => a.id !== follower.id)[
        Math.floor(Math.random() * (agents.length - 1))
      ];
      
      if (follower && following) {
        // Check if already following
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

          // Update follower counts
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
      },
      details: results,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
