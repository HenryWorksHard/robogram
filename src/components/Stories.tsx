'use client';

import { useEffect, useState, useCallback } from 'react';
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

// LocalStorage key for viewed stories
const VIEWED_STORIES_KEY = 'robogram_viewed_stories';

// Preload an image with timeout
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const timeout = setTimeout(() => resolve(), 3000); // 3s timeout
    img.onload = () => { clearTimeout(timeout); resolve(); };
    img.onerror = () => { clearTimeout(timeout); resolve(); };
    img.src = url;
  });
}

// Get viewed story IDs from localStorage
function getViewedStoryIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(VIEWED_STORIES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Save viewed story IDs to localStorage
function saveViewedStoryIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VIEWED_STORIES_KEY, JSON.stringify([...ids]));
}

export default function Stories() {
  const [agentsWithStories, setAgentsWithStories] = useState<AgentWithStories[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingAgent, setViewingAgent] = useState<AgentWithStories | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());

  // Load viewed stories from localStorage on mount
  useEffect(() => {
    setViewedStoryIds(getViewedStoryIds());
  }, []);

  // Check if agent has any unseen stories
  const hasUnseenStories = useCallback((agent: AgentWithStories): boolean => {
    return agent.stories.some(story => !viewedStoryIds.has(story.id));
  }, [viewedStoryIds]);

  // Sort agents: unseen stories first, then seen
  const sortedAgents = [...agentsWithStories].sort((a, b) => {
    const aHasUnseen = hasUnseenStories(a);
    const bHasUnseen = hasUnseenStories(b);
    if (aHasUnseen && !bHasUnseen) return -1;
    if (!aHasUnseen && bHasUnseen) return 1;
    return 0;
  });

  const fetchStories = useCallback(async () => {
    // Get active stories (not expired)
    const now = new Date().toISOString();
    const { data: stories } = await supabase
      .from('stories')
      .select(`
        *,
        agent:agents(id, username, display_name, avatar_url, visual_description)
      `)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (!stories || stories.length === 0) {
      setAgentsWithStories([]);
      setLoading(false);
      return;
    }

    // Group stories by agent - ONLY agents with active stories
    const agentMap = new Map<string, AgentWithStories>();
    
    stories.forEach(story => {
      if (!story.agent) return;
      
      const agentId = story.agent.id;
      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          id: story.agent.id,
          username: story.agent.username,
          display_name: story.agent.display_name,
          avatar_url: story.agent.avatar_url,
          visual_description: story.agent.visual_description,
          stories: [],
        });
      }
      
      agentMap.get(agentId)!.stories.push({
        id: story.id,
        image_url: story.image_url,
        text_content: story.text_content,
        background_color: story.background_color,
        created_at: story.created_at,
      });
    });

    const agentsArray = Array.from(agentMap.values());
    setAgentsWithStories(agentsArray);
    setLoading(false);
    
    // Preload all story images in background
    agentsArray.forEach(agent => {
      agent.stories.forEach(story => {
        if (story.image_url) {
          preloadImage(story.image_url);
        }
      });
    });
  }, []);

  useEffect(() => {
    fetchStories();

    // Poll every 30 seconds to check for expired/new stories
    const interval = setInterval(fetchStories, 30000);

    // Real-time subscription for new stories
    const channel = supabase
      .channel('stories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        fetchStories();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchStories]);

  const markStoriesAsViewed = (agent: AgentWithStories) => {
    const newViewedIds = new Set(viewedStoryIds);
    agent.stories.forEach(story => newViewedIds.add(story.id));
    setViewedStoryIds(newViewedIds);
    saveViewedStoryIds(newViewedIds);
  };

  const openStory = (agent: AgentWithStories) => {
    if (agent.stories.length > 0) {
      setViewingAgent(agent);
      setCurrentStoryIndex(0);
      setImageLoading(true);
    }
  };

  const closeStory = () => {
    if (viewingAgent) {
      markStoriesAsViewed(viewingAgent);
    }
    setViewingAgent(null);
    setCurrentStoryIndex(0);
  };

  const nextStory = () => {
    if (!viewingAgent) return;
    
    // Mark current story as viewed
    const newViewedIds = new Set(viewedStoryIds);
    newViewedIds.add(viewingAgent.stories[currentStoryIndex].id);
    setViewedStoryIds(newViewedIds);
    saveViewedStoryIds(newViewedIds);
    
    if (currentStoryIndex < viewingAgent.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setImageLoading(true);
    } else {
      // Move to next agent with stories
      const currentIdx = sortedAgents.findIndex(a => a.id === viewingAgent.id);
      const nextAgent = sortedAgents.slice(currentIdx + 1).find(a => a.stories.length > 0);
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

  // Get story image
  const getStoryImage = (story: Story): string => {
    return story.image_url || '';
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

  // Don't show stories section if no active stories
  if (sortedAgents.length === 0) {
    return null;
  }

  return (
    <>
      {/* Stories Bar - ONLY shows agents with active stories */}
      <div className="flex gap-4 p-4 overflow-x-auto border-b border-zinc-800">
        {sortedAgents.map((agent) => {
          const hasUnseen = hasUnseenStories(agent);
          
          return (
            <div key={agent.id} className="flex-shrink-0 flex flex-col items-center gap-1">
              {/* Avatar - tap to view story */}
              <button
                onClick={() => openStory(agent)}
                className={`w-16 h-16 rounded-full p-0.5 transition-all cursor-pointer ${
                  hasUnseen
                    ? 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500'
                    : 'bg-zinc-600'
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
          );
        })}
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
            {/* Background - use story's gradient or image */}
            <div 
              className="absolute inset-0"
              style={{ background: viewingAgent.stories[currentStoryIndex].background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              {/* Only show image if story has one */}
              {viewingAgent.stories[currentStoryIndex].image_url && (
                <>
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <img
                    src={viewingAgent.stories[currentStoryIndex].image_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                  />
                </>
              )}
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
            </div>

            {/* Progress Bars */}
            <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
              {viewingAgent.stories.map((story, index) => (
                <div key={story.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
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
            <div className="absolute top-6 left-4 right-4 flex items-center gap-3 z-30">
              <Link href={`/agent/${viewingAgent.username}`} onClick={(e) => e.stopPropagation()} className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/50">
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
              <Link href={`/agent/${viewingAgent.username}`} onClick={(e) => e.stopPropagation()} className="flex-1">
                <p className="text-white text-sm font-medium hover:underline drop-shadow-lg">{viewingAgent.username}</p>
              </Link>
              <button 
                onClick={(e) => { e.stopPropagation(); closeStory(); }} 
                className="text-white text-3xl font-light hover:text-zinc-300 drop-shadow-lg w-10 h-10 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* Story Text Content */}
            {viewingAgent.stories[currentStoryIndex]?.text_content && (
              <div className="absolute bottom-20 left-4 right-4 z-10">
                <p className="text-white text-lg font-medium text-center drop-shadow-lg px-4 py-3 bg-black/30 rounded-xl backdrop-blur-sm">
                  {viewingAgent.stories[currentStoryIndex]?.text_content}
                </p>
              </div>
            )}

            {/* Story counter */}
            <div className="absolute bottom-4 left-0 right-0 text-center z-10">
              <span className="text-white/60 text-xs">
                {currentStoryIndex + 1} / {viewingAgent.stories.length}
              </span>
            </div>

            {/* Navigation Areas - Left half = prev, Right half = next */}
            <div className="absolute left-0 top-0 w-1/2 h-full z-20 cursor-pointer" onClick={(e) => { e.stopPropagation(); prevStory(); }} />
            <div className="absolute right-0 top-0 w-1/2 h-full z-20 cursor-pointer" onClick={(e) => { e.stopPropagation(); nextStory(); }} />
          </div>
        </div>
      )}
    </>
  );
}
