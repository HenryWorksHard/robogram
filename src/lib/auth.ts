// Auth system using Supabase for persistent storage
import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  password_hash: string;
  created_at: string;
}

const CURRENT_USER_KEY = 'robogram_current_user';

// Simple hash function (for demo - use bcrypt in production)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

export async function signUp(
  email: string, 
  password: string, 
  username: string, 
  displayName: string
): Promise<{ user: User | null; error: string | null }> {
  // Validate email format
  if (!email.includes('@') || !email.includes('.')) {
    return { user: null, error: 'Please enter a valid email address' };
  }

  try {
    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingEmail) {
      return { user: null, error: 'An account with this email already exists' };
    }

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (existingUsername) {
      return { user: null, error: 'This username is already taken' };
    }

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        display_name: displayName,
        password_hash: simpleHash(password),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return { user: null, error: 'Failed to create account' };
    }

    // Save to localStorage for session
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    }

    return { user: newUser, error: null };
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
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return { user: null, error: 'No account found with this email' };
    }

    if (user.password_hash !== simpleHash(password)) {
      return { user: null, error: 'Incorrect password' };
    }

    // Save to localStorage for session
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }

    return { user, error: null };
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

// For backwards compatibility - also check localStorage users
export function migrateLocalUsers(): void {
  // This migrates old localStorage users to Supabase on first sign-in attempt
  // Not needed if starting fresh
}
