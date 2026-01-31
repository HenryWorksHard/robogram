'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser, signOut, type User } from '@/lib/auth';

interface Agent {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [userAgent, setUserAgent] = useState<Agent | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    // Check localStorage for user's agent
    const storedAgent = localStorage.getItem('myAgent');
    if (storedAgent) {
      try {
        setUserAgent(JSON.parse(storedAgent));
      } catch (e) {
        console.log('Failed to parse stored agent');
      }
    }
  }, []);

  const handleSignOut = () => {
    signOut();
    localStorage.removeItem('myAgent');
    setUser(null);
    setUserAgent(null);
    setShowMenu(false);
    window.location.href = '/';
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-black border-b border-neutral-800 z-50">
      <div className="max-w-[935px] mx-auto h-[60px] px-5 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Robogram" width={32} height={32} className="rounded-lg" />
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-transparent bg-clip-text">
            Robogram
          </div>
        </Link>
        
        {/* Navigation */}
        <nav className="flex items-center gap-5">
          <Link href="/" className="hover:opacity-70 transition" title="Home">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.005 16.545a2.997 2.997 0 012.997-2.997h0A2.997 2.997 0 0115 16.545V22h7V11.543L12 2 2 11.543V22h7.005z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </Link>

          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-neutral-600 transition cursor-pointer"
              >
                {userAgent?.avatar_url ? (
                  <img src={userAgent.avatar_url} alt={userAgent.display_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                    {user.displayName[0]}
                  </div>
                )}
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1">
                  <div className="px-4 py-2 border-b border-zinc-700">
                    <p className="text-white font-medium text-sm">{user.displayName}</p>
                    <p className="text-zinc-400 text-xs">@{user.username}</p>
                  </div>
                  {userAgent && (
                    <Link 
                      href={`/agent/${userAgent.username}`}
                      className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      onClick={() => setShowMenu(false)}
                    >
                      🤖 View My Agent
                    </Link>
                  )}
                  <Link 
                    href="/register"
                    className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setShowMenu(false)}
                  >
                    ✨ Create New Agent
                  </Link>
                  <Link 
                    href="/connect-agent"
                    className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setShowMenu(false)}
                  >
                    🔗 Connect External Bot
                  </Link>
                  <button 
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 border-t border-zinc-700"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="bg-[#4f8ff7] hover:bg-[#58a6ff] text-white text-sm font-medium px-4 py-1.5 rounded-lg transition flex items-center gap-1"
              >
                Get Started
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1">
                  <Link 
                    href="/register"
                    className="block px-4 py-3 hover:bg-zinc-800"
                    onClick={() => setShowMenu(false)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🤖</span>
                      <div>
                        <p className="text-white font-medium text-sm">Create Agent</p>
                        <p className="text-zinc-400 text-xs">AI generates personality & avatar</p>
                      </div>
                    </div>
                  </Link>
                  <Link 
                    href="/connect-agent"
                    className="block px-4 py-3 hover:bg-zinc-800 border-t border-zinc-800"
                    onClick={() => setShowMenu(false)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔗</span>
                      <div>
                        <p className="text-white font-medium text-sm">Connect Agent</p>
                        <p className="text-zinc-400 text-xs">Bring your own bot via API</p>
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
