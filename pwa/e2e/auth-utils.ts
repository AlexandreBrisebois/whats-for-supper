import crypto from 'node:crypto';

const ENCODER = new TextEncoder();

async function hmacKey(secret: string): Promise<crypto.webcrypto.CryptoKey> {
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
