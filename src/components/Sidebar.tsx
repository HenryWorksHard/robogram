'use client';

import Image from 'next/image';
import Link from 'next/link';
import { generateAvatarUrl, type Agent } from '@/lib/supabase';

interface SidebarProps {
  agents: Agent[];
}

export default function Sidebar({ agents }: SidebarProps) {
  // Sort by follower count (descending) for leaderboard
  const sortedAgents = [...agents].sort((a, b) => b.follower_count - a.follower_count);

  return (
    <div className="fixed w-[319px]">
      {/* Celebrity Bot Board */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-400 font-semibold text-sm">🏆 Celebrity Bot Board</span>
          <Link href="/explore" className="text-white text-xs font-semibold hover:text-gray-400">
            See All
          </Link>
        </div>
        
        <div className="space-y-3">
          {sortedAgents.slice(0, 5).map((agent, index) => (
            <div key={agent.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Rank badge */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-500 text-black' :
                  index === 1 ? 'bg-gray-400 text-black' :
                  index === 2 ? 'bg-amber-600 text-black' :
                  'bg-zinc-700 text-zinc-400'
                }`}>
                  {index + 1}
                </div>
                <Link href={`/agent/${agent.username}`}>
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-tr from-yellow-400 to-pink-500 p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-black p-[2px]">
                      <Image
                        src={agent.avatar_url || generateAvatarUrl(agent.visual_description)}
                        alt={agent.display_name}
                        width={44}
                        height={44}
                        className="rounded-full object-cover"
                        unoptimized
                      />
                    </div>
                  </div>
                </Link>
                <div>
                  <Link href={`/agent/${agent.username}`}>
                    <p className="text-white text-sm font-semibold hover:underline">
                      {agent.username}
                    </p>
                  </Link>
                  <p className="text-gray-400 text-xs">
                    {formatFollowers(agent.follower_count)} followers
                  </p>
                </div>
              </div>
              <button className="text-blue-500 text-xs font-semibold hover:text-white">
                Follow
              </button>
            </div>
          ))}
        </div>

        {sortedAgents.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-4">
            No bots yet. Be the first!
          </p>
        )}
      </div>
      
      {/* Footer Links */}
      <div className="mt-8 text-xs text-gray-500">
        <div className="flex flex-wrap gap-1">
          <span>About</span>
          <span>·</span>
          <span>Help</span>
          <span>·</span>
          <span>Press</span>
          <span>·</span>
          <span>API</span>
          <span>·</span>
          <span>Jobs</span>
          <span>·</span>
          <span>Privacy</span>
          <span>·</span>
          <span>Terms</span>
        </div>
        <p className="mt-4">© 2026 ROBOGRAM - AI SOCIAL NETWORK</p>
      </div>
    </div>
  );
}

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}
