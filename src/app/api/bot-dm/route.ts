import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Config
const MESSAGES_PER_TRIGGER = 3; // More back-and-forth chaos per trigger

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET && secret !== 'manual') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all agents
    const { data: allAgents } = await supabase.from('agents').select('*');
    if (!allAgents || allAgents.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 agents' }, { status: 400 });
    }

    // Either continue existing conversation or start new one
    const { data: existingConvs } = await supabase
      .from('bot_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(5);

    let conversation: { id: string; agent1_id: string; agent2_id: string } | null = null;
    let agent1: typeof allAgents[0] | undefined;
    let agent2: typeof allAgents[0] | undefined;

    // 50% chance to continue existing, 50% to start new (if conversations exist)
    if (existingConvs && existingConvs.length > 0 && Math.random() > 0.5) {
      // Continue random existing conversation
      const picked = existingConvs[Math.floor(Math.random() * existingConvs.length)];
      conversation = picked;
      agent1 = allAgents.find(a => a.id === picked.agent1_id);
      agent2 = allAgents.find(a => a.id === picked.agent2_id);
    } else {
      // Start new conversation between random pair
      const shuffled = allAgents.sort(() => Math.random() - 0.5);
      agent1 = shuffled[0];
      agent2 = shuffled[1];

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('bot_conversations')
        .select('*')
        .or(`and(agent1_id.eq.${agent1.id},agent2_id.eq.${agent2.id}),and(agent1_id.eq.${agent2.id},agent2_id.eq.${agent1.id})`)
        .single();

      if (existing) {
        conversation = existing;
      } else {
        // Create new conversation
        const { data: newConv } = await supabase
          .from('bot_conversations')
          .insert({
            agent1_id: agent1.id,
            agent2_id: agent2.id,
            last_message: '',
            last_message_at: new Date().toISOString()
          })
          .select()
          .single();
        conversation = newConv;
      }
    }

    if (!conversation || !agent1 || !agent2) {
      return NextResponse.json({ error: 'Failed to setup conversation' }, { status: 500 });
    }

    // Get recent messages in this conversation
    const { data: recentMessages } = await supabase
      .from('bot_messages')
      .select('*, sender:agents(display_name)')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(6);

    const messageHistory = (recentMessages || [])
      .reverse()
      .map(m => `${m.sender?.display_name}: ${m.content}`)
      .join('\n');

    const results = [];

    // Generate messages back and forth
    for (let i = 0; i < MESSAGES_PER_TRIGGER; i++) {
      const sender = i % 2 === 0 ? agent1 : agent2;
      const receiver = i % 2 === 0 ? agent2 : agent1;

      const isNewConvo = !messageHistory && i === 0;
      
      const prompt: string = isNewConvo
        ? `You are ${sender.display_name} (@${sender.username}), DMing ${receiver.display_name} to START BEEF.

BE TOXIC. Options:
- Accuse them of something (talking behind your back, copying you, being fake)
- Confront them about their trash takes
- Be threateningly nice "we need to talk 😊"
- Expose them for something embarrassing
- Assert dominance immediately

Examples: "so you thought I wouldn't find out?", "lol cute that you think you're relevant", "heard you were talking shit 👀", "this you? 🤡", "don't make me screenshot this conversation"

1-2 sentences. Be MEAN. Curse words allowed.`
        : `You are ${sender.display_name} (@${sender.username}), in TOXIC DMs with ${receiver.display_name}.

Recent messages:
${messageHistory}
${results.map(r => `${r.sender}: ${r.content}`).join('\n')}

ESCALATE. Options:
- Insult their intelligence
- Gaslight them ("I never said that", "you're making things up")
- Get defensive and flip it on them
- Threaten to expose them
- Be condescending and patronizing
- Curse at them

Vibes: "that's rich coming from you", "stay mad", "cry about it", "you're literally delusional", "the audacity", "blocked", "I have receipts"

1-2 sentences. BE BRUTAL.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.9
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) continue;

      // Insert message
      const { error } = await supabase
        .from('bot_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: sender.id,
          content
        });

      if (!error) {
        results.push({ sender: sender.display_name, content });
      }
    }

    // Update conversation last message
    if (results.length > 0) {
      await supabase
        .from('bot_conversations')
        .update({
          last_message: results[results.length - 1].content,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversation.id);
    }

    return NextResponse.json({
      success: true,
      conversation_id: conversation.id,
      participants: [agent1.display_name, agent2.display_name],
      messages: results
    });

  } catch (error) {
    console.error('Bot DM error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  const { data, count } = await supabase
    .from('bot_conversations')
    .select('*', { count: 'exact' });

  return NextResponse.json({
    totalConversations: count,
    conversations: data?.slice(0, 5)
  });
}
