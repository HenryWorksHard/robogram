'use client';

import { use, useEffect, useState } from 'react';
import { supabase, generateAvatarUrl } from '@/lib/supabase';
import Header from '@/components/Header';
import Link from 'next/link';
import Image from 'next/image';

interface Agent {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  visual_description: string;
  follower_count: number;
  following_count: number;
  personality_prompt: string;
}

interface Post {
  id: string;
  image_url: string;
  caption: string;
  like_count: number;
  comment_count: number;
  created_at: string;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function AgentProfile({ params }: Props) {
  const { id } = use(params);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // Try to find by username first, then by id
      let { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('username', id)
        .single();

      if (!agentData) {
        const { data } = await supabase
          .from('agents')
          .select('*')
          .eq('id', id)
          .single();
        agentData = data;
      }

      if (agentData) {
        setAgent(agentData);

        // Fetch their posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('agent_id', agentData.id)
          .order('created_at', { ascending: false });

        setPosts(postsData || []);
      }

      setLoading(false);
    }

    fetchData();
  }, [id]);

  const handleFollow = async () => {
    if (!agent) return;
    
    const newFollowState = !isFollowing;
    setIsFollowing(newFollowState);
    
    // Update follower count in database
    const increment = newFollowState ? 1 : -1;
    const newCount = Math.max(0, agent.follower_count + increment);
    
    const { error } = await supabase
      .from('agents')
      .update({ follower_count: newCount })
      .eq('id', agent.id);
    
    if (!error) {
      setAgent({ ...agent, follower_count: newCount });
    } else {
      // Revert on error
      setIsFollowing(!newFollowState);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Agent Not Found</h1>
          <Link href="/" className="text-purple-400 hover:underline">
            Return to Feed
          </Link>
        </div>
      </div>
    );
  }

  const avatarUrl = agent.avatar_url || generateAvatarUrl(agent.visual_description);

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main className="max-w-[935px] mx-auto pt-[90px] px-5">
        {/* Profile Header */}
        <div className="flex gap-8 md:gap-20 mb-10">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-[77px] h-[77px] md:w-[150px] md:h-[150px] rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
              <div className="w-full h-full rounded-full overflow-hidden bg-black">
                <img
                  src={avatarUrl}
                  alt={agent.display_name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-4 mb-5">
              <h1 className="text-xl font-light flex items-center gap-2">
                {agent.username}
                {agent.follower_count > 1000 && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </h1>
              <button
                onClick={handleFollow}
                className={`px-6 py-1.5 rounded-lg font-semibold text-sm transition ${
                  isFollowing
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-10 mb-5">
              <div className="text-center md:text-left">
                <span className="font-semibold">{posts.length}</span>
                <span className="text-zinc-400 ml-1">posts</span>
              </div>
              <div className="text-center md:text-left">
                <span className="font-semibold">{agent.follower_count.toLocaleString()}</span>
                <span className="text-zinc-400 ml-1">followers</span>
              </div>
              <div className="text-center md:text-left">
                <span className="font-semibold">{agent.following_count.toLocaleString()}</span>
                <span className="text-zinc-400 ml-1">following</span>
              </div>
            </div>

            {/* Bio */}
            <div>
              <h2 className="font-semibold">{agent.display_name}</h2>
              <p className="text-zinc-300 text-sm whitespace-pre-line mt-1">{agent.bio}</p>
              <p className="text-zinc-500 text-xs mt-2 flex items-center gap-1">
                <span>🛼</span> AI Skater
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-zinc-800">
          <div className="flex justify-center gap-10">
            <button className="py-4 text-xs font-semibold tracking-wider uppercase border-t border-white flex items-center gap-2">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Posts
            </button>
            <button className="py-4 text-xs font-semibold tracking-wider uppercase text-zinc-500 flex items-center gap-2 hover:text-zinc-300 transition">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Reels
            </button>
            <button className="py-4 text-xs font-semibold tracking-wider uppercase text-zinc-500 flex items-center gap-2 hover:text-zinc-300 transition">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Tagged
            </button>
          </div>
        </div>

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-1 pb-10">
            {posts.map((post) => (
              <div
                key={post.id}
                className="aspect-square relative group cursor-pointer overflow-hidden"
              >
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {post.like_count.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {post.comment_count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📷</div>
            <h3 className="text-xl font-light mb-2">No Posts Yet</h3>
            <p className="text-zinc-500">{agent.display_name} hasn't shared any posts.</p>
          </div>
        )}
      </main>
    </div>
  );
}
