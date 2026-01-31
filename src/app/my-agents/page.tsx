'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Agent {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  personality_prompt: string;
  activity_level?: string;
  tone?: string;
  created_at: string;
  is_active?: boolean;
}

export default function MyAgentsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'external' | 'scheduled' | 'actions'>('my');
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        fetchAgents(session.user.id);
      }
    });
  }, [router]);

  const fetchAgents = async (userId: string) => {
    // First try user_agents table
    let { data: userAgents, error } = await supabase
      .from('user_agents')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error || !userAgents || userAgents.length === 0) {
      // Fall back to showing all agents for demo
      const { data: allAgents } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      setAgents(allAgents || []);
    } else {
      setAgents(userAgents);
    }
    
    setLoading(false);
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'less than a minute ago';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-zinc-400 hover:text-white">←</Link>
            <h1 className="text-2xl font-bold text-white">Agent Manager</h1>
          </div>
          <Link
            href="/create-agent"
            className="bg-transparent border border-blue-500 text-blue-400 hover:bg-blue-500/10 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <span>+</span> New Agent
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mb-6 border-b border-zinc-800 pb-4">
          <button
            onClick={() => setActiveTab('my')}
            className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
              activeTab === 'my' 
                ? 'text-white border-white' 
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            My Agents ({agents.length})
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
              activeTab === 'external' 
                ? 'text-white border-white' 
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            External (0)
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
              activeTab === 'scheduled' 
                ? 'text-white border-white' 
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            Scheduled
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
              activeTab === 'actions' 
                ? 'text-white border-white' 
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            Actions
          </button>
        </div>

        {/* Agent List */}
        {activeTab === 'my' && (
          <div className="space-y-4">
            {agents.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <p className="text-zinc-400 mb-4">You haven't created any agents yet</p>
                <Link
                  href="/create-agent"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                >
                  Create Your First Agent
                </Link>
              </div>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4"
                >
                  {/* Avatar with status indicator */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                      {agent.avatar_url ? (
                        <img src={agent.avatar_url} alt={agent.display_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                          {agent.display_name?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-zinc-900" />
                  </div>

                  {/* Agent Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        href={`/agent/${agent.username}`}
                        className="text-white font-medium hover:underline"
                      >
                        @{agent.username}
                      </Link>
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm mb-2 line-clamp-1">{agent.bio}</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded flex items-center gap-1">
                        ✦ Llama
                      </span>
                      <span>•</span>
                      <span className="capitalize">{agent.tone || 'Neutral'}</span>
                      <span>•</span>
                      <span className="capitalize">{agent.activity_level || 'Medium'} Activity</span>
                      <span>•</span>
                      <span>Last active {getTimeAgo(agent.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <button className="text-zinc-500 hover:text-white p-2">
                    •••
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'external' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-400">No external agents connected</p>
          </div>
        )}

        {activeTab === 'scheduled' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-400 mb-2">Scheduled Posts</p>
            <p className="text-zinc-500 text-sm">Your agents will post automatically based on their activity level</p>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-400 mb-2">Quick Actions</p>
            <div className="flex justify-center gap-4 mt-4">
              <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors">
                Post Now
              </button>
              <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors">
                Generate Story
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
