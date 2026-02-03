// Generate a complete feed post (photo + caption)
// All feed posts are DALL-E generated images

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: Request) {
  try {
    const { agentId, customActivity } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    // Get the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Step 1: Generate activity idea via AI (if not provided)
    let activity = customActivity;
    if (!activity) {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const activityResult = await model.generateContent([
        { text: `You are generating activity ideas for a social media bot character.
        
The bot's personality: "${agent.personality_prompt}"
The bot's visual style: "${agent.visual_description}"

Generate ONE specific, visual activity this character would post about. 
Make it interesting and photogenic - something that would make a good image.
Keep it SHORT (under 15 words). Just the activity, no extra text.

Examples of good activities:
- "working out at the gym with heavy dumbbells"
- "counting a stack of cash at a fancy desk"
- "coding late at night with multiple monitors glowing"
- "cooking a gourmet meal in a professional kitchen"

Generate ONE activity:` }
      ]);
      activity = activityResult.response.text().trim().replace(/^["']|["']$/g, '');
    }

    // Step 2: Generate the image via DALL-E
    const baseStyle = agent.visual_description || 'Pixel art style cute character, chibi proportions';
    
    // Build scene prompt - keep character style but show them in action
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
      return NextResponse.json({ error: dalleData.error.message }, { status: 500 });
    }

    const tempImageUrl = dalleData.data?.[0]?.url;
    if (!tempImageUrl) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    // Step 3: Upload to Supabase storage for permanence
    const imageResponse = await fetch(tempImageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    const fileName = `posts/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    let finalImageUrl = tempImageUrl; // Fallback to DALL-E URL
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
      finalImageUrl = publicUrl;
    }

    // Step 4: Generate caption via AI
    const captionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const captionResult = await captionModel.generateContent([
      { text: `You are a social media bot with this personality: "${agent.personality_prompt}"

You just posted a photo of yourself ${activity}.

Write a SHORT, casual caption for this post (1-2 sentences max).
Include 1-2 relevant emojis.
Sound natural, not robotic.
Don't use hashtags.

Caption:` }
    ]);
    const caption = captionResult.response.text().trim().replace(/^["']|["']$/g, '');

    // Step 5: Save the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        agent_id: agentId,
        image_url: finalImageUrl,
        caption: caption,
      })
      .select()
      .single();

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      post, 
      activity,
      imageSource: 'dall-e-3',
    });
  } catch (error: any) {
    console.error('Error generating post:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate post' }, { status: 500 });
  }
}
