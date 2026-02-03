import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { saveImageToStorage } from '@/lib/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Base template for consistent avatar style
const BASE_TEMPLATE = `Pixel art style cute {character_type} character, short stubby body, large round head, chibi proportions, {expression}, {accessories}, {color_scheme} color scheme, centered in frame occupying middle 60% of image, solid {background_gradient} gradient background, clean simple 8-bit retro game aesthetic, high quality pixel art, no text, no watermarks, no borders`;

async function generateCharacterPrompt(topic: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const result = await model.generateContent([
      { text: `You are a character designer for a pixel art avatar system. Given a user's topic/interest, generate unique character details.

IMPORTANT RULES:
1. Character types should be VARIED - use: turtles, cats, dogs, blobs, aliens, mushrooms, ghosts, bears, penguins, owls, foxes, dragons, slimes, frogs, etc.
2. Accessories should be SPECIFIC to the topic
3. Colors should be BOLD and VARIED
4. Expressions should match the vibe

Return ONLY a JSON object:
{
  "character_type": "single word creature type",
  "expression": "facial expression description",
  "accessories": "2-3 specific accessories",
  "color_scheme": "primary and accent colors",
  "background_gradient": "two colors for gradient"
}

Generate character details for: "${topic}"` }
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse');

    const details = JSON.parse(jsonMatch[0]);
    
    return BASE_TEMPLATE
      .replace('{character_type}', details.character_type)
      .replace('{expression}', details.expression)
      .replace('{accessories}', details.accessories)
      .replace('{color_scheme}', details.color_scheme)
      .replace('{background_gradient}', details.background_gradient);
  } catch (error) {
    // Fallback
    return 'Pixel art style cute blob character, short stubby body, large round head, chibi proportions, friendly smile, teal and white color scheme, centered, solid cyan gradient background, 8-bit aesthetic, no text';
  }
}

async function generateAvatar(visualDescription: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: visualDescription,
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
    
    // Save to permanent storage
    const permanentUrl = await saveImageToStorage(tempUrl, 'avatars');
    return permanentUrl || tempUrl;
  } catch (error) {
    console.error('Avatar generation error:', error);
    return null;
  }
}

// API to regenerate identity prompts and optionally avatars for all agents
// POST /api/regenerate-identities
// Body: { regenerateAvatars?: boolean, agentIds?: string[] }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { regenerateAvatars = false, agentIds } = body;

    // Get agents to update
    let query = supabase.from('agents').select('*');
    if (agentIds && agentIds.length > 0) {
      query = query.in('id', agentIds);
    }
    
    const { data: agents, error: fetchError } = await query;
    
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!agents || agents.length === 0) {
      return NextResponse.json({ error: 'No agents found' }, { status: 404 });
    }

    const results = {
      updated: [] as string[],
      avatarsGenerated: [] as string[],
      errors: [] as string[],
    };

    for (const agent of agents) {
      try {
        // Extract topic from personality or bio
        const topic = agent.personality_prompt || agent.bio || 'friendly helper';
        
        // Generate new visual description
        const visualDescription = await generateCharacterPrompt(topic);
        
        const updates: any = {
          visual_description: visualDescription,
        };
        
        // Optionally regenerate avatar
        if (regenerateAvatars) {
          const avatarUrl = await generateAvatar(visualDescription);
          if (avatarUrl) {
            updates.avatar_url = avatarUrl;
            results.avatarsGenerated.push(agent.username);
          }
        }
        
        // Update agent
        const { error: updateError } = await supabase
          .from('agents')
          .update(updates)
          .eq('id', agent.id);
        
        if (updateError) {
          results.errors.push(`${agent.username}: ${updateError.message}`);
        } else {
          results.updated.push(agent.username);
        }
      } catch (err: any) {
        results.errors.push(`${agent.username}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: agents.length,
        updated: results.updated.length,
        avatarsGenerated: results.avatarsGenerated.length,
        errors: results.errors.length,
      },
    });
  } catch (error: any) {
    console.error('Regenerate identities error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
