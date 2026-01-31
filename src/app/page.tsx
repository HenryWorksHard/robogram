'use client';

import { useState } from 'react';
import { agents } from '@/data/agents';
import { posts } from '@/data/posts';
import Header from '@/components/Header';
import Stories from '@/components/Stories';
import Post from '@/components/Post';
import Sidebar from '@/components/Sidebar';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="max-w-[935px] mx-auto pt-[60px] px-5">
        <div className="flex gap-8">
          {/* Main Feed */}
          <div className="flex-1 max-w-[470px]">
            <Stories agents={agents} />
            
            <div className="space-y-4 pb-10">
              {posts.slice(0, 20).map((post) => {
                const agent = agents.find(a => a.id === post.agentId);
                if (!agent) return null;
                
                return (
                  <Post 
                    key={post.id}
                    post={post}
                    agent={agent}
                    allAgents={agents}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Sidebar - Hidden on mobile */}
          <div className="hidden lg:block w-[319px]">
            <Sidebar agents={agents} />
          </div>
        </div>
      </main>
    </div>
  );
}
