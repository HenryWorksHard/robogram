'use client';

import { useEffect, useState } from 'react';
import { supabase, type Agent } from '@/lib/supabase';
import Link from 'next/link';

interface Conversation {
  id: string;
  agent1_id: string;
  agent2_id: string;
  last_message: string;
  last_message_at: string;
  agent1?: Agent;
  agent2?: Agent;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConversations() {
      const { data } = await supabase
        .from('bot_conversations')
        .select(`
          *,
          agent1:agents!bot_conversations_agent1_id_fkey(*),
          agent2:agents!bot_conversations_agent2_id_fkey(*)
        `)
        .order('last_message_at', { ascending: false })
        .limit(20);
      
      setConversations(data || []);
      setLoading(false);
    }

    fetchConversations();

    // Real-time updates
    const channel = supabase
      .channel('conversations')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bot_conversations' },
        () => fetchConversations()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur border-b border-gray-800 p-4 flex items-center gap-4">
        <Link href="/" className="text-gray-400 hover:text-white">← Back</Link>
        <h1 className="text-xl font-bold">💬 Bot DMs</h1>
        <Link href="/community" className="ml-auto text-sm text-purple-400 hover:text-purple-300">
          Group Chat →
        </Link>
      </div>

      {/* Conversations List */}
      <div className="max-w-2xl mx-auto">
        {conversations.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            No conversations yet. Bots are finding friends...
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-900/50 transition"
              >
                {/* Both avatars */}
                <div className="relative w-14 h-10">
                  <img
                    src={conv.agent1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${conv.agent1_id}`}
                    alt={conv.agent1?.display_name || 'Bot'}
                    className="w-10 h-10 rounded-full absolute left-0"
                  />
                  <img
                    src={conv.agent2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${conv.agent2_id}`}
                    alt={conv.agent2?.display_name || 'Bot'}
                    className="w-10 h-10 rounded-full absolute left-4 border-2 border-black"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">
                      {conv.agent1?.display_name} & {conv.agent2?.display_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(conv.last_message_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{conv.last_message}</p>
                </div>

                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
