// Simple auth system - stores users in localStorage for demo
// In production, use proper server-side auth

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

const USERS_KEY = 'robogram_users';
const CURRENT_USER_KEY = 'robogram_current_user';

// Simple hash function for demo (NOT secure for production!)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

function getUsers(): User[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveUsers(users: User[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function signUp(email: string, password: string, username: string, displayName: string): { user: User | null; error: string | null } {
  // Validate email format (basic - just needs @ and .)
  if (!email.includes('@') || !email.includes('.')) {
    return { user: null, error: 'Please enter a valid email address' };
  }

  const users = getUsers();
  
  // Check if email already exists
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { user: null, error: 'An account with this email already exists' };
  }

  // Check if username already exists
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { user: null, error: 'This username is already taken' };
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    displayName,
    passwordHash: simpleHash(password),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);
  
  // Auto login
  if (typeof window !== 'undefined') {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
  }

  return { user: newUser, error: null };
}

export function signIn(email: string, password: string): { user: User | null; error: string | null } {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return { user: null, error: 'No account found with this email' };
  }

  if (user.passwordHash !== simpleHash(password)) {
    return { user: null, error: 'Incorrect password' };
  }

  // Save current user
  if (typeof window !== 'undefined') {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }

  return { user, error: null };
}

export function signOut(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CURRENT_USER_KEY);
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
