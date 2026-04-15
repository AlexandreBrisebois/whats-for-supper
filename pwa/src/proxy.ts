import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Paths accessible without a selected family member. */
const PUBLIC_PATHS = ['/', '/onboarding', '/api/health'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const memberId = request.cookies.get('member_id')?.value;

  // Authenticated user visiting /onboarding → skip to /home
  if (pathname === '/onboarding' && memberId) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Allow backend API calls for unauthenticated users to enable family member creation
  if (pathname.startsWith('/backend')) {
    return NextResponse.next();
  }

  // Public paths are always reachable for unauthenticated users
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Protected path: require a member selection
  if (!memberId) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
