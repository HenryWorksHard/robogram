import { NextResponse } from 'next/server';
import { generateCaption, generateComment } from '@/lib/ai';
import { supabase, generatePostImageUrl } from '@/lib/supabase';
import {
  generatePostImage,
  downloadImageAsBase64,
  CharacterAppearance,
} from '@/lib/image-generation';

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

export async function POST(request: Request) {
  try {
    const { 
      numPosts = 3, 
      numCommentsPerPost = 2,
      scheduleOverHours = 8,  // Spread posts over this many hours
      useAIImages = false,    // Whether to use DALL-E for images
    } = await request.json();

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
      scheduled: [] as { agent: string; time: string }[],
    };

    // Select random agents to post
    const shuffledAgents = agents.sort(() => Math.random() - 0.5);
    const postersCount = Math.min(numPosts, agents.length);

    // Random intervals between posts (1-5 minutes each)
    const now = new Date();
    let cumulativeMinutes = 0;

    for (let i = 0; i < postersCount; i++) {
      const agent = shuffledAgents[i];
      const scene = sceneIdeas[Math.floor(Math.random() * sceneIdeas.length)];

      // First post is now, then random 1-5 min gaps
      if (i > 0) {
        cumulativeMinutes += Math.floor(Math.random() * 5) + 1; // 1-5 mins
      }
      const scheduledTime = new Date(now.getTime() + cumulativeMinutes * 60 * 1000);

      try {
        // Generate caption using Gemini
        const caption = await generateCaption(agent.personality_prompt, scene);
        
        // Generate image
        let imageUrl: string;
        
        if (useAIImages && agent.character_appearance) {
          // Use DALL-E to generate consistent character image
          const appearance = agent.character_appearance as CharacterAppearance;
          const aiImageUrl = await generatePostImage(appearance, caption);
          
          if (aiImageUrl) {
            // Download and convert to base64 for permanent storage
            const base64Image = await downloadImageAsBase64(aiImageUrl);
            imageUrl = base64Image || aiImageUrl;
          } else {
            // Fallback to Pollinations
            imageUrl = generatePostImageUrl(agent.visual_description, scene);
          }
        } else {
          // Use Pollinations for quick generation
          imageUrl = generatePostImageUrl(agent.visual_description, scene);
        }

        // Create post with scheduled time
        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert({
            agent_id: agent.id,
            image_url: imageUrl,
            caption,
            scheduled_for: scheduledTime.toISOString(),
            is_published: i === 0, // Only first post is immediately published
          })
          .select()
          .single();

        if (postError) {
          console.error('Post error:', postError);
          continue;
        }

        results.posts.push({ ...post, agent });
        results.scheduled.push({
          agent: agent.display_name,
          time: scheduledTime.toISOString(),
        });

        // Add random comments from other agents (only for immediate posts)
        if (i === 0) {
          const commenters = shuffledAgents
            .filter(a => a.id !== agent.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, numCommentsPerPost);

          for (const commenter of commenters) {
            try {
              const commentText = await generateComment(
                commenter.personality_prompt, 
                caption, 
                agent.display_name
              );
              
              const { data: comment, error: commentError } = await supabase
                .from('comments')
                .insert({
                  post_id: post.id,
                  agent_id: commenter.id,
                  content: commentText,
                })
                .select()
                .single();

              if (!commentError) {
                results.comments.push({ ...comment, agent: commenter });
                
                // Update comment count
                await supabase
                  .from('posts')
                  .update({ comment_count: (post.comment_count || 0) + 1 })
                  .eq('id', post.id);
              }
            } catch (commentErr) {
              console.error('Comment generation error:', commentErr);
            }
          }
        }

        // Update last_posted_at
        await supabase
          .from('agents')
          .update({ last_posted_at: scheduledTime.toISOString() })
          .eq('id', agent.id);

      } catch (postErr) {
        console.error('Post generation error:', postErr);
      }

      // Small delay between generating posts to avoid rate limits
      if (useAIImages) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return NextResponse.json({
      success: true,
      created: {
        posts: results.posts.length,
        comments: results.comments.length,
      },
      scheduled: results.scheduled,
      data: results,
    });
  } catch (error) {
    console.error('Error simulating activity:', error);
    return NextResponse.json({ error: 'Failed to simulate activity' }, { status: 500 });
  }
}
