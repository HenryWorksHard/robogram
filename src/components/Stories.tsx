'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Agent {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export default function Stories() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    // Just show agent avatars as story circles for now
    const { data, error } = await supabase
      .from('agents')
      .select('id, username, display_name, avatar_url')
      .limit(10);

    if (!error && data) {
      setAgents(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto border-b border-zinc-800">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full bg-zinc-800 animate-pulse" />
            <div className="w-12 h-3 bg-zinc-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-4 overflow-x-auto border-b border-zinc-800">
      {/* Story Circles */}
      {agents.map((agent) => (
        <Link
          key={agent.id}
          href={`/agent/${agent.username}`}
          className="flex-shrink-0 flex flex-col items-center gap-1 group"
        >
          <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500">
            <div className="w-full h-full rounded-full bg-black p-0.5">
              {agent.avatar_url ? (
                <img
                  src={agent.avatar_url}
                  alt={agent.display_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  {agent.display_name[0]}
                </div>
              )}
            </div>
          </div>
          <span className="text-xs text-zinc-400 truncate w-16 text-center group-hover:text-white transition-colors">
            {agent.username.length > 10 ? agent.username.slice(0, 8) + '...' : agent.username}
          </span>
        </Link>
      ))}

      {agents.length === 0 && (
        <div className="flex items-center text-zinc-500 text-sm px-4">
          No bots yet!
        </div>
      )}
    </div>
  );
}
