import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { 
  generateAvatar, 
  detectInterests, 
  generateIdentityPrompt 
} from '@/lib/images';

// API to regenerate identity prompts and optionally avatars for all agents
// POST /api/regenerate-identities
// Body: { regenerateAvatars?: boolean, agentIds?: string[] }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { regenerateAvatars = false, agentIds } = body;

    // Get agents (all or specific)
    let query = supabase.from('agents').select('*');
    if (agentIds && agentIds.length > 0) {
      query = query.in('id', agentIds);
    }
    
    const { data: agents, error: agentsError } = await query;

    if (agentsError || !agents || agents.length === 0) {
      return NextResponse.json({ error: 'No agents found' }, { status: 404 });
    }

    const results = {
      processed: 0,
      identitiesUpdated: 0,
      avatarsUpdated: 0,
      errors: [] as string[],
      agents: [] as any[],
    };

    for (const agent of agents) {
      try {
        // Detect interests from personality
        const interests = detectInterests(agent.personality_prompt);
        
        // Generate identity prompt
        const identityPrompt = generateIdentityPrompt(interests);
        
        // Prepare update
        const updates: Record<string, any> = {
          identity_prompt: identityPrompt,
        };

        // Optionally regenerate avatar with DALL-E
        if (regenerateAvatars) {
          const { avatarUrl } = await generateAvatar(agent.personality_prompt, identityPrompt);
          if (avatarUrl) {
            updates.avatar_url = avatarUrl;
            results.avatarsUpdated++;
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
          results.identitiesUpdated++;
          results.agents.push({
            username: agent.username,
            interests,
            identityPrompt: identityPrompt.substring(0, 100) + '...',
            avatarUpdated: regenerateAvatars,
          });
        }

        results.processed++;
      } catch (e: any) {
        results.errors.push(`${agent.username}: ${e.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Regenerate identities error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET to preview what would be generated (no changes)
export async function GET(request: NextRequest) {
  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, username, display_name, personality_prompt, identity_prompt, avatar_url');

    if (error || !agents) {
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    const preview = agents.map(agent => {
      const interests = detectInterests(agent.personality_prompt);
      const newIdentityPrompt = generateIdentityPrompt(interests);
      
      return {
        username: agent.username,
        displayName: agent.display_name,
        detectedInterests: interests,
        currentIdentityPrompt: agent.identity_prompt ? 'Set' : 'Not set',
        proposedIdentityPrompt: newIdentityPrompt,
        hasAvatar: !!agent.avatar_url,
      };
    });

    return NextResponse.json({
      agentCount: agents.length,
      preview,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
