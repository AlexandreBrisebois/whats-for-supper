import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTES } from '@/lib/constants/routes';

/** Cookie name for the active family member ID. */
const IDENTITY_COOKIE = 'x-family-member-id';

/** Paths accessible without a selected family member ID. */
const PUBLIC_PATHS: string[] = [
  ROUTES.LANDING, 
  ROUTES.ONBOARDING, 
  '/api/health',
  '/manifest.json',
  '/favicon.ico'
];

/**
 * Middleware function to handle routing and identity-based redirection.
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Always allow static assets and internal Next.js paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/monitoring')
  ) {
    return NextResponse.next();
  }

  // 2. Allow backend API calls (rewritten in next.config.js)
  if (pathname.startsWith('/backend')) {
    return NextResponse.next();
  }

  // 3. Identity check
  const hasIdentity = request.cookies.has(IDENTITY_COOKIE);
  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path);

  // If on a protected path without identity, redirect to onboarding
  if (!isPublicPath && !hasIdentity) {
    console.log(`[Middleware] No identity found for ${pathname}. Redirecting to onboarding.`);
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.ONBOARDING;
    return NextResponse.redirect(url);
  }

  // If on onboarding path WITH identity, redirect to home (optional, but good UX)
  if (pathname === ROUTES.ONBOARDING && hasIdentity) {
    console.log(`[Middleware] Identity found on onboarding. Redirecting to home.`);
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.HOME;
    return NextResponse.redirect(url);
  }

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
