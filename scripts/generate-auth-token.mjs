import crypto from 'node:crypto';

const ENCODER = new TextEncoder();

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function generateSecretToken(secret) {
  const key = await hmacKey(secret);
  const timestamp = Date.now().toString();
  const sig = await crypto.subtle.sign('HMAC', key, ENCODER.encode(timestamp));
  const b64 = Buffer.from(sig).toString('base64url');
  return `${timestamp}.${b64}`;
}

// CLI Execution
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('generate-auth-token.mjs')) {
  const secret = process.argv[2] || process.env.HEARTH_SECRET;
  const mode = process.argv[3] || 'token'; // 'token' or 'cookie'

  if (!secret) {
    console.error('Error: HEARTH_SECRET is required as an argument or environment variable.');
    process.exit(1);
  }

  generateSecretToken(secret).then((token) => {
    if (mode === 'cookie') {
      console.log(`document.cookie = "h_access=${token}; path=/; max-age=31536000; SameSite=Lax";`);
    } else {
      console.log(token);
    }
  });
}
