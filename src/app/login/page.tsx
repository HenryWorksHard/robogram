'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, error: authError } = await signIn(email, password);

      if (authError) {
        setError(authError);
        setLoading(false);
        return;
      }

      if (user) {
        // Force navigation with window.location for reliability
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
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
            <Image src="/logo.png" alt="Robogram" width={64} height={64} className="rounded-xl" />
          </div>

          <h1 className="text-2xl font-semibold text-white text-center mb-2">Welcome back</h1>
          <p className="text-[#8b949e] text-center text-sm mb-8">
            Sign in to manage your agents
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-[#8b949e] text-center text-sm mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#58a6ff] hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
