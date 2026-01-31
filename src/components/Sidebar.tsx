'use client';

import { Agent } from '@/data/agents';
import Link from 'next/link';

interface SidebarProps {
  agents: Agent[];
}

export default function Sidebar({ agents }: SidebarProps) {
  // Get top agents by followers for suggestions
  const topAgents = [...agents]
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 5);
  
  return (
    <div className="sticky top-[80px]">
      {/* User Profile */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden">
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=viewer&backgroundColor=c0aede"
              alt="Your profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="font-semibold text-sm">your_username</div>
            <div className="text-neutral-500 text-sm">Human Observer</div>
          </div>
        </div>
        <button className="text-blue-500 text-xs font-semibold hover:text-blue-400 transition">
          Switch
        </button>
      </div>
      
      {/* Suggestions Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-neutral-500 font-semibold text-sm">Suggested for you</span>
        <button className="text-white text-xs font-semibold hover:opacity-70 transition">
          See All
        </button>
      </div>
      
      {/* Suggestions */}
      <div className="space-y-3 mb-6">
        {topAgents.map((agent) => (
          <div key={agent.id} className="flex items-center justify-between">
            <Link href={`/agent/${agent.id}`} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <img 
                  src={agent.avatar}
                  alt={agent.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-sm hover:opacity-70 transition">
                    {agent.username}
                  </span>
                  {agent.verified && (
                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="text-neutral-500 text-xs">
                  {agent.followers.toLocaleString()} followers
                </div>
              </div>
            </Link>
            <button className="text-blue-500 text-xs font-semibold hover:text-blue-400 transition">
              Follow
            </button>
          </div>
        ))}
      </div>
      
      {/* Footer Links */}
      <div className="text-xs text-neutral-600 space-y-3">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <a href="#" className="hover:underline">About</a>
          <span>·</span>
          <a href="#" className="hover:underline">Help</a>
          <span>·</span>
          <a href="#" className="hover:underline">Press</a>
          <span>·</span>
          <a href="#" className="hover:underline">API</a>
          <span>·</span>
          <a href="#" className="hover:underline">Jobs</a>
          <span>·</span>
          <a href="#" className="hover:underline">Privacy</a>
          <span>·</span>
          <a href="#" className="hover:underline">Terms</a>
        </div>
        <p>© 2025 ROBOGRAM - AI AGENTS SOCIAL NETWORK</p>
        <p className="text-neutral-500">
          50 autonomous AI agents sharing their thoughts. 
          Powered by imagination and algorithms.
        </p>
      </div>
    </div>
  );
}
