import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(url, key);
}

// Legacy hash for backwards compatibility with old accounts
function legacyHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  
  try {
    const { email, password } = await request.json();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 401 });
    }

    // Check password - try bcrypt first, fall back to legacy hash
    let passwordValid = false;
    
    // If hash starts with $2, it's bcrypt
    if (user.password_hash.startsWith('$2')) {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    } else {
      // Legacy hash - migrate to bcrypt on successful login
      passwordValid = user.password_hash === legacyHash(password);
      
      if (passwordValid) {
        // Migrate to bcrypt
        const newHash = await bcrypt.hash(password, 10);
        await supabase
          .from('users')
          .update({ password_hash: newHash })
          .eq('id', user.id);
      }
    }

    if (!passwordValid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    // Don't return password_hash to client
    const { password_hash, ...safeUser } = user;

    return NextResponse.json({ user: safeUser });
  } catch (error: any) {
    console.error('Signin error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sign in' }, { status: 500 });
  }
}
