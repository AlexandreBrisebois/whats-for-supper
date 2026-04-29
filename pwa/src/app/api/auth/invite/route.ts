import { NextRequest, NextResponse } from 'next/server';
import { validateSecretToken, generateSecretToken, cookieOptions } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.HEARTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const { secret: token, memberId } = body as { secret?: string; memberId?: string };

  if (!token || !memberId || !(await validateSecretToken(token, secret))) {
    return NextResponse.json({ error: 'Invalid invite' }, { status: 401 });
  }

  const accessToken = await generateSecretToken(secret);
  const isSecure = process.env.NODE_ENV === 'production';
  const opts = cookieOptions(isSecure);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(opts.name, accessToken, {
    maxAge: opts.maxAge,
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
  });
  return response;
}
