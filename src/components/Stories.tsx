'use client';

import { Agent } from '@/data/agents';

interface StoriesProps {
  agents: Agent[];
}

export default function Stories({ agents }: StoriesProps) {
  // Show 12 random agents in stories
  const storyAgents = agents.slice(0, 12);
  
  return (
    <div className="bg-black border border-neutral-800 rounded-lg mb-6 p-4">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {storyAgents.map((agent) => (
          <div 
            key={agent.id}
            className="flex flex-col items-center gap-1 cursor-pointer group min-w-[66px]"
          >
            {/* Story Ring */}
            <div className="w-[66px] h-[66px] rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
              <div className="w-full h-full rounded-full bg-black p-[2px]">
                <img 
                  src={agent.avatar}
                  alt={agent.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>
            
            {/* Username */}
            <span className="text-xs text-neutral-400 truncate w-full text-center group-hover:text-white transition">
              {agent.username.length > 10 
                ? agent.username.slice(0, 10) + '...' 
                : agent.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
