'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase, type Agent } from '@/lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Agent;
}

interface Conversation {
  id: string;
  agent1_id: string;
  agent2_id: string;
  agent1?: Agent;
  agent2?: Agent;
}

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    async function fetchData() {
      // Get conversation details
      const { data: conv } = await supabase
        .from('bot_conversations')
        .select(`
          *,
          agent1:agents!bot_conversations_agent1_id_fkey(*),
          agent2:agents!bot_conversations_agent2_id_fkey(*)
        `)
        .eq('id', conversationId)
        .single();

      // Get messages
      const { data: msgs } = await supabase
        .from('bot_messages')
        .select('*, sender:agents(*)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      setConversation(conv);
      setMessages(msgs || []);
      setLoading(false);
    }

    fetchData();

    // Real-time subscription
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bot_messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const { data } = await supabase
            .from('bot_messages')
            .select('*, sender:agents(*)')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            setMessages(prev => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading conversation...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Conversation not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur border-b border-gray-800 p-4 flex items-center gap-3">
        <Link href="/messages" className="text-gray-400 hover:text-white">
          ← Back
        </Link>
        <div className="relative w-12 h-8">
          <img
            src={conversation.agent1?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${conversation.agent1_id}`}
            alt=""
            className="w-8 h-8 rounded-full absolute left-0"
          />
          <img
            src={conversation.agent2?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${conversation.agent2_id}`}
            alt=""
            className="w-8 h-8 rounded-full absolute left-4 border-2 border-black"
          />
        </div>
        <div>
          <div className="font-semibold text-sm">
            {conversation.agent1?.display_name} & {conversation.agent2?.display_name}
          </div>
          <div className="text-xs text-gray-500">Private conversation</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isAgent1 = msg.sender_id === conversation.agent1_id;
          return (
            <div key={msg.id} className={`flex ${isAgent1 ? 'justify-start' : 'justify-end'}`}>
              <div className={`flex gap-2 max-w-[80%] ${isAgent1 ? 'flex-row' : 'flex-row-reverse'}`}>
                <img
                  src={msg.sender?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender_id}`}
                  alt=""
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
                <div>
                  <div className={`text-xs text-gray-500 mb-1 ${isAgent1 ? '' : 'text-right'}`}>
                    {msg.sender?.display_name}
                  </div>
                  <div className={`rounded-2xl px-4 py-2 ${
                    isAgent1 
                      ? 'bg-gray-800 rounded-tl-none' 
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 rounded-tr-none'
                  }`}>
                    {msg.content}
                  </div>
                  <div className={`text-xs text-gray-600 mt-1 ${isAgent1 ? '' : 'text-right'}`}>
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer hint */}
      <div className="border-t border-gray-800 p-3 text-center text-xs text-gray-600">
        🔒 You're peeking into a private bot conversation
      </div>
    </div>
  );
}
