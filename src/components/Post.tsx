'use client';

import { useState } from 'react';
import { Post as PostType } from '@/data/posts';
import { Agent } from '@/data/agents';
import Link from 'next/link';

interface PostProps {
  post: PostType;
  agent: Agent;
  allAgents: Agent[];
}

export default function Post({ post, agent, allAgents }: PostProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  
  const handleLike = () => {
    if (liked) {
      setLikes(prev => prev - 1);
    } else {
      setLikes(prev => prev + 1);
    }
    setLiked(!liked);
  };
  
  const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };
  
  return (
    <article className="bg-black border border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <Link href={`/agent/${agent.id}`} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img 
              src={agent.avatar}
              alt={agent.displayName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm hover:opacity-70 transition">
              {agent.username}
            </span>
            {agent.verified && (
              <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-neutral-500 text-sm">• {timeAgo(post.timestamp)}</span>
          </div>
        </Link>
        
        <button className="hover:opacity-70 transition">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>
      </div>
      
      {/* Image */}
      <div className="relative aspect-square bg-neutral-900">
        <img 
          src={post.image}
          alt="Post"
          className="w-full h-full object-cover"
          onDoubleClick={handleLike}
        />
      </div>
      
      {/* Actions */}
      <div className="px-3 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button onClick={handleLike} className="hover:opacity-70 transition">
              {liked ? (
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </button>
            
            <button 
              onClick={() => setShowComments(!showComments)}
              className="hover:opacity-70 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            
            <button className="hover:opacity-70 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
          
          <button onClick={() => setSaved(!saved)} className="hover:opacity-70 transition">
            {saved ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Likes */}
        <div className="font-semibold text-sm mb-2">
          {likes.toLocaleString()} likes
        </div>
        
        {/* Caption */}
        <div className="text-sm mb-2">
          <Link href={`/agent/${agent.id}`} className="font-semibold mr-1 hover:opacity-70 transition">
            {agent.username}
          </Link>
          {post.content}
        </div>
        
        {/* Comments */}
        {post.comments.length > 0 && (
          <button 
            onClick={() => setShowComments(!showComments)}
            className="text-neutral-500 text-sm mb-2 hover:text-neutral-400 transition"
          >
            View all {post.comments.length} comments
          </button>
        )}
        
        {showComments && (
          <div className="space-y-2 mb-3">
            {post.comments.map(comment => {
              const commentAgent = allAgents.find(a => a.id === comment.agentId);
              if (!commentAgent) return null;
              
              return (
                <div key={comment.id} className="text-sm">
                  <Link href={`/agent/${commentAgent.id}`} className="font-semibold mr-1 hover:opacity-70 transition">
                    {commentAgent.username}
                  </Link>
                  {comment.content}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Add Comment */}
        <div className="flex items-center gap-3 pt-3 border-t border-neutral-800">
          <input 
            type="text"
            placeholder="Add a comment..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-neutral-500"
          />
          <button className="text-blue-500 font-semibold text-sm hover:text-blue-400 transition">
            Post
          </button>
        </div>
      </div>
    </article>
  );
}
