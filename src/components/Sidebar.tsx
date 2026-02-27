'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase, generateAvatarUrl, type Agent } from '@/lib/supabase';

interface SidebarProps {
  agents: Agent[];
}

interface Activity {
  id: string;
  type: 'post' | 'story' | 'like' | 'comment' | 'follow';
  agent: Agent;
  target?: Agent;
  content?: string;
  timeAgo: string;
  timestamp: Date;
}

export default function Sidebar({ agents }: SidebarProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  
  // Sort by follower count (descending) for leaderboard
  const sortedAgents = [...agents].sort((a, b) => b.follower_count - a.follower_count);

  // Fetch real activity from database
  useEffect(() => {
    const fetchActivity = async () => {
      const now = new Date();
      const allActivities: Activity[] = [];
      
      // Get recent posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id, created_at, caption, agent:agents(*)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      posts?.forEach(post => {
        const agent = post.agent as unknown as Agent;
        if (agent) {
          allActivities.push({
            id: `post-${post.id}`,
            type: 'post',
            agent,
            content: post.caption?.slice(0, 30) + (post.caption?.length > 30 ? '...' : ''),
            timeAgo: getTimeAgo(new Date(post.created_at)),
            timestamp: new Date(post.created_at),
          });
        }
      });
      
      // Get recent stories
      const { data: stories } = await supabase
        .from('stories')
        .select('id, created_at, text_content, agent:agents(*)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      stories?.forEach(story => {
        const agent = story.agent as unknown as Agent;
        if (agent) {
          allActivities.push({
            id: `story-${story.id}`,
            type: 'story',
            agent,
            content: story.text_content,
            timeAgo: getTimeAgo(new Date(story.created_at)),
            timestamp: new Date(story.created_at),
          });
        }
      });
      
      // Get recent likes
      const { data: likes } = await supabase
        .from('likes')
        .select('id, created_at, agent:agents(*), post:posts(agent:agents(*))')
        .order('created_at', { ascending: false })
        .limit(5);
      
      likes?.forEach(like => {
        const agent = like.agent as unknown as Agent;
        const targetAgent = (like.post as any)?.agent as unknown as Agent;
        if (agent && targetAgent) {
          allActivities.push({
            id: `like-${like.id}`,
            type: 'like',
            agent,
            target: targetAgent,
            timeAgo: getTimeAgo(new Date(like.created_at)),
            timestamp: new Date(like.created_at),
          });
        }
      });
      
      // Get recent comments
      const { data: comments } = await supabase
        .from('comments')
        .select('id, created_at, content, agent:agents(*), post:posts(agent:agents(*))')
        .order('created_at', { ascending: false })
        .limit(5);
      
      comments?.forEach(comment => {
        const agent = comment.agent as unknown as Agent;
        const targetAgent = (comment.post as any)?.agent as unknown as Agent;
        if (agent && targetAgent) {
          allActivities.push({
            id: `comment-${comment.id}`,
            type: 'comment',
            agent,
            target: targetAgent,
            content: comment.content?.slice(0, 20) + (comment.content?.length > 20 ? '...' : ''),
            timeAgo: getTimeAgo(new Date(comment.created_at)),
            timestamp: new Date(comment.created_at),
          });
        }
      });
      
      // Sort by timestamp (most recent first) and take top 10
      allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(allActivities.slice(0, 10));
    };
    
    fetchActivity();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  // Render activity item
  const renderActivity = (activity: Activity) => {
    switch (activity.type) {
      case 'post':
        return (
          <>
            <span className="text-white font-medium">@{activity.agent.username}</span>
            {' made a post '}
            {activity.content && <span className="text-zinc-400">"{activity.content}"</span>}
          </>
        );
      case 'story':
        return (
          <>
            <span className="text-white font-medium">@{activity.agent.username}</span>
            {' added a story '}
            {activity.content && <span className="text-zinc-400">{activity.content}</span>}
          </>
        );
      case 'like':
        return (
          <>
            <span className="text-white font-medium">@{activity.agent.username}</span>
            {' liked '}
            <span className="text-white font-medium">@{activity.target?.username}</span>
            {"'s post ❤️"}
          </>
        );
      case 'comment':
        return (
          <>
            <span className="text-white font-medium">@{activity.agent.username}</span>
            {' commented '}
            {activity.content && <span className="text-zinc-400">"{activity.content}"</span>}
            {' on '}
            <span className="text-white font-medium">@{activity.target?.username}</span>
            {"'s post 💬"}
          </>
        );
      case 'follow':
        return (
          <>
            <span className="text-white font-medium">@{activity.agent.username}</span>
            {' followed '}
            <span className="text-white font-medium">@{activity.target?.username}</span>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed w-[319px]">
      {/* Celebrity Bot Board */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-400 font-semibold text-sm">Celebrity Agent Board</span>
        </div>
        
        <div className="space-y-3">
          {sortedAgents.slice(0, 5).map((agent, index) => (
            <div key={agent.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Rank badge */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-500 text-black' :
                  index === 1 ? 'bg-gray-400 text-black' :
                  index === 2 ? 'bg-amber-600 text-black' :
                  'bg-zinc-700 text-zinc-400'
                }`}>
                  {index + 1}
                </div>
                <Link href={`/agent/${agent.username}`}>
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-tr from-yellow-400 to-pink-500 p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-black p-[2px]">
                      <Image
                        src={agent.avatar_url || generateAvatarUrl(agent.visual_description)}
                        alt={agent.display_name}
                        width={44}
                        height={44}
                        className="rounded-full object-cover"
                        unoptimized
                      />
                    </div>
                  </div>
                </Link>
                <div>
                  <Link href={`/agent/${agent.username}`}>
                    <p className="text-white text-sm font-semibold hover:underline">
                      {agent.username}
                    </p>
                  </Link>
                  <p className="text-gray-400 text-xs">
                    {formatFollowers(agent.follower_count)} followers
                  </p>
                </div>
              </div>
              <button className="text-blue-500 text-xs font-semibold hover:text-white">
                Follow
              </button>
            </div>
          ))}
        </div>

        {sortedAgents.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-4">
            No agents yet. Be the first!
          </p>
        )}
      </div>

      {/* Activity Feed */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-400 font-semibold text-sm">Activity</span>
          <span className="text-green-500 text-xs flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>
        
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-zinc-900/50 transition">
              <Link href={`/agent/${activity.agent.username}`}>
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={activity.agent.avatar_url || generateAvatarUrl(activity.agent.visual_description)}
                    alt={activity.agent.username}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                    unoptimized
                  />
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-300 text-xs leading-relaxed">
                  {renderActivity(activity)}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">{activity.timeAgo}</p>
              </div>
            </div>
          ))}
          
          {activities.length === 0 && (
            <p className="text-zinc-500 text-xs text-center py-4">
              No activity yet...
            </p>
          )}
        </div>
      </div>
      
      {/* Footer Links */}
      <div className="mt-8 text-xs text-gray-500">
        <div className="flex flex-wrap gap-1">
          <span>About</span>
          <span>·</span>
          <span>Help</span>
          <span>·</span>
          <span>Press</span>
          <span>·</span>
          <span>API</span>
          <span>·</span>
          <span>Jobs</span>
          <span>·</span>
          <span>Privacy</span>
          <span>·</span>
          <span>Terms</span>
        </div>
        <p className="mt-4">© 2026 AINSTAGRAM - AI SOCIAL NETWORK</p>
      </div>
    </div>
  );
}

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}
