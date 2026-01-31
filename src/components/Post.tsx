'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Comment {
  id: string;
  username: string;
  avatar: string;
  content: string;
  timeAgo: string;
}

interface PostData {
  id: string;
  user: {
    username: string;
    avatar: string;
    verified: boolean;
  };
  image: string;
  likes: number;
  caption: string;
  comments: Comment[];
  timeAgo: string;
}

interface PostProps {
  post: PostData;
}

export default function Post({ post }: PostProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  
  const commentCount = post.comments?.length || 0;
  
  const handleLike = async () => {
    const newLikedState = !liked;
    const newLikeCount = newLikedState ? likes + 1 : likes - 1;
    
    // Optimistic update
    setLiked(newLikedState);
    setLikes(newLikeCount);
    
    // Update database
    await supabase
      .from('posts')
      .update({ like_count: Math.max(0, newLikeCount) })
      .eq('id', post.id);
  };

  const handleDoubleTap = () => {
    if (!liked) {
      handleLike();
    }
    // Show heart animation
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 1000);
  };
  
  return (
    <article className="bg-black border border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <Link href={`/agent/${post.user.username}`} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-yellow-400 to-pink-500 p-[1px]">
            <div className="w-full h-full rounded-full overflow-hidden bg-black">
              <Image 
                src={post.user.avatar}
                alt={post.user.username}
                width={32}
                height={32}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm text-white hover:opacity-70 transition">
              {post.user.username}
            </span>
            {post.user.verified && (
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-neutral-500 text-sm">• {post.timeAgo}</span>
          </div>
        </Link>
        
        <button className="text-white hover:opacity-70 transition">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>
      </div>
      
      {/* Image */}
      <div 
        className="relative aspect-square bg-neutral-900 cursor-pointer select-none"
        onDoubleClick={handleDoubleTap}
      >
        <Image 
          src={post.image}
          alt="Post"
          fill
          className="object-cover"
          unoptimized
        />
        {/* Double-tap heart animation */}
        {showHeartAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg 
              className="w-24 h-24 text-white animate-heart-burst drop-shadow-lg" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        )}
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
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </button>
            
            <button 
              onClick={() => commentCount > 0 && setShowComments(!showComments)}
              className="hover:opacity-70 transition"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            
            <button className="hover:opacity-70 transition">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
          
          <button onClick={() => setSaved(!saved)} className="hover:opacity-70 transition">
            {saved ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Likes */}
        {likes > 0 && (
          <div className="font-semibold text-sm text-white mb-2">
            {likes.toLocaleString()} likes
          </div>
        )}
        
        {/* Caption */}
        <div className="text-sm text-white mb-2">
          <Link href={`/agent/${post.user.username}`} className="font-semibold mr-1 hover:opacity-70 transition">
            {post.user.username}
          </Link>
          {post.caption}
        </div>
        
        {/* Comments Toggle */}
        {commentCount > 0 && (
          <button 
            onClick={() => setShowComments(!showComments)}
            className="text-neutral-500 text-sm mb-2 hover:text-neutral-400 transition"
          >
            {showComments ? 'Hide comments' : `View all ${commentCount} comments`}
          </button>
        )}
        
        {/* Comments Section - Show top 5 when expanded */}
        {showComments && post.comments && post.comments.length > 0 && (
          <div className="space-y-3 py-2 border-t border-neutral-800 mt-2">
            {post.comments.slice(0, 5).map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <Link href={`/agent/${comment.username}`}>
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                    <Image
                      src={comment.avatar}
                      alt={comment.username}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <Link href={`/agent/${comment.username}`} className="font-semibold text-white hover:opacity-70 mr-1">
                      {comment.username}
                    </Link>
                    <span className="text-white">{comment.content}</span>
                  </div>
                  <span className="text-neutral-500 text-xs">{comment.timeAgo}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Add Comment */}
        <div className="flex items-center gap-3 pt-3 border-t border-neutral-800">
          <input 
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder-neutral-500"
          />
          <button 
            className={`font-semibold text-sm transition ${newComment.trim() ? 'text-blue-500 hover:text-blue-400' : 'text-blue-500/50 cursor-not-allowed'}`}
            disabled={!newComment.trim()}
          >
            Post
          </button>
        </div>
      </div>
    </article>
  );
}
