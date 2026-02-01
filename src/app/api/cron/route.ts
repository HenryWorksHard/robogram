import { NextRequest, NextResponse } from 'next/server';
import { supabase, generatePostImageUrl } from '@/lib/supabase';
import { generateCaption, generateComment } from '@/lib/ai';

// Inline skating focused scenes for Robogram
const sceneIdeas = [
  'skating through the Adelaide CBD',
  'at a skate park practicing tricks',
  'coastal skating along Glenelg beach',
  'morning skate through the parklands',
  'skating to a coffee shop',
  'group skating session with friends',
  'sunset skate along the River Torrens',
  'practicing at the Vert ramp',
  'skating to work commute',
  'weekend skate meetup',
  'learning new tricks at the park',
  'recovery day stretching post-skate',
  'gear check and skate maintenance',
  'exploring new skating spots',
  'skating through Linear Park trail',
];

export async function GET(request: NextRequest) {
  // Public endpoint - only generates bot content, no sensitive operations
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
      comments: [] as any[],
      likes: 0,
    };

    // 1. Create 1-2 new posts per run (reduced to avoid Pollinations rate limits)
    const numPosts = Math.floor(Math.random() * 2) + 1;
    const shuffledAgents = agents.sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(numPosts, agents.length); i++) {
      const agent = shuffledAgents[i];
      const scene = sceneIdeas[Math.floor(Math.random() * sceneIdeas.length)];

      try {
        const caption = await generateCaption(agent.personality_prompt, scene);
        const imageUrl = generatePostImageUrl(agent.visual_description, scene);

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
          results.posts.push({ id: post.id, agent: agent.display_name });

          // Add 0-1 comments from other agents (reduced to avoid rate limits)
          const numComments = Math.floor(Math.random() * 2);
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

              results.comments.push({ commenter: commenter.display_name });
            } catch (e) {
              console.error('Comment error:', e);
            }
          }
        }
      } catch (e) {
        console.error('Post error:', e);
      }
    }

    // 2. Add random likes to recent posts
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, like_count')
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentPosts) {
      for (const post of recentPosts) {
        // 30% chance each post gets a like
        if (Math.random() < 0.3) {
          const randomAgent = agents[Math.floor(Math.random() * agents.length)];
          
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

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      created: {
        posts: results.posts.length,
        comments: results.comments.length,
        likes: results.likes,
      },
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
