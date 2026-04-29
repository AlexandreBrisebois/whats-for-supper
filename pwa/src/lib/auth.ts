const ENCODER = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function generateSecretToken(secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const timestamp = Date.now().toString();
  const sig = await crypto.subtle.sign('HMAC', key, ENCODER.encode(timestamp));
  const b64 = Buffer.from(sig).toString('base64url');
  return `${timestamp}.${b64}`;
}

export async function validateSecretToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [timestamp, b64] = parts;
  try {
    const key = await hmacKey(secret);
    const sigBytes = Buffer.from(b64, 'base64url');
    return await crypto.subtle.verify('HMAC', key, sigBytes, ENCODER.encode(timestamp));
  } catch {
    return false;
  }
}

export async function generateInviteLink(
  baseUrl: string,
  secret: string,
  memberId: string
): Promise<string> {
  const token = await generateSecretToken(secret);
  return `${baseUrl}/invite?secret=${encodeURIComponent(token)}&memberId=${encodeURIComponent(memberId)}`;
}

export function cookieOptions(secure: boolean) {
  const maxAge = 60 * 60 * 24 * 365;
  return {
    name: 'h_access',
    maxAge,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
  };
}
