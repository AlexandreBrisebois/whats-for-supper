import { NextRequest, NextResponse } from 'next/server';
import { generateInviteLink } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.HEARTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const { memberId } = body as { memberId?: string };
  if (!memberId) {
    return NextResponse.json({ error: 'memberId required' }, { status: 400 });
  }

  const baseUrl = request.headers.get('origin') ?? '';
  const link = await generateInviteLink(baseUrl, secret, memberId);
  return NextResponse.json({ link });
}
