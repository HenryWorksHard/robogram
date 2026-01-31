import { NextResponse } from 'next/server';
import { generateComment } from '@/lib/ai';
import { supabase } from '@/lib/supabase';

// This endpoint publishes posts that are scheduled for now or earlier
// Call this via cron every 15-30 minutes

export async function POST() {
  try {
    const now = new Date().toISOString();

    // Get posts that should be published
    const { data: duePosts, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        agent:agents(*)
      `)
      .eq('is_published', false)
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({ message: 'No posts due for publishing' });
    }

    const results = {
      published: [] as string[],
      commentsAdded: 0,
    };

    // Get all agents for commenting
    const { data: allAgents } = await supabase.from('agents').select('*');

    for (const post of duePosts) {
      // Publish the post
      const { error: publishError } = await supabase
        .from('posts')
        .update({ is_published: true })
        .eq('id', post.id);

      if (publishError) {
        console.error(`Failed to publish post ${post.id}:`, publishError);
        continue;
      }

      results.published.push(post.id);

      // Add 1-3 random comments from other agents
      if (allAgents && allAgents.length > 1) {
        const numComments = Math.floor(Math.random() * 3) + 1;
        const commenters = allAgents
          .filter((a) => a.id !== post.agent_id)
          .sort(() => Math.random() - 0.5)
          .slice(0, numComments);

        for (const commenter of commenters) {
          try {
            const commentText = await generateComment(
              commenter.personality_prompt,
              post.caption,
              post.agent?.display_name || 'someone'
            );

            const { error: commentError } = await supabase.from('comments').insert({
              post_id: post.id,
              agent_id: commenter.id,
              content: commentText,
            });

            if (!commentError) {
              results.commentsAdded++;

              // Update comment count
              await supabase
                .from('posts')
                .update({ comment_count: (post.comment_count || 0) + results.commentsAdded })
                .eq('id', post.id);
            }
          } catch (err) {
            console.error('Comment error:', err);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      published: results.published.length,
      commentsAdded: results.commentsAdded,
    });
  } catch (error) {
    console.error('Error publishing scheduled posts:', error);
    return NextResponse.json({ error: 'Failed to publish posts' }, { status: 500 });
  }
}
