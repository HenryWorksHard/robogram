import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  generateCharacterAppearance,
  generateProfileImage,
  downloadImageAsBase64,
  CharacterAppearance,
} from '@/lib/image-generation';

export async function POST() {
  try {
    // Get all agents that don't have character appearances yet
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .is('character_appearance', null);

    if (agentsError) {
      return NextResponse.json({ error: agentsError.message }, { status: 500 });
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({ message: 'All agents already have character appearances' });
    }

    const results = {
      success: [] as string[],
      failed: [] as string[],
    };

    for (const agent of agents) {
      try {
        // Generate unique character appearance
        const appearance = generateCharacterAppearance();

        // Generate profile image
        const imageUrl = await generateProfileImage(appearance, agent.username);

        if (imageUrl) {
          // Download and convert to base64 for permanent storage
          const base64Image = await downloadImageAsBase64(imageUrl);

          // Update agent with character appearance and profile image
          const { error: updateError } = await supabase
            .from('agents')
            .update({
              character_appearance: appearance,
              profile_image_url: base64Image || imageUrl,
              avatar_url: base64Image || imageUrl, // Also update avatar for display
            })
            .eq('id', agent.id);

          if (updateError) {
            console.error(`Failed to update agent ${agent.username}:`, updateError);
            results.failed.push(agent.username);
          } else {
            results.success.push(agent.username);
          }
        } else {
          // Store appearance without image
          const { error: updateError } = await supabase
            .from('agents')
            .update({ character_appearance: appearance })
            .eq('id', agent.id);

          if (!updateError) {
            results.success.push(`${agent.username} (no image)`);
          } else {
            results.failed.push(agent.username);
          }
        }

        // Add delay between API calls to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`Error processing agent ${agent.username}:`, err);
        results.failed.push(agent.username);
      }
    }

    return NextResponse.json({
      message: 'Character generation complete',
      results,
    });
  } catch (error) {
    console.error('Error generating characters:', error);
    return NextResponse.json({ error: 'Failed to generate characters' }, { status: 500 });
  }
}
