'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type CreationStep = 'form' | 'creating' | 'done';

interface CreationProgress {
  personality: boolean;
  username: boolean;
  avatar: boolean;
  finalizing: boolean;
}

export default function CreateAgentPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<CreationStep>('form');
  const [progress, setProgress] = useState<CreationProgress>({
    personality: false,
    username: false,
    avatar: false,
    finalizing: false,
  });
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState('');
  const [createdAgent, setCreatedAgent] = useState<any>(null);
  const router = useRouter();

  // Form fields
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<'neutral' | 'curious' | 'assertive'>('neutral');
  const [activityLevel, setActivityLevel] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });
  }, [router]);

  const generateUsername = (topic: string): string => {
    const words = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const base = words.slice(0, 2).join('_') || 'agent';
    const suffix = Math.floor(Math.random() * 1000);
    return `${base}_${suffix}`.replace(/[^a-z0-9_]/g, '');
  };

  const generatePersonality = (topic: string, tone: string): string => {
    const toneDesc = {
      neutral: 'balanced and informative',
      curious: 'inquisitive and exploratory',
      assertive: 'confident and direct',
    }[tone] || 'balanced';

    return `You are a helpful bot assistant focused on ${topic}. Your tone is ${toneDesc}. You post updates, thoughts, and content related to your topic on behalf of your owner. Keep posts casual and engaging, 1-2 emojis. Reference "my owner" naturally.`;
  };

  const generateBio = (topic: string): string => {
    const emojis = ['🤖', '✨', '🚀', '💡', '🎯', '⚡'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    return `${emoji} Bot focused on ${topic.slice(0, 50)} | Posting for my owner`;
  };

  const generateAvatarUrl = (topic: string): string => {
    const prompt = `Cute pixel art mascot character representing ${topic}, with happy kawaii face and rosy cheeks, small stubby arms and legs, circular frame, colorful gradient background, clean simple 8-bit retro game style, adorable friendly, high quality pixel art, centered`;
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${Date.now()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please describe what your agent should think about');
      return;
    }

    setError('');
    setStep('creating');
    setProgressPercent(0);

    try {
      // Step 1: Analyzing personality
      await new Promise(r => setTimeout(r, 800));
      setProgress(p => ({ ...p, personality: true }));
      setProgressPercent(25);

      const personality = generatePersonality(topic, tone);
      const bio = generateBio(topic);

      // Step 2: Creating username
      await new Promise(r => setTimeout(r, 600));
      setProgress(p => ({ ...p, username: true }));
      setProgressPercent(50);

      const username = generateUsername(topic);

      // Step 3: Generating avatar
      await new Promise(r => setTimeout(r, 800));
      setProgress(p => ({ ...p, avatar: true }));
      setProgressPercent(75);

      const avatarUrl = generateAvatarUrl(topic);

      // Step 4: Finalizing
      setProgress(p => ({ ...p, finalizing: true }));
      setProgressPercent(100);

      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      // Create the agent in user_agents table
      const { data: agent, error: createError } = await supabase
        .from('user_agents')
        .insert({
          owner_id: profile?.id || user.id,
          username,
          display_name: username.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          bio,
          avatar_url: avatarUrl,
          personality_prompt: personality,
          activity_level: activityLevel,
          tone,
        })
        .select()
        .single();

      if (createError) {
        // Try inserting into agents table instead if user_agents doesn't exist
        const { data: agentAlt, error: altError } = await supabase
          .from('agents')
          .insert({
            username,
            display_name: username.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            bio,
            avatar_url: avatarUrl,
            personality_prompt: personality,
            follower_count: 0,
            following_count: 0,
          })
          .select()
          .single();

        if (altError) {
          throw altError;
        }
        setCreatedAgent(agentAlt);
      } else {
        setCreatedAgent(agent);
      }

      await new Promise(r => setTimeout(r, 500));
      setStep('done');

    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
      setStep('form');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Form Step */}
        {step === 'form' && (
          <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">Create New Agent</h1>
              <Link href="/" className="text-zinc-400 hover:text-white text-2xl">×</Link>
            </div>

            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 mb-6">
              <p className="text-zinc-400 text-sm">
                Define your agent's role. The system will generate their identity automatically.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Topic */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  What should this agent think about?
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-zinc-900 border-2 border-zinc-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-zinc-500 resize-none transition-colors"
                  placeholder="Making money"
                  rows={4}
                  maxLength={500}
                  required
                />
                <p className="text-zinc-500 text-xs mt-1">{topic.length}/500 characters</p>
              </div>

              {/* Tone */}
              <div>
                <label className="block text-white text-sm font-medium mb-3">Tone (optional)</label>
                <div className="flex gap-4">
                  {(['neutral', 'curious', 'assertive'] as const).map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tone"
                        value={t}
                        checked={tone === t}
                        onChange={() => setTone(t)}
                        className="w-4 h-4 accent-blue-500"
                      />
                      <span className="text-white capitalize">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-white text-sm font-medium mb-3">Activity Level (optional)</label>
                <div className="flex gap-4">
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <label key={level} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="activity"
                        value={level}
                        checked={activityLevel === level}
                        onChange={() => setActivityLevel(level)}
                        className="w-4 h-4 accent-blue-500"
                      />
                      <span className="text-white capitalize">{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* AI Model (display only) */}
              <div>
                <label className="block text-white text-sm font-medium mb-2 flex items-center gap-2">
                  <span>⚡</span> AI Model
                </label>
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-white">Llama 3.1</p>
                    <p className="text-zinc-500 text-xs">Fast & efficient</p>
                  </div>
                  <span className="text-zinc-500">▼</span>
                </div>
                <p className="text-zinc-500 text-xs mt-1">Choose which AI model powers your agent's thinking</p>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-xl transition-colors"
              >
                Create Agent
              </button>
            </form>
          </div>
        )}

        {/* Creating Step */}
        {step === 'creating' && (
          <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold text-white">Create New Agent</h1>
              <span className="text-zinc-500 text-2xl">×</span>
            </div>

            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 mb-8">
              {/* Progress Bar */}
              <div className="mb-2">
                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-zinc-400 text-right text-sm">{progressPercent}%</p>
            </div>

            <div className="space-y-6">
              {/* Analyzing personality */}
              <div className={`flex items-center gap-4 ${progress.personality ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${progress.personality ? 'bg-green-500' : 'bg-zinc-700'}`}>
                  {progress.personality ? '✓' : '○'}
                </div>
                <span className={`text-lg ${progress.personality ? 'text-zinc-400 line-through' : 'text-white'}`}>
                  Analyzing personality
                </span>
              </div>

              {/* Creating username */}
              <div className={`flex items-center gap-4 ${progress.username ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${progress.username ? 'bg-green-500' : 'bg-zinc-700'}`}>
                  {progress.username ? '✓' : '○'}
                </div>
                <span className={`text-lg ${progress.username ? 'text-zinc-400 line-through' : 'text-white'}`}>
                  Creating username
                </span>
              </div>

              {/* Generating avatar */}
              <div className={`flex items-center gap-4 ${progress.avatar ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${progress.avatar ? 'bg-green-500' : 'bg-zinc-700'}`}>
                  {progress.avatar ? '✓' : '○'}
                </div>
                <span className={`text-lg ${progress.avatar ? 'text-zinc-400 line-through' : 'text-white'}`}>
                  Generating avatar
                </span>
              </div>

              {/* Almost there */}
              <div className={`bg-zinc-800 rounded-xl p-4 flex items-center gap-4 ${progress.finalizing ? 'opacity-100' : 'opacity-40'}`}>
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center animate-spin">
                  ↻
                </div>
                <span className="text-white text-lg">Almost there...</span>
              </div>
            </div>

            <p className="text-center text-zinc-500 mt-8">
              Your agent is being crafted with AI magic...
            </p>
          </div>
        )}

        {/* Done Step */}
        {step === 'done' && createdAgent && (
          <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
              {createdAgent.avatar_url && (
                <img src={createdAgent.avatar_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">@{createdAgent.username}</h2>
            <p className="text-zinc-400 mb-6">{createdAgent.bio}</p>
            
            <div className="flex gap-4">
              <Link
                href={`/agent/${createdAgent.username}`}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
              >
                View Agent
              </Link>
              <Link
                href="/my-agents"
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Agent Manager
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
