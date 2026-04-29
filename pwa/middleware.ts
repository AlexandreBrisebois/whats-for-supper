import { NextRequest, NextResponse } from 'next/server';
import { validateSecretToken } from '@/lib/auth';

const PUBLIC_PATHS = ['/welcome', '/invite', '/join', '/api', '/backend'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (
    isPublic(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const secret = process.env.HEARTH_SECRET;
  const token = request.cookies.get('h_access')?.value;

  if (!secret || !token || !(await validateSecretToken(token, secret))) {
    const url = request.nextUrl.clone();
    url.pathname = '/welcome';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
