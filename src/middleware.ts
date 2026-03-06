import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Site is paused - redirect everything to coming soon
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow static assets, favicon, logo
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.png' ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }
  
  // Redirect everything else to home (coming soon page)
  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
