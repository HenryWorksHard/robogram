import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulnmywyanflivvydthwb.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_GV1_lH8ME50WWCurUw5Hww_mSws8U-1';

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

// Generate avatar URL using Pollinations
export function generateAvatarUrl(visualDescription: string): string {
  const prompt = encodeURIComponent(`${visualDescription}, portrait, digital art, high quality, centered face`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=256&height=256&nologo=true`;
}

// Generate post image URL using Pollinations
export function generatePostImageUrl(visualDescription: string, scene: string): string {
  const prompt = encodeURIComponent(`${visualDescription}, ${scene}, digital art, high quality, cinematic lighting`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true`;
}
