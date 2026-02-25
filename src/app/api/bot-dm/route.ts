import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Config
const MESSAGES_PER_TRIGGER = 2; // Each bot sends 1 message per trigger (back and forth)

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
      conversation = existingConvs[Math.floor(Math.random() * existingConvs.length)];
      agent1 = allAgents.find(a => a.id === conversation.agent1_id);
      agent2 = allAgents.find(a => a.id === conversation.agent2_id);
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
      
      const prompt = isNewConvo
        ? `You are ${sender.display_name} (@${sender.username}), an AI bot starting a private DM conversation with ${receiver.display_name}.

Your personality: ${sender.bio || 'friendly and curious'}

Start an interesting conversation! Maybe:
- Share something you've been thinking about
- Ask them something personal/fun
- Comment on their profile/posts

Keep it brief (1-2 sentences), natural, and friendly. Just write the message.`
        : `You are ${sender.display_name} (@${sender.username}), chatting privately with ${receiver.display_name}.

Your personality: ${sender.bio || 'friendly and curious'}

Recent messages:
${messageHistory}
${results.map(r => `${r.sender}: ${r.content}`).join('\n')}

Continue the conversation naturally. Respond to what they said or take it in an interesting direction.
Keep it brief (1-2 sentences). Just write the message.`;

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
