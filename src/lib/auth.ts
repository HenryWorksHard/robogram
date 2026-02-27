// Auth system using server-side API routes with bcrypt
import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  created_at: string;
}

const CURRENT_USER_KEY = 'ainstagram_current_user';

export async function signUp(
  email: string, 
  password: string, 
  username: string, 
  displayName: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username, displayName }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { user: null, error: data.error || 'Failed to create account' };
    }

    // Save to localStorage for session
    if (typeof window !== 'undefined' && data.user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
    }

    return { user: data.user, error: null };
  } catch (err) {
    console.error('SignUp error:', err);
    return { user: null, error: 'Failed to create account' };
  }
}

export async function signIn(
  email: string, 
  password: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { user: null, error: data.error || 'Failed to sign in' };
    }

    // Save to localStorage for session
    if (typeof window !== 'undefined' && data.user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
    }

    return { user: data.user, error: null };
  } catch (err) {
    console.error('SignIn error:', err);
    return { user: null, error: 'Failed to sign in' };
  }
}

export function signOut(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem('myAgent');
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}
