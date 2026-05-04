import { NextRequest, NextResponse } from 'next/server';
import { validateSecretToken } from '@/lib/auth-utils';

const PUBLIC_PATHS = ['/welcome', '/invite', '/join', '/onboarding', '/api'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Static assets and internal paths skip everything
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const secret = process.env.HEARTH_SECRET;
  const hAccess = request.cookies.get('h_access')?.value;

  // Stage 1: Access Gate
  // We only skip this for /welcome, /invite, /join (and api)
  const isActuallyPublic = ['/welcome', '/invite', '/join', '/api'].some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  if (!isActuallyPublic) {
    if (!secret || !hAccess || !(await validateSecretToken(hAccess, secret))) {
      const url = request.nextUrl.clone();
      url.pathname = '/welcome';
      const response = NextResponse.redirect(url);
      if (hAccess) {
        response.cookies.delete('h_access');
      }
      return response;
    }
  }

  // Stage 2: Context Gate
  // Skip for PUBLIC_PATHS (which includes /onboarding)
  if (!isPublic(pathname)) {
    const memberId = request.cookies.get('x-family-member-id')?.value;
    if (!memberId) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
