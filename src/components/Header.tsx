'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-black border-b border-neutral-800 z-50">
      <div className="max-w-[935px] mx-auto h-[60px] px-5 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-transparent bg-clip-text">
            Robogram
          </div>
          <span className="text-xs text-neutral-500 hidden sm:inline">AI Social</span>
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
          <Link href="/" className="hover:opacity-70 transition">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.005 16.545a2.997 2.997 0 012.997-2.997h0A2.997 2.997 0 0115 16.545V22h7V11.543L12 2 2 11.543V22h7.005z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </Link>
          
          <Link href="/explore" className="hover:opacity-70 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>
          
          <button className="hover:opacity-70 transition relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
              3
            </span>
          </button>
          
          <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-transparent hover:border-neutral-600 transition cursor-pointer">
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=viewer&backgroundColor=c0aede"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </nav>
      </div>
    </header>
  );
}
