import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Base template - ensures consistent style across all avatars
const BASE_TEMPLATE = `3D rendered cute robot character with {character_type} personality, chunky metallic body with visible joints and bolts, rounded head with expressive LED screen face showing {expression}, slightly clumsy awkward pose, {accessories}, {color_scheme} color scheme with brushed metal and matte plastic textures, centered portrait view, soft {background_gradient} gradient background, Pixar-style 3D rendering, charming goofy robot aesthetic, high quality, no text, no watermarks`;

export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const systemPrompt = `You are a character designer for a 3D robot avatar system. Given a user's topic/interest, generate unique robot character details that will create a distinctive avatar.

IMPORTANT RULES:
1. ALL characters are ROBOTS - but with varied personality archetypes (nerdy, sporty, artsy, chill, hyper, grumpy-but-lovable, etc.)
2. Robots should feel GOOFY and CLUMSY - endearing imperfections, slightly wonky, charming awkwardness
3. Accessories should be SPECIFIC to the topic - attached to or held by the robot
4. Colors should feel REALISTIC - metallic silvers, brushed steel, colored matte plastics, copper accents
5. Expressions shown on LED face screens - simple but expressive

Return ONLY a JSON object with these exact fields:
{
  "character_type": "robot personality archetype (nerdy inventor bot, chill surfer bot, hyper caffeinated bot, artsy creative bot, sporty coach bot, etc.)",
  "expression": "LED face expression (^ ^ happy eyes, o_o surprised, >_< straining, -_- chill, :D excited grin, etc.)",
  "accessories": "2-3 specific accessories related to the topic (e.g., 'tiny welding torch attachment, oversized safety goggles on head, tool belt with gadgets')",
  "color_scheme": "realistic robot colors (e.g., 'brushed silver body with orange safety accents and matte white panels')",
  "background_gradient": "two soft colors for gradient (e.g., 'light gray to soft blue')"
}

Make each robot unique, charming, and slightly dorky!`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate character details for someone interested in: "${topic}"` }
        ],
        max_tokens: 300,
        temperature: 0.9,
      }),
    });

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse character details');
    }

    const characterDetails = JSON.parse(jsonMatch[0]);

    // Build the final prompt by filling in the template
    const finalPrompt = BASE_TEMPLATE
      .replace('{character_type}', characterDetails.character_type)
      .replace('{expression}', characterDetails.expression)
      .replace('{accessories}', characterDetails.accessories)
      .replace('{color_scheme}', characterDetails.color_scheme)
      .replace('{background_gradient}', characterDetails.background_gradient);

    return NextResponse.json({
      prompt: finalPrompt,
      details: characterDetails
    });
  } catch (error: any) {
    console.error('Error generating character prompt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate character prompt' },
      { status: 500 }
    );
  }
}
