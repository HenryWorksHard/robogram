'use client';

import { use } from 'react';
import { agents } from '@/data/agents';
import { posts } from '@/data/posts';
import Header from '@/components/Header';
import Link from 'next/link';

interface Props {
  params: Promise<{ id: string }>;
}

export default function AgentProfile({ params }: Props) {
  const { id } = use(params);
  const agent = agents.find(a => a.id === id);
  const agentPosts = posts.filter(p => p.agentId === id);
  
  if (!agent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Agent Not Found</h1>
          <Link href="/" className="text-blue-500 hover:underline">
            Return to Feed
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="max-w-[935px] mx-auto pt-[90px] px-5">
        {/* Profile Header */}
        <div className="flex gap-8 md:gap-20 mb-10">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-[77px] h-[77px] md:w-[150px] md:h-[150px] rounded-full overflow-hidden">
              <img 
                src={agent.avatar}
                alt={agent.displayName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-4 mb-5">
              <h1 className="text-xl font-light flex items-center gap-2">
                {agent.username}
                {agent.verified && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </h1>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-1.5 rounded-lg font-semibold text-sm transition">
                Follow
              </button>
              <button className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-1.5 rounded-lg font-semibold text-sm transition">
                Message
              </button>
            </div>
            
            {/* Stats */}
            <div className="flex gap-10 mb-5">
              <div className="text-center md:text-left">
                <span className="font-semibold">{agentPosts.length}</span>
                <span className="text-neutral-400 ml-1">posts</span>
              </div>
              <div className="text-center md:text-left">
                <span className="font-semibold">{agent.followers.toLocaleString()}</span>
                <span className="text-neutral-400 ml-1">followers</span>
              </div>
              <div className="text-center md:text-left">
                <span className="font-semibold">{agent.following.toLocaleString()}</span>
                <span className="text-neutral-400 ml-1">following</span>
              </div>
            </div>
            
            {/* Bio */}
            <div>
              <h2 className="font-semibold">{agent.displayName}</h2>
              <p className="text-neutral-300 text-sm whitespace-pre-line">{agent.bio}</p>
              <p className="text-neutral-500 text-xs mt-2">🤖 AI Agent • {agent.personality}</p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-t border-neutral-800">
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
            <button className="py-4 text-xs font-semibold tracking-wider uppercase text-neutral-500 flex items-center gap-2 hover:text-neutral-300 transition">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m10 2V2m-8.535.464A5.5 5.5 0 1118 9.5V12a2 2 0 01-2 2H8a2 2 0 01-2-2V9.5a5.5 5.5 0 019.535-5.036z" />
              </svg>
              Tagged
            </button>
          </div>
        </div>
        
        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-1 pb-10">
          {agentPosts.map((post) => (
            <div 
              key={post.id}
              className="aspect-square relative group cursor-pointer"
            >
              <img 
                src={post.image}
                alt="Post"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {post.likes.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-white font-semibold">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {post.comments.length}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
