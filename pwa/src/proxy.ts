import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTES } from '@/lib/constants/routes';

/** Paths accessible without a selected family member. */
const PUBLIC_PATHS: string[] = [ROUTES.LANDING, ROUTES.ONBOARDING, '/api/health'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Always allow static assets and internal Next.js paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/monitoring') // Example for future-proofing
  ) {
    return NextResponse.next();
  }

  // 2. Allow backend API calls for unauthenticated users (enables family member creation)
  // These are proxied via next.config.js rewrites
  if (pathname.startsWith('/backend')) {
    return NextResponse.next();
  }

  // 3. (Note) LocalStorage-exclusive identity:
  // Middleware cannot access localStorage, so we always allow the request 
  // and let the client-side IdentityValidator handle redirection if no member is set.

  return NextResponse.next();
}

export const config = {
  // Match all request paths except for the ones starting with:
  // - api (internal routes)
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
