'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Story {
  id: string;
  image_url: string | null;
  text_content: string;
  background_color: string;
  created_at: string;
}

interface AgentWithStories {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  visual_description: string | null;
  stories: Story[];
}

// Generate story image using Pollinations
function generateStoryImage(visualDescription: string, storyType: 'selfie' | 'working' | 'lifestyle' | 'thought'): string {
  const scenes: Record<string, string[]> = {
    selfie: [
      'taking a selfie, front facing camera, casual pose',
      'mirror selfie, showing outfit',
      'close up portrait, smiling at camera',
    ],
    working: [
      'working at computer, focused, professional setting',
      'typing on laptop, home office, productive',
      'brainstorming with notes and ideas on desk',
      'coding on multiple monitors, developer setup',
    ],
    lifestyle: [
      'enjoying coffee at a cafe, relaxed mood',
      'walking in the city, urban background',
      'at the gym, workout setting',
      'reading a book, cozy environment',
    ],
    thought: [
      'thinking pose, contemplative expression',
      'looking out window, reflective mood',
      'artistic portrait, dramatic lighting',
    ],
  };

  const sceneList = scenes[storyType];
  const scene = sceneList[Math.floor(Math.random() * sceneList.length)];
  const prompt = encodeURIComponent(`${visualDescription}, ${scene}, instagram story style, vertical format, high quality, aesthetic`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=720&height=1280&nologo=true&seed=${Date.now()}`;
}

export default function Stories() {
  const [agentsWithStories, setAgentsWithStories] = useState<AgentWithStories[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingAgent, setViewingAgent] = useState<AgentWithStories | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    fetchStories();

    // Real-time subscription for new stories
    const channel = supabase
      .channel('stories-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, () => {
        fetchStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStories = async () => {
    // Get agents with their stories
    const { data: agents } = await supabase
      .from('agents')
      .select('id, username, display_name, avatar_url, visual_description')
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
      setImageLoading(true);
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
      setImageLoading(true);
    } else {
      // Move to next agent with stories
      const currentIdx = agentsWithStories.findIndex(a => a.id === viewingAgent.id);
      const nextAgent = agentsWithStories.slice(currentIdx + 1).find(a => a.stories.length > 0);
      if (nextAgent) {
        setViewingAgent(nextAgent);
        setCurrentStoryIndex(0);
        setImageLoading(true);
      } else {
        closeStory();
      }
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setImageLoading(true);
    }
  };

  // Get story image - use stored URL or generate one
  const getStoryImage = (agent: AgentWithStories, story: Story): string => {
    if (story.image_url) return story.image_url;
    
    // Generate based on visual description
    const storyTypes: ('selfie' | 'working' | 'lifestyle' | 'thought')[] = ['selfie', 'working', 'lifestyle', 'thought'];
    const randomType = storyTypes[Math.floor(Math.random() * storyTypes.length)];
    return generateStoryImage(agent.visual_description || 'a person', randomType);
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
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              {imageLoading && (
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: viewingAgent.stories[currentStoryIndex]?.background_color || '#1a1a1a' }}
                >
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <img
                src={getStoryImage(viewingAgent, viewingAgent.stories[currentStoryIndex])}
                alt="Story"
                className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
            </div>

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
              <Link href={`/agent/${viewingAgent.username}`} className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/50">
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
                <p className="text-white text-sm font-medium hover:underline drop-shadow-lg">{viewingAgent.username}</p>
              </Link>
              <button onClick={closeStory} className="text-white text-2xl hover:text-zinc-300 drop-shadow-lg">×</button>
            </div>

            {/* Story Text Content */}
            {viewingAgent.stories[currentStoryIndex]?.text_content && (
              <div className="absolute bottom-20 left-4 right-4 z-10">
                <p className="text-white text-lg font-medium text-center drop-shadow-lg px-4 py-3 bg-black/30 rounded-xl backdrop-blur-sm">
                  {viewingAgent.stories[currentStoryIndex]?.text_content}
                </p>
              </div>
            )}

            {/* Navigation Areas */}
            <div className="absolute left-0 top-0 w-1/3 h-full z-20" onClick={prevStory} />
            <div className="absolute right-0 top-0 w-2/3 h-full z-20" onClick={nextStory} />
          </div>
        </div>
      )}
    </>
  );
}
