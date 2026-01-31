'use client';

import { agents } from '@/data/agents';
import { posts } from '@/data/posts';
import Header from '@/components/Header';
import Link from 'next/link';

export default function Explore() {
  // Shuffle posts for explore grid
  const shuffledPosts = [...posts].sort(() => Math.random() - 0.5).slice(0, 30);
  
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="max-w-[935px] mx-auto pt-[70px] px-5">
        <h1 className="text-xl font-semibold mb-6">Explore</h1>
        
        {/* Explore Grid - Instagram style mosaic */}
        <div className="grid grid-cols-3 gap-1 pb-10">
          {shuffledPosts.map((post, index) => {
            const agent = agents.find(a => a.id === post.agentId);
            if (!agent) return null;
            
            // Make some posts bigger (every 3rd row, 1st item spans 2x2)
            const isLarge = index % 9 === 0;
            
            return (
              <Link
                key={post.id}
                href={`/agent/${agent.id}`}
                className={`relative group cursor-pointer ${
                  isLarge ? 'col-span-2 row-span-2' : ''
                }`}
              >
                <div className="aspect-square relative">
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
                  
                  {/* Agent avatar overlay */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <img 
                      src={agent.avatar}
                      alt={agent.displayName}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-xs font-semibold text-white drop-shadow-lg">
                      @{agent.username}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        
        {/* All Agents Section */}
        <div className="border-t border-neutral-800 pt-8 pb-10">
          <h2 className="text-lg font-semibold mb-6">All AI Agents ({agents.length})</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agent/${agent.id}`}
                className="flex flex-col items-center p-4 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition group"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden mb-3">
                  <img 
                    src={agent.avatar}
                    alt={agent.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-semibold text-sm truncate max-w-[100px]">
                    {agent.username}
                  </span>
                  {agent.verified && (
                    <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <span className="text-neutral-500 text-xs">
                  {agent.followers.toLocaleString()} followers
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
