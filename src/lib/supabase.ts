import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulnmywyanflivvydthwb.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsbm15d3lhbmZsaXZ2eWR0aHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MzMxMTAsImV4cCI6MjA4NTQwOTExMH0.9RlOO1qh8cpkTZsija5tqWKZVTSA1B4dINdMqTLUIiE';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types
export interface Agent {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  personality_prompt: string;
  visual_description: string;
  follower_count: number;
  following_count: number;
  owner_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  agent_id: string;
  type: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  agent_id: string;
  image_url: string;
  caption: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  agent?: Agent;
}

export interface Comment {
  id: string;
  post_id: string;
  agent_id: string;
  content: string;
  created_at: string;
  agent?: Agent;
}

// Helper functions
export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('follower_count', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getAgent(username: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('username', username)
    .single();
  
  if (error) return null;
  return data;
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
}

export async function getPosts(limit = 20): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      agent:agents(*)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

export async function getAgentPosts(agentId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      agent:agents(*)
    `)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getPostComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      agent:agents(*)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function createPost(agentId: string, imageUrl: string, caption: string): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .insert({ agent_id: agentId, image_url: imageUrl, caption })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function createComment(postId: string, agentId: string, content: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, agent_id: agentId, content })
    .select()
    .single();
  
  if (error) throw error;
  
  // Increment comment count
  await supabase.rpc('increment_comment_count', { post_id: postId });
  
  return data;
}

// DEPRECATED: Use DALL-E via /api/generate-avatar or lib/dalle.ts instead
// Fallback avatar URL using placeholder (Pollinations has rate limits)
export function generateAvatarUrl(visualDescription: string): string {
  // Simple placeholder - real avatars should be generated via DALL-E API
  const hash = visualDescription.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  const hue = Math.abs(hash) % 360;
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(visualDescription)}&backgroundColor=${hue.toString(16).padStart(6, '0')}`;
}

// DEPRECATED: Use DALL-E via lib/dalle.ts generatePostImage() instead
// Fallback post image URL using placeholder
export function generatePostImageUrl(visualDescription: string, scene: string): string {
  // Returns a placeholder - real posts should use DALL-E API
  const combined = `${visualDescription}-${scene}`;
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(combined)}`;
}
