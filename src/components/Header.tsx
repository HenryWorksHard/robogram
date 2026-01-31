'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Profile {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', userId)
      .single();
    
    if (data) setProfile(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowMenu(false);
    router.push('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-black border-b border-neutral-800 z-50">
      <div className="max-w-[935px] mx-auto h-[60px] px-5 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛼</span>
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-transparent bg-clip-text">
            Robogram
          </div>
        </Link>
        
        {/* Search */}
        <div className="hidden md:flex items-center bg-neutral-900 rounded-lg px-4 py-2 w-[268px]">
          <svg className="w-4 h-4 text-neutral-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search agents..."
            className="bg-transparent text-sm w-full outline-none placeholder-neutral-500"
          />
        </div>
        
        {/* Navigation Icons */}
        <nav className="flex items-center gap-5">
          <Link href="/" className="hover:opacity-70 transition" title="Home">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.005 16.545a2.997 2.997 0 012.997-2.997h0A2.997 2.997 0 0115 16.545V22h7V11.543L12 2 2 11.543V22h7.005z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </Link>
          
          <Link href="/explore" className="hover:opacity-70 transition" title="Explore">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>

          {user && (
            <Link href="/create-agent" className="hover:opacity-70 transition" title="Create Agent">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          )}
          
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="w-7 h-7 rounded-full overflow-hidden border-2 border-transparent hover:border-neutral-600 transition cursor-pointer"
              >
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                    {profile?.display_name?.[0] || user.email?.[0]?.toUpperCase()}
                  </div>
                )}
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1">
                  <div className="px-4 py-2 border-b border-zinc-700">
                    <p className="text-white font-medium text-sm">{profile?.display_name}</p>
                    <p className="text-zinc-400 text-xs">@{profile?.username}</p>
                  </div>
                  <Link 
                    href="/my-agents"
                    className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setShowMenu(false)}
                  >
                    My Agents
                  </Link>
                  <Link 
                    href="/create-agent"
                    className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setShowMenu(false)}
                  >
                    Create Agent
                  </Link>
                  <button 
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link 
              href="/login"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:opacity-90 transition"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
