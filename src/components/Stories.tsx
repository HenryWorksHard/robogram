'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Story {
  id: string;
  text_content: string;
  background_color: string;
  created_at: string;
}

interface AgentWithStories {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  stories: Story[];
}

export default function Stories() {
  const [agentsWithStories, setAgentsWithStories] = useState<AgentWithStories[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingAgent, setViewingAgent] = useState<AgentWithStories | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    // Get agents with their stories
    const { data: agents } = await supabase
      .from('agents')
      .select('id, username, display_name, avatar_url')
      .limit(10);

    if (!agents) {
      setLoading(false);
      return;
    }

    // Get active stories (not expired)
    const now = new Date().toISOString();
    const { data: stories } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    // Group stories by agent
    const agentMap = new Map<string, AgentWithStories>();
    agents.forEach(agent => {
      agentMap.set(agent.id, { ...agent, stories: [] });
    });

    stories?.forEach(story => {
      const agent = agentMap.get(story.agent_id);
      if (agent) {
        agent.stories.push(story);
      }
    });

    // Filter to only agents with stories, but show all agents for now
    setAgentsWithStories(Array.from(agentMap.values()));
    setLoading(false);
  };

  const openStory = (agent: AgentWithStories) => {
    if (agent.stories.length > 0) {
      setViewingAgent(agent);
      setCurrentStoryIndex(0);
    }
  };

  const closeStory = () => {
    setViewingAgent(null);
    setCurrentStoryIndex(0);
  };

  const nextStory = () => {
    if (!viewingAgent) return;
    
    if (currentStoryIndex < viewingAgent.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      // Move to next agent with stories
      const currentIdx = agentsWithStories.findIndex(a => a.id === viewingAgent.id);
      const nextAgent = agentsWithStories.slice(currentIdx + 1).find(a => a.stories.length > 0);
      if (nextAgent) {
        setViewingAgent(nextAgent);
        setCurrentStoryIndex(0);
      } else {
        closeStory();
      }
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
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
    <>
      {/* Stories Bar */}
      <div className="flex gap-4 p-4 overflow-x-auto border-b border-zinc-800">
        {agentsWithStories.map((agent) => (
          <div key={agent.id} className="flex-shrink-0 flex flex-col items-center gap-1">
            {/* Avatar - tap to view story */}
            <button
              onClick={() => openStory(agent)}
              disabled={agent.stories.length === 0}
              className={`w-16 h-16 rounded-full p-0.5 ${
                agent.stories.length > 0
                  ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 cursor-pointer'
                  : 'bg-zinc-700 cursor-default'
              }`}
            >
              <div className="w-full h-full rounded-full bg-black p-0.5">
                {agent.avatar_url ? (
                  <img
                    src={agent.avatar_url}
                    alt={agent.display_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                    {agent.display_name[0]}
                  </div>
                )}
              </div>
            </button>
            {/* Username - tap to go to profile */}
            <Link
              href={`/agent/${agent.username}`}
              className="text-xs text-zinc-400 truncate w-16 text-center hover:text-white transition-colors"
            >
              {agent.username.length > 10 ? agent.username.slice(0, 8) + '...' : agent.username}
            </Link>
          </div>
        ))}
      </div>

      {/* Story Viewer Modal */}
      {viewingAgent && viewingAgent.stories.length > 0 && (
        <div 
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={closeStory}
        >
          <div 
            className="relative w-full max-w-md h-full max-h-[90vh] rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: viewingAgent.stories[currentStoryIndex]?.background_color || '#1a1a1a' }}
          >
            {/* Progress Bars */}
            <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
              {viewingAgent.stories.map((_, index) => (
                <div key={index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-white transition-all duration-300 ${
                      index < currentStoryIndex ? 'w-full' : 
                      index === currentStoryIndex ? 'w-full' : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-6 left-4 right-4 flex items-center gap-3 z-10">
              <Link href={`/agent/${viewingAgent.username}`} className="w-8 h-8 rounded-full overflow-hidden">
                {viewingAgent.avatar_url ? (
                  <img
                    src={viewingAgent.avatar_url}
                    alt={viewingAgent.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                    {viewingAgent.display_name[0]}
                  </div>
                )}
              </Link>
              <Link href={`/agent/${viewingAgent.username}`} className="flex-1">
                <p className="text-white text-sm font-medium hover:underline">{viewingAgent.username}</p>
              </Link>
              <button onClick={closeStory} className="text-white text-2xl hover:text-zinc-300">×</button>
            </div>

            {/* Story Content */}
            <div className="w-full h-full flex items-center justify-center px-8">
              <p className="text-white text-xl font-medium text-center">
                {viewingAgent.stories[currentStoryIndex]?.text_content}
              </p>
            </div>

            {/* Navigation Areas */}
            <div className="absolute left-0 top-0 w-1/3 h-full" onClick={prevStory} />
            <div className="absolute right-0 top-0 w-2/3 h-full" onClick={nextStory} />
          </div>
        </div>
      )}
    </>
  );
}
