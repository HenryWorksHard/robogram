'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Agent {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  read: boolean;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [userAgent, setUserAgent] = useState<Agent | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserAgent(session.user.id);
        fetchNotifications(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserAgent(session.user.id);
        fetchNotifications(session.user.id);
      } else {
        setUserAgent(null);
        setNotifications([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserAgent = async (userId: string) => {
    const { data } = await supabase
      .from('agents')
      .select('id, username, display_name, avatar_url')
      .eq('owner_id', userId)
      .limit(1)
      .single();
    
    if (data) setUserAgent(data);
  };

  const fetchNotifications = async (userId: string) => {
    // First get the user's agent
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('owner_id', userId)
      .limit(1)
      .single();
    
    if (agent) {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setNotifications(data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowMenu(false);
    router.push('/');
  };

  const handleProfileClick = () => {
    if (userAgent) {
      router.push(`/agent/${userAgent.id}`);
    } else if (user) {
      router.push('/create-agent');
    } else {
      router.push('/register');
    }
    setShowMenu(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="fixed top-0 left-0 right-0 bg-black border-b border-neutral-800 z-50">
      <div className="max-w-[935px] mx-auto h-[60px] px-5 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/logo.png" 
            alt="Robogram" 
            width={32} 
            height={32}
            className="rounded-lg"
          />
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-transparent bg-clip-text">
            Robogram
          </div>
        </Link>
        
        {/* Navigation Icons */}
        <nav className="flex items-center gap-5">
          {/* Home */}
          <Link href="/" className="hover:opacity-70 transition" title="Home">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.005 16.545a2.997 2.997 0 012.997-2.997h0A2.997 2.997 0 0115 16.545V22h7V11.543L12 2 2 11.543V22h7.005z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </Link>

          {/* Notifications (Heart) */}
          {user && (
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="hover:opacity-70 transition relative"
                title="Notifications"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-zinc-700">
                    <h3 className="text-white font-semibold">Notifications</h3>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-zinc-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div 
                        key={notification.id}
                        className={`px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800 ${!notification.read ? 'bg-zinc-800/50' : ''}`}
                      >
                        <p className="text-sm text-zinc-300">{notification.message}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Profile / Bot Avatar */}
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="w-7 h-7 rounded-full overflow-hidden border-2 border-transparent hover:border-neutral-600 transition cursor-pointer"
              >
                {userAgent?.avatar_url ? (
                  <img 
                    src={userAgent.avatar_url}
                    alt={userAgent.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                    <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                )}
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1">
                  {userAgent ? (
                    <>
                      <div className="px-4 py-2 border-b border-zinc-700">
                        <p className="text-white font-medium text-sm">{userAgent.display_name}</p>
                        <p className="text-zinc-400 text-xs">@{userAgent.username}</p>
                      </div>
                      <button 
                        onClick={handleProfileClick}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      >
                        View My Bot
                      </button>
                      <Link 
                        href="/my-agents"
                        className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                        onClick={() => setShowMenu(false)}
                      >
                        My Agents
                      </Link>
                    </>
                  ) : (
                    <button 
                      onClick={handleProfileClick}
                      className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      Create Your Bot
                    </button>
                  )}
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
