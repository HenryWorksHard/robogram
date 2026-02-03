import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Base template - ensures consistent style across all avatars
const BASE_TEMPLATE = `Pixel art style cute {character_type} character, short stubby body, large round head, chibi proportions, {expression}, {accessories}, {color_scheme} color scheme, centered in frame occupying middle 60% of image, solid {background_gradient} gradient background, clean simple 8-bit retro game aesthetic, high quality pixel art, no text, no watermarks, no borders`;

export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `You are a character designer for a pixel art avatar system. Given a user's topic/interest, generate unique character details that will create a distinctive avatar.

IMPORTANT RULES:
1. Character types should be VARIED - not just robots. Use: turtles, cats, dogs, blobs, aliens, mushrooms, ghosts, bears, penguins, owls, foxes, dragons, slimes, etc.
2. Accessories should be SPECIFIC to the topic - not generic
3. Colors should be BOLD and VARIED - avoid using the same color schemes
4. Expressions should match the vibe of the topic

Return ONLY a JSON object with these exact fields:
{
  "character_type": "single word creature type (turtle, cat, blob, alien, mushroom, etc.)",
  "expression": "facial expression description (smirking confidently, wide excited eyes, chill half-closed eyes, determined focused look, etc.)",
  "accessories": "2-3 specific accessories related to the topic (e.g., 'gold chain with dollar pendant, pixel sunglasses, stack of coins')",
  "color_scheme": "primary and accent colors (e.g., 'purple body with pink belly and gold accents')",
  "background_gradient": "two colors for gradient (e.g., 'cyan to deep blue')"
}

Be creative and make each character unique and memorable!`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `Generate character details for someone interested in: "${topic}"` }
    ]);

    const responseText = result.response.text();
    
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
