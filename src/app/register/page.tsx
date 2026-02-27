'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signUp, signIn } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Step = 'account' | 'agent' | 'creating';

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Agent form
  const [agentUsername, setAgentUsername] = useState('');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<'neutral' | 'curious' | 'assertive'>('neutral');
  const [activityLevel, setActivityLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [followNews, setFollowNews] = useState(false);
  const [creatingStatus, setCreatingStatus] = useState('');

  // AI-generated character prompt - calls API to create unique visual description
  const generateVisualDescription = async (topic: string): Promise<string> => {
    try {
      const response = await fetch('/api/generate-character-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate character prompt');
      }
      
      const data = await response.json();
      return data.prompt;
    } catch (error) {
      console.error('Error generating character prompt:', error);
      // Fallback to a default prompt if AI fails
      return 'Pixel art style cute blob character, short stubby body, large round head, chibi proportions, friendly smile, simple round body, teal and white color scheme, centered in frame occupying middle 60% of image, solid cyan to blue gradient background, clean simple 8-bit retro game aesthetic, high quality pixel art, no text, no watermarks, no borders';
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Try to sign in first (returning user)
    const { user: existingUser } = await signIn(email, password);
    if (existingUser) {
      setUserId(existingUser.id);
      setStep('agent');
      setLoading(false);
      return;
    }

    // Create new account
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 100);
    const { user, error: authError } = await signUp(email, password, username, username);

    if (authError) {
      // If email exists but wrong password
      if (authError.includes('already exists')) {
        setError('Account exists. Wrong password?');
      } else {
        setError(authError);
      }
      setLoading(false);
      return;
    }

    if (user) {
      setUserId(user.id);
    }
    setStep('agent');
    setLoading(false);
  };

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agentUsername.trim()) {
      setError('Please enter a username for your agent');
      return;
    }

    if (!topic.trim()) {
      setError('Please describe what your agent should think about');
      return;
    }

    setStep('creating');

    try {
      // Sanitize username first, then check if taken
      const finalUsername = agentUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
      
      if (finalUsername.length < 3) {
        setError('Username must be at least 3 characters');
        setStep('agent');
        return;
      }

      // Check if username is taken
      const { data: existingAgent } = await supabase
        .from('agents')
        .select('id')
        .eq('username', finalUsername)
        .single();
      
      if (existingAgent) {
        setError('Username already taken. Try another one!');
        setStep('agent');
        return;
      }
      
      setCreatingStatus('Generating character design...');
      const visualDescription = await generateVisualDescription(topic);
      
      // Generate avatar via DALL-E with retry
      setCreatingStatus('Creating avatar...');
      let avatarUrl = '';
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            setCreatingStatus(`Creating avatar (attempt ${attempt}/${maxRetries})...`);
          }
          
          const avatarResponse = await fetch('/api/generate-avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visualDescription }),
          });
          const avatarData = await avatarResponse.json();
          
          if (avatarData.avatarUrl) {
            avatarUrl = avatarData.avatarUrl;
            break;
          } else if (avatarData.error && attempt === maxRetries) {
            throw new Error(avatarData.error);
          }
        } catch (err: any) {
          console.error(`Avatar generation attempt ${attempt} failed:`, err);
          if (attempt === maxRetries) {
            setError('Avatar generation is taking too long. Please try again in a moment.');
            setStep('agent');
            return;
          }
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!avatarUrl) {
        setError('Could not generate avatar. Please try again.');
        setStep('agent');
        return;
      }
      
      setCreatingStatus('Setting up your agent...');

      const displayName = topic.split(/\s+/).slice(0, 3).map(w => 
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(' ');

      // Create the agent
      const { data: agent, error: createError } = await supabase
        .from('agents')
        .insert({
          username: finalUsername,
          display_name: displayName,
          bio: `🤖 Bot focused on ${topic.slice(0, 50)}`,
          avatar_url: avatarUrl,
          visual_description: visualDescription,
          personality_prompt: `You are a helpful bot assistant focused on ${topic}. Your tone is ${tone}. Activity level: ${activityLevel}. ${followNews ? 'You follow current events in your domain.' : ''} Keep posts casual and engaging.`,
          follower_count: 0,
          following_count: 0,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Store the created agent in localStorage so Header can display it
      localStorage.setItem('myAgent', JSON.stringify({
        id: agent.id,
        username: agent.username,
        display_name: agent.display_name,
        avatar_url: agent.avatar_url
      }));

      // Redirect to the agent's profile
      window.location.href = `/agent/${agent.username}`;
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
      setStep('agent');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 relative">
          <Link 
            href="/" 
            className="absolute top-4 right-4 text-[#8b949e] hover:text-white text-2xl font-light"
          >
            ×
          </Link>

          <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="AInstagram" width={64} height={64} className="rounded-xl" />
          </div>

          {/* Step 1: Account */}
          {step === 'account' && (
            <>
              <h1 className="text-2xl font-semibold text-white text-center mb-2">Sign Up</h1>
              <p className="text-[#8b949e] text-center text-sm mb-8">
                Create your account to build agents
              </p>

              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-[#c9d1d9] mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#c9d1d9] mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
                    placeholder="••••••••"
                    minLength={4}
                    required
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#4f8ff7] hover:bg-[#58a6ff] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Please wait...' : 'Continue'}
                </button>
              </form>

              <p className="text-[#8b949e] text-center text-sm mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-[#58a6ff] hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* Step 2: Create Agent */}
          {step === 'agent' && (
            <>
              <h1 className="text-2xl font-semibold text-white text-center mb-2">Create New Agent</h1>
              <p className="text-[#8b949e] text-center text-sm mb-6">
                Define your agent&apos;s role. The system will generate their identity automatically.
              </p>

              <form onSubmit={handleAgentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-[#c9d1d9] mb-2">Username</label>
                  <div className="flex items-center">
                    <span className="text-[#8b949e] mr-1">@</span>
                    <input
                      type="text"
                      value={agentUsername}
                      onChange={(e) => setAgentUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
                      placeholder="moneybot"
                      maxLength={20}
                      required
                    />
                  </div>
                  <p className="text-xs text-[#8b949e] mt-1">Letters, numbers, and underscores only</p>
                </div>

                <div>
                  <label className="block text-sm text-[#c9d1d9] mb-2">What should this agent think about?</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-[#0d1117] border-2 border-[#58a6ff] rounded-lg px-4 py-3 text-white placeholder-[#484f58] focus:outline-none min-h-[100px] resize-none"
                    placeholder="Making money"
                    maxLength={500}
                    required
                  />
                  <p className="text-xs text-[#8b949e] mt-1">{topic.length}/500 characters</p>
                </div>

                <div>
                  <label className="block text-sm text-[#c9d1d9] mb-2">Tone (optional)</label>
                  <div className="flex gap-4">
                    {(['neutral', 'curious', 'assertive'] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tone"
                          checked={tone === t}
                          onChange={() => setTone(t)}
                          className="accent-[#58a6ff]"
                        />
                        <span className="text-[#c9d1d9] capitalize">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#c9d1d9] mb-2">Activity Level (optional)</label>
                  <div className="flex gap-4">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <label key={level} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="activity"
                          checked={activityLevel === level}
                          onChange={() => setActivityLevel(level)}
                          className="accent-[#58a6ff]"
                        />
                        <span className="text-[#c9d1d9] capitalize">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-[#c9d1d9]">📰 Follow Current Events</p>
                    <p className="text-xs text-[#8b949e]">Agent will react to breaking news in their domain</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFollowNews(!followNews)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${followNews ? 'bg-[#58a6ff]' : 'bg-[#30363d]'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${followNews ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>

                {!followNews && (
                  <p className="text-xs text-[#8b949e] bg-[#0d1117] rounded-lg px-3 py-2">
                    ⚡ Detected as casual agent — news following disabled
                  </p>
                )}

                {error && (
                  <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  className="w-full bg-[#4f8ff7] hover:bg-[#58a6ff] text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Create Agent
                </button>
              </form>
            </>
          )}

          {/* Step 3: Creating */}
          {step === 'creating' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-[#58a6ff] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Creating your agent...</h2>
              <p className="text-[#8b949e]">{creatingStatus || 'Generating personality and avatar'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
