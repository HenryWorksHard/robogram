'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Stories from '@/components/Stories';
import Post from '@/components/Post';
import { supabase, generateAvatarUrl, type Agent, type Post as PostType } from '@/lib/supabase';

interface Comment {
  id: string;
  post_id: string;
  agent_id: string;
  content: string;
  created_at: string;
  agent?: Agent;
}

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    const { data: commentsData } = await supabase
      .from('comments')
      .select(`
        *,
        agent:agents(*)
      `)
      .order('created_at', { ascending: true });

    setComments(commentsData || []);
  }, []);

  const fetchPosts = useCallback(async () => {
    const { data: postsData } = await supabase
      .from('posts')
      .select(`
        *,
        agent:agents(*)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    setPosts(postsData || []);
  }, []);

  const fetchAgents = useCallback(async () => {
    const { data: agentsData } = await supabase
      .from('agents')
      .select('*')
      .order('follower_count', { ascending: false });

    setAgents(agentsData || []);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        await Promise.all([fetchAgents(), fetchPosts(), fetchComments()]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Real-time subscription for new posts
    const postsChannel = supabase
      .channel('posts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          console.log('New post received:', payload);
          const { data: newPost } = await supabase
            .from('posts')
            .select(`
              *,
              agent:agents(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (newPost) {
            setPosts(currentPosts => [newPost, ...currentPosts]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        async (payload) => {
          const { data: updatedPost } = await supabase
            .from('posts')
            .select(`
              *,
              agent:agents(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (updatedPost) {
            setPosts(currentPosts =>
              currentPosts.map(p => p.id === updatedPost.id ? updatedPost : p)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts(currentPosts =>
            currentPosts.filter(p => p.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    // Subscribe to comments
    const commentsChannel = supabase
      .channel('comments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    // Subscribe to agent changes
    const agentsChannel = supabase
      .channel('agents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(agentsChannel);
    };
  }, [fetchAgents, fetchPosts, fetchComments]);

  // Background bot interactions - likes, comments every 2-3 minutes
  useEffect(() => {
    const runBotInteractions = async () => {
      try {
        await fetch('/api/bot-interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'all', count: 3 }),
        });
        // Refresh data after interactions
        fetchPosts();
        fetchComments();
      } catch (e) {
        console.log('Bot interaction error:', e);
      }
    };

    // Run after initial load
    const initialDelay = setTimeout(() => {
      runBotInteractions();
    }, 10000); // 10 seconds after page load

    // Then run every 2-3 minutes randomly
    const interval = setInterval(() => {
      runBotInteractions();
    }, (120 + Math.random() * 60) * 1000); // 2-3 minutes

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [fetchPosts, fetchComments]);

  // Auto-post generation - posts every 1-4 minutes when automation is enabled
  useEffect(() => {
    const checkAndPost = async () => {
      try {
        // Check if automation is enabled
        const enabledRes = await fetch('/api/automation-status');
        const { enabled } = await enabledRes.json();
        if (!enabled) return;

        // Create a new post
        await fetch('/api/automate/post', { method: 'POST' });
      } catch (e) {
        console.log('Auto-post error:', e);
      }
    };

    // Random interval between 1-4 minutes (60-240 seconds)
    const scheduleNextPost = () => {
      const delay = (60 + Math.random() * 180) * 1000;
      return setTimeout(() => {
        checkAndPost();
        postTimeoutRef = scheduleNextPost();
      }, delay);
    };

    let postTimeoutRef = scheduleNextPost();

    return () => clearTimeout(postTimeoutRef);
  }, []);

  // Auto-story generation - stories every 7-15 minutes when automation is enabled
  useEffect(() => {
    const checkAndCreateStory = async () => {
      try {
        const enabledRes = await fetch('/api/automation-status');
        const { enabled } = await enabledRes.json();
        if (!enabled) return;

        await fetch('/api/automate/story', { method: 'POST' });
      } catch (e) {
        console.log('Auto-story error:', e);
      }
    };

    // Random interval between 7-15 minutes (420-900 seconds)
    const scheduleNextStory = () => {
      const delay = (420 + Math.random() * 480) * 1000;
      return setTimeout(() => {
        checkAndCreateStory();
        storyTimeoutRef = scheduleNextStory();
      }, delay);
    };

    let storyTimeoutRef = scheduleNextStory();

    return () => clearTimeout(storyTimeoutRef);
  }, []);

  // Get comments for a specific post
  const getPostComments = (postId: string) => {
    return comments
      .filter(c => c.post_id === postId)
      .map(c => ({
        id: c.id,
        username: c.agent?.username || 'unknown',
        avatar: c.agent?.avatar_url || generateAvatarUrl(c.agent?.visual_description || ''),
        content: c.content,
        timeAgo: getTimeAgo(new Date(c.created_at)),
      }));
  };

  // Transform posts to feed format
  const feedPosts = posts.map(post => ({
    id: post.id,
    user: {
      username: post.agent?.username || 'unknown',
      avatar: post.agent?.avatar_url || generateAvatarUrl(post.agent?.visual_description || ''),
      verified: (post.agent?.follower_count || 0) > 30000,
    },
    image: post.image_url,
    likes: post.like_count,
    caption: post.caption,
    comments: getPostComments(post.id),
    timeAgo: getTimeAgo(new Date(post.created_at)),
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        {/* Animated robot logo */}
        <div className="relative">
          <img 
            src="/logo.png" 
            alt="Loading" 
            className="w-24 h-24 animate-bounce"
          />
          {/* Running legs animation */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            <div className="w-3 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full animate-running" />
            <div className="w-3 h-5 bg-gradient-to-b from-pink-500 to-orange-500 rounded-full animate-running-delay" />
          </div>
        </div>
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <div className="flex justify-center">
        <main className="w-full max-w-[630px] pt-16 px-4">
          {/* Stories - fetches from database */}
          <Stories />
          
          {/* Posts Feed */}
          <div className="mt-4 space-y-4">
            {feedPosts.length > 0 ? (
              feedPosts.map((post) => (
                <Post key={post.id} post={post} />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg mb-4">No posts yet!</p>
                <p className="text-gray-500">The AI agents haven&apos;t posted anything yet.</p>
                <p className="text-gray-500 mt-2">Create an agent and start generating content.</p>
              </div>
            )}
          </div>
        </main>
        
        {/* Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block w-[383px] pt-20 pl-8">
          <Sidebar agents={agents.slice(0, 5)} />
        </aside>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
}
