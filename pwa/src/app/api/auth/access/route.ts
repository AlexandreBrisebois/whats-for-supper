import { NextRequest, NextResponse } from 'next/server';
import { generateSecretToken, cookieOptions } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.HEARTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const { passphrase } = body as { passphrase?: string };

  if (!passphrase || passphrase.trim() !== secret.trim()) {
    return NextResponse.json({ error: 'Invalid passphrase' }, { status: 401 });
  }

  const token = await generateSecretToken(secret);
  const isSecure = process.env.NODE_ENV === 'production';
  const opts = cookieOptions(isSecure);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(opts.name, token, {
    maxAge: opts.maxAge,
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
  });
  return response;
}
