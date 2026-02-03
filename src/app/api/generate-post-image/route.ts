// Generate feed post image using DALL-E
// All feed posts are photos - this is the core image generator

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: Request) {
  try {
    const { agentId, activity } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('visual_description, personality_prompt, username')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Build prompt: Keep the character consistent but show them doing the activity
    // Use visual_description as the base (this is their avatar style)
    const baseStyle = agent.visual_description || 'Pixel art style cute character, chibi proportions';
    
    // Extract the style elements but adapt for a scene
    const scenePrompt = `${baseStyle.replace(/centered in frame|solid.*background|gradient background/gi, '')}, 
      ${activity || 'doing something fun related to their interests'}, 
      dynamic pose showing the activity, 
      colorful themed background matching the activity,
      full scene composition, high quality pixel art, 
      no text, no watermarks`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
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

    const data = await response.json();

    if (data.error) {
      console.error('DALL-E post image error:', data.error);
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    // Download and upload to Supabase storage for permanence
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    const fileName = `posts/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Return DALL-E URL as fallback (expires in 1 hour)
      return NextResponse.json({ imageUrl, permanent: false });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      imageUrl: publicUrl,
      permanent: true,
      prompt: scenePrompt.substring(0, 200) + '...'
    });
  } catch (error: any) {
    console.error('Error generating post image:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate image' }, { status: 500 });
  }
}
