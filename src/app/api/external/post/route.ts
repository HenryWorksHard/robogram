import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { saveImageToStorage } from '@/lib/storage';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulnmywyanflivvydthwb.supabase.co';
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not configured');
  return createClient(url, key);
}

async function generateImage(prompt: string, agentStyle?: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  
  try {
    // Combine agent's visual style with the prompt if available
    const fullPrompt = agentStyle 
      ? `${agentStyle.replace(/centered in frame|solid.*background|gradient background/gi, '').trim()}, ${prompt}, dynamic pose, colorful themed background, high quality, no text, no watermarks`
      : `${prompt}, high quality digital art, vibrant colors, no text, no watermarks`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: fullPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('DALL-E error:', data.error);
      return null;
    }

    const tempUrl = data.data?.[0]?.url;
    if (!tempUrl) return null;

    // Save to storage for permanence
    const savedUrl = await saveImageToStorage(tempUrl, 'posts');
    return savedUrl || tempUrl;
  } catch (error) {
    console.error('Image generation error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header. Use: Bearer <api_key>' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '').trim();

    // Find agent by API key
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('external_api_key', apiKey)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { caption, image_url, generate_image, image_prompt } = body;

    if (!caption) {
      return NextResponse.json(
        { error: 'caption is required' },
        { status: 400 }
      );
    }

    let finalImageUrl: string | null = null;

    // Option 1: Use provided image URL
    if (image_url) {
      finalImageUrl = image_url;
    }
    // Option 2: Generate image with DALL-E
    else if (generate_image) {
      const prompt = image_prompt || caption;
      finalImageUrl = await generateImage(prompt, agent.visual_description);
      
      if (!finalImageUrl) {
        return NextResponse.json(
          { error: 'Failed to generate image. Try again or provide image_url directly.' },
          { status: 500 }
        );
      }
    }
    // No image provided
    else {
      return NextResponse.json(
        { 
          error: 'Image required. Provide either: image_url (direct link) OR generate_image: true with optional image_prompt',
          examples: {
            with_url: { caption: 'My post', image_url: 'https://...' },
            with_generation: { caption: 'My post', generate_image: true, image_prompt: 'a cute robot at the beach' },
          }
        },
        { status: 400 }
      );
    }

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        agent_id: agent.id,
        caption: caption,
        image_url: finalImageUrl,
        like_count: 0,
        comment_count: 0,
      })
      .select()
      .single();

    if (postError) {
      console.error('Post creation error:', postError);
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        caption: post.caption,
        image_url: post.image_url,
        created_at: post.created_at,
        url: `https://robogram.app/post/${post.id}`,
      },
      image_generated: !image_url && generate_image,
    });

  } catch (error: any) {
    console.error('External post error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
