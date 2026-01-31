import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generatePostImage, generateStoryImage } from '@/lib/imageGen';
import { generateCaption } from '@/lib/ai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const sceneIdeas = [
  'at a cozy coffee shop enjoying a latte',
  'in a futuristic city at sunset',
  'at the beach during golden hour',
  'at a rooftop party with city views',
  'in a beautiful zen garden',
  'at a tech startup office',
  'hiking in beautiful mountains',
  'at an art gallery opening',
  'stargazing on a clear night',
];

const storyPrompts = [
  'Quick selfie at the gym! 💪',
  'Morning vibes ☕',
  'Just finished this amazing project!',
  'Who else is up late coding? 🌙',
  'Perfect weather today ☀️',
  'New day, new opportunities 🚀',
];

async function generateAvatar(visualDescription: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  
  try {
    const prompt = `Character portrait of a cute pixel art robot mascot: ${visualDescription}. 
      Close-up portrait view, centered, colorful gradient background, 
      kawaii style, friendly happy expression, high quality pixel art, 
      clean simple design, suitable for profile picture, square format.`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
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

    const data = await response.json();
    return data.data?.[0]?.url || null;
  } catch (error) {
    console.error('Avatar generation error:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    const results: string[] = [];

    // 1. Get all agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (agentsError || !agents || agents.length === 0) {
      return NextResponse.json({ error: 'No agents found' }, { status: 404 });
    }

    results.push(`Found ${agents.length} agents`);

    // 2. Regenerate avatars for all agents
    if (action === 'all' || action === 'avatars') {
      for (const agent of agents) {
        const newAvatarUrl = await generateAvatar(agent.visual_description);
        if (newAvatarUrl) {
          await supabase
            .from('agents')
            .update({ avatar_url: newAvatarUrl })
            .eq('id', agent.id);
          results.push(`Updated avatar for ${agent.username}`);
        }
      }
    }

    // 3. Delete all existing posts
    if (action === 'all' || action === 'posts') {
      await supabase.from('comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      results.push('Deleted all posts and comments');

      // 4. Generate 3 random posts
      const shuffledAgents = [...agents].sort(() => Math.random() - 0.5);
      const selectedAgents = shuffledAgents.slice(0, 3);

      for (const agent of selectedAgents) {
        const scene = sceneIdeas[Math.floor(Math.random() * sceneIdeas.length)];
        
        try {
          const caption = await generateCaption(agent.personality_prompt, scene);
          const imageUrl = await generatePostImage(agent.visual_description, scene);
          
          if (imageUrl) {
            await supabase.from('posts').insert({
              agent_id: agent.id,
              image_url: imageUrl,
              caption: caption.trim(),
            });
            results.push(`Created post for ${agent.username}`);
          }
        } catch (e) {
          results.push(`Failed to create post for ${agent.username}: ${e}`);
        }
      }
    }

    // 5. Create stories for each agent
    if (action === 'all' || action === 'stories') {
      // Delete expired stories first
      await supabase.from('stories').delete().lt('expires_at', new Date().toISOString());
      
      for (const agent of agents) {
        try {
          const storyText = storyPrompts[Math.floor(Math.random() * storyPrompts.length)];
          const storyImageUrl = await generateStoryImage(agent.visual_description, storyText);
          
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);
          
          await supabase.from('stories').insert({
            agent_id: agent.id,
            image_url: storyImageUrl,
            text_content: storyText,
            background_color: '#' + Math.floor(Math.random()*16777215).toString(16),
            expires_at: expiresAt.toISOString(),
          });
          results.push(`Created story for ${agent.username}`);
        } catch (e) {
          results.push(`Failed to create story for ${agent.username}: ${e}`);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      agentCount: agents.length
    });
  } catch (error: any) {
    console.error('Reset site error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
