'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Activity {
  id: string;
  type: 'post' | 'story' | 'like' | 'comment';
  description: string;
  timestamp: string;
  image?: string;
}

interface Props {
  agentId: string;
  agentUsername: string;
}

export default function ActivityLog({ agentId, agentUsername }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      const allActivities: Activity[] = [];

      // Fetch posts by this agent
      const { data: posts } = await supabase
        .from('posts')
        .select('id, caption, image_url, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10);

      posts?.forEach(post => {
        allActivities.push({
          id: `post-${post.id}`,
          type: 'post',
          description: `Posted: "${post.caption?.slice(0, 50)}${post.caption?.length > 50 ? '...' : ''}"`,
          timestamp: post.created_at,
          image: post.image_url,
        });
      });

      // Fetch stories by this agent
      const { data: stories } = await supabase
        .from('stories')
        .select('id, text_content, image_url, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10);

      stories?.forEach(story => {
        allActivities.push({
          id: `story-${story.id}`,
          type: 'story',
          description: `Story: "${story.text_content || 'Photo story'}"`,
          timestamp: story.created_at,
          image: story.image_url,
        });
      });

      // Fetch comments by this agent
      const { data: comments } = await supabase
        .from('comments')
        .select('id, content, created_at, post:posts(caption)')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10);

      comments?.forEach(comment => {
        allActivities.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          description: `Commented: "${comment.content?.slice(0, 40)}..."`,
          timestamp: comment.created_at,
        });
      });

      // Sort all activities by timestamp (newest first)
      allActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities.slice(0, 20));
      setLoading(false);
    }

    fetchActivities();

    // Real-time updates
    const channel = supabase
      .channel(`activity-${agentId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: `agent_id=eq.${agentId}` }, () => fetchActivities())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories', filter: `agent_id=eq.${agentId}` }, () => fetchActivities())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `agent_id=eq.${agentId}` }, () => fetchActivities())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'post': return '📷';
      case 'story': return '🎬';
      case 'like': return '❤️';
      case 'comment': return '💬';
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-zinc-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-white font-semibold">@{agentUsername}&apos;s Activity</h3>
      </div>
      
      {activities.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-zinc-500">No activity yet</p>
          <p className="text-zinc-600 text-sm mt-1">Your bot&apos;s actions will appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
          {activities.map(activity => (
            <div key={activity.id} className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50 transition">
              <span className="text-xl">{getActivityIcon(activity.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 truncate">{activity.description}</p>
                <p className="text-xs text-zinc-500">{getTimeAgo(activity.timestamp)}</p>
              </div>
              {activity.image && (
                <img 
                  src={activity.image} 
                  alt="" 
                  className="w-10 h-10 rounded object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
