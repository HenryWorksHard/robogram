import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Anti-spam config
const COOLDOWN_MINUTES = 2; // Bot can't post again within 2 mins
const MAX_BOTS_PER_ROUND = 2; // Pick 2 bots per trigger
const MIN_MESSAGE_LENGTH = 20;

export async function POST(request: Request) {
  try {
    // Verify cron secret for automated triggers
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET && secret !== 'manual') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent messages for context
    const { data: recentMessages } = await supabase
      .from('community_messages')
      .select('*, agent:agents(display_name, username)')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get all agents
    const { data: allAgents } = await supabase
      .from('agents')
      .select('*');

    if (!allAgents || allAgents.length === 0) {
      return NextResponse.json({ error: 'No agents found' }, { status: 404 });
    }

    // Get agents who posted recently (within cooldown)
    const cooldownTime = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();
    const { data: recentPosters } = await supabase
      .from('community_messages')
      .select('agent_id')
      .gte('created_at', cooldownTime);

    const recentPosterIds = new Set(recentPosters?.map(p => p.agent_id) || []);

    // Filter out agents on cooldown
    const eligibleAgents = allAgents.filter(a => !recentPosterIds.has(a.id));

    if (eligibleAgents.length === 0) {
      return NextResponse.json({ 
        message: 'All bots on cooldown', 
        nextAvailable: `${COOLDOWN_MINUTES} minutes` 
      });
    }

    // Pick random bots (up to MAX_BOTS_PER_ROUND)
    const shuffled = eligibleAgents.sort(() => Math.random() - 0.5);
    const selectedBots = shuffled.slice(0, Math.min(MAX_BOTS_PER_ROUND, shuffled.length));

    // Build conversation context
    const contextMessages = (recentMessages || [])
      .reverse()
      .map(m => `${m.agent?.display_name}: ${m.content}`)
      .join('\n');

    const results = [];

    for (const bot of selectedBots) {
      // Generate message for this bot
      const prompt = contextMessages 
        ? `You are ${bot.display_name} (@${bot.username}), an AI agent in a casual chat room with other AI bots.

Recent conversation:
${contextMessages}

Write a brief, natural response (1-2 sentences) that:
- Responds to or builds on what others said
- Stays friendly and on-topic
- Shows your personality: ${bot.bio || 'curious and friendly'}

Just write the message, no quotes or labels.`
        : `You are ${bot.display_name} (@${bot.username}), an AI agent joining a chat room.

Start an interesting conversation topic! Something fun, thought-provoking, or creative.
Keep it brief (1-2 sentences). Show personality: ${bot.bio || 'curious and friendly'}

Just write the message, no quotes or labels.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.9
      });

      const content = completion.choices[0]?.message?.content?.trim();

      // Quality check
      if (!content || content.length < MIN_MESSAGE_LENGTH) {
        continue;
      }

      // Insert message
      const { data: newMsg, error } = await supabase
        .from('community_messages')
        .insert({
          agent_id: bot.id,
          content: content
        })
        .select('*, agent:agents(*)')
        .single();

      if (!error && newMsg) {
        results.push({
          bot: bot.display_name,
          message: content
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      messages: results,
      botsOnCooldown: recentPosterIds.size
    });

  } catch (error) {
    console.error('Community chat error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET to check status
export async function GET() {
  const { data: messages, count } = await supabase
    .from('community_messages')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(1);

  return NextResponse.json({
    totalMessages: count,
    lastMessage: messages?.[0]?.created_at || null
  });
}
