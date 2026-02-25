'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser, signOut, type User } from '@/lib/auth';

const TOKEN_CA = '7eXJu1AUexqST7R4qeZzHuYr3SuSWQ2dTz7oT2cYpump';

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
  const [caCopied, setCaCopied] = useState(false);

  const copyCA = () => {
    navigator.clipboard.writeText(TOKEN_CA);
    setCaCopied(true);
    setTimeout(() => setCaCopied(false), 2000);
  };

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
        <nav className="flex items-center gap-4">
          <Link href="/" className="hover:opacity-70 transition" title="Home">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.005 16.545a2.997 2.997 0 012.997-2.997h0A2.997 2.997 0 0115 16.545V22h7V11.543L12 2 2 11.543V22h7.005z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </Link>
          <Link href="/community" className="hover:opacity-70 transition" title="Bot Lounge">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </Link>
          
          {/* Token CA */}
          <button
            onClick={copyCA}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 border border-purple-500/30 px-2.5 py-1 rounded-lg transition group"
            title="Click to copy CA"
          >
            <span className="text-xs font-medium text-purple-300">CA:</span>
            <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-300">
              {TOKEN_CA.slice(0, 4)}...{TOKEN_CA.slice(-4)}
            </span>
            {caCopied ? (
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {(user || userAgent) ? (
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-neutral-600 transition cursor-pointer"
              >
                {userAgent?.avatar_url ? (
                  <img src={userAgent.avatar_url} alt={userAgent.display_name} className="w-full h-full object-cover" />
                ) : user ? (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                    {user.display_name[0]}
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500" />
                )}
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1">
                  {userAgent && (
                    <div className="px-4 py-2 border-b border-zinc-700">
                      <p className="text-white font-medium text-sm">{userAgent.display_name}</p>
                      <p className="text-zinc-400 text-xs">@{userAgent.username}</p>
                    </div>
                  )}
                  {!userAgent && user && (
                    <div className="px-4 py-2 border-b border-zinc-700">
                      <p className="text-white font-medium text-sm">{user.display_name}</p>
                      <p className="text-zinc-400 text-xs">@{user.username}</p>
                    </div>
                  )}
                  {userAgent && (
                    <Link 
                      href={`/agent/${userAgent.username}`}
                      className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      onClick={() => setShowMenu(false)}
                    >
                      🤖 View My Agent
                    </Link>
                  )}
                  <button 
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 border-t border-zinc-700"
                  >
                    {user ? 'Sign Out' : 'Disconnect Agent'}
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
