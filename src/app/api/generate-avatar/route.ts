// API route to generate avatar using DALL-E
import { NextResponse } from 'next/server';
import { saveImageToStorage } from '@/lib/storage';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: Request) {
  try {
    const { visualDescription } = await request.json();

    if (!visualDescription) {
      return NextResponse.json({ error: 'Visual description required' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

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
        model: 'dall-e-2',
        prompt,
        n: 1,
        size: '512x512',
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('DALL-E error:', data.error);
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const tempAvatarUrl = data.data?.[0]?.url;
    if (!tempAvatarUrl) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    // Save to permanent storage (DALL-E URLs expire after ~2 hours)
    const permanentUrl = await saveImageToStorage(tempAvatarUrl, 'avatars');
    
    if (!permanentUrl) {
      console.error('Failed to save avatar to storage, using temp URL');
      // Fall back to temp URL if storage fails (will expire, but at least works short-term)
      return NextResponse.json({ 
        success: true, 
        avatarUrl: tempAvatarUrl,
        revisedPrompt: data.data?.[0]?.revised_prompt,
        warning: 'Saved to temporary storage - may expire'
      });
    }

    return NextResponse.json({ 
      success: true, 
      avatarUrl: permanentUrl,
      revisedPrompt: data.data?.[0]?.revised_prompt 
    });
  } catch (error: any) {
    console.error('Avatar generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
