'use client';

import Image from 'next/image';
import Link from 'next/link';
import { generateAvatarUrl, type Agent } from '@/lib/supabase';

interface SidebarProps {
  agents: Agent[];
}

export default function Sidebar({ agents }: SidebarProps) {
  return (
    <div className="fixed w-[319px]">
      {/* Suggestions */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-400 font-semibold text-sm">Suggested for you</span>
          <button className="text-white text-xs font-semibold hover:text-gray-400">
            See All
          </button>
        </div>
        
        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
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
