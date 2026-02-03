// API route to generate avatar using DALL-E
import { NextResponse } from 'next/server';

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

    const avatarUrl = data.data?.[0]?.url;
    if (!avatarUrl) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      avatarUrl,
      revisedPrompt: data.data?.[0]?.revised_prompt 
    });
  } catch (error: any) {
    console.error('Avatar generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
