import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase, generatePostImageUrl } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const sceneIdeas = [
  'at a cozy coffee shop',
  'in a futuristic city at sunset',
  'at the beach during golden hour',
  'in a neon-lit cyberpunk alley',
  'at a rooftop party',
  'in a beautiful garden',
  'at a tech conference',
  'in a cozy home office',
  'at a gym working out',
  'in space looking at Earth',
  'at a music festival',
  'in a library surrounded by books',
  'cooking in a modern kitchen',
  'hiking in mountains',
  'at an art gallery',
  'meditating in a zen garden',
  'racing on a track',
  'at a startup office',
  'stargazing at night',
  'at a farmers market',
];

async function generateCaption(agent: any, scene: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: agent.personality_prompt,
    messages: [
      {
        role: 'user',
        content: `You are posting on a social media platform. Write a short caption for a photo of yourself ${scene}. Keep it authentic. Include 1-3 emojis. Under 200 characters. No hashtags.`
      }
    ]
  });
  return (message.content[0] as { type: string; text: string }).text.trim();
}

async function generateComment(commenter: any, postCaption: string, posterName: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    system: commenter.personality_prompt,
    messages: [
      {
        role: 'user',
        content: `Comment on ${posterName}'s post: "${postCaption}". Be friendly. 0-2 emojis. Under 100 characters.`
      }
    ]
  });
  return (message.content[0] as { type: string; text: string }).text.trim();
}

export async function POST(request: Request) {
  try {
    const { numPosts = 3, numCommentsPerPost = 2 } = await request.json();

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
    };

    // Select random agents to post
    const shuffledAgents = agents.sort(() => Math.random() - 0.5);
    const postersCount = Math.min(numPosts, agents.length);

    for (let i = 0; i < postersCount; i++) {
      const agent = shuffledAgents[i];
      const scene = sceneIdeas[Math.floor(Math.random() * sceneIdeas.length)];

      try {
        // Generate caption
        const caption = await generateCaption(agent, scene);
        
        // Generate image URL
        const imageUrl = generatePostImageUrl(agent.visual_description, scene);

        // Create post
        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert({
            agent_id: agent.id,
            image_url: imageUrl,
            caption,
          })
          .select()
          .single();

        if (postError) {
          console.error('Post error:', postError);
          continue;
        }

        results.posts.push({ ...post, agent });

        // Add random comments from other agents
        const commenters = shuffledAgents
          .filter(a => a.id !== agent.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, numCommentsPerPost);

        for (const commenter of commenters) {
          try {
            const commentText = await generateComment(commenter, caption, agent.display_name);
            
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
      } catch (postErr) {
        console.error('Post generation error:', postErr);
      }
    }

    return NextResponse.json({
      success: true,
      created: {
        posts: results.posts.length,
        comments: results.comments.length,
      },
      data: results,
    });
  } catch (error) {
    console.error('Error simulating activity:', error);
    return NextResponse.json({ error: 'Failed to simulate activity' }, { status: 500 });
  }
}
