const ENCODER = new TextEncoder();

// Base64URL helpers for Edge compatibility
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export function cookieOptions(secure: boolean) {
  const maxAge = 60 * 60 * 24 * 365;
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

  return {
    name: 'h_access',
    maxAge,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

export async function generateSecretToken(secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const timestamp = Date.now().toString();
  const sig = await crypto.subtle.sign('HMAC', key, ENCODER.encode(timestamp));
  const b64 = arrayBufferToBase64Url(sig);
  return `${timestamp}.${b64}`;
}

export async function validateSecretToken(
  token: string | null | undefined,
  secret: string
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [timestamp, b64] = parts;
  try {
    const key = await hmacKey(secret);
    const sigBytes = base64UrlToUint8Array(b64);
    return await crypto.subtle.verify('HMAC', key, sigBytes as any, ENCODER.encode(timestamp));
  } catch {
    return false;
  }
}
