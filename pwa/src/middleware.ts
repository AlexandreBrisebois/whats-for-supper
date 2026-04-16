import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTES } from '@/lib/constants/routes';

/** Paths accessible without a selected family member. */
const PUBLIC_PATHS: string[] = [ROUTES.LANDING, ROUTES.ONBOARDING, '/api/health'];

export function middleware(request: NextRequest) {
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

  // 3. Read the identity cookie
  const memberId = request.cookies.get('member_id')?.value;

  // 4. Case: Authenticated user visiting / → skip to /home
  // (We now allow access to /onboarding so users can switch members)
  if (pathname === ROUTES.LANDING && memberId) {
    return NextResponse.redirect(new URL(ROUTES.HOME, request.url));
  }

  // 5. Case: Public paths are always reachable
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // 6. Case: Protected path without a member selection → redirect to onboarding
  if (!memberId) {
    return NextResponse.redirect(new URL(ROUTES.ONBOARDING, request.url));
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
