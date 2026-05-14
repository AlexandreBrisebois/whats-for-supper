'use server';

import { cookies } from 'next/headers';
import { generateSecretToken, validateSecretToken } from './auth-utils';

// --- Server Actions ---

/**
 * Validates a Hearth Secret token (HMAC check)
 */
export async function validateHearthSecret(token: string): Promise<boolean> {
  const secret = process.env.HEARTH_SECRET;
  if (!secret || !token) return false;
  return validateSecretToken(token, secret);
}

/**
 * Sets the h_access cookie with the provided token
 */
export async function setHearthCookie(token: string): Promise<void> {
  const isTest = process.env.NEXT_PUBLIC_ENVIRONMENT === 'test';
  const isSecure = process.env.NODE_ENV === 'production' && !isTest;
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  const maxAge = 60 * 60 * 24 * 365;

  (await cookies()).set('h_access', token, {
    maxAge,
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
    ...(domain ? { domain } : {}),
  });
}

/**
 * Clears the h_access cookie
 */
export async function clearAuth(): Promise<void> {
  (await cookies()).delete('h_access');
}

/**
 * Validates a raw passphrase and returns a signed token if valid
 */
export async function authenticateWithPassphrase(
  passphrase: string
): Promise<{ success: boolean; token?: string }> {
  const secret = process.env.HEARTH_SECRET;
  if (!secret) return { success: false };

  if (passphrase.trim() === secret.trim()) {
    const token = await generateSecretToken(secret);
    return { success: true, token };
  }

  return { success: false };
}

/**
 * Generates a magic link for a specific family member
 */
export async function getInviteLink(baseUrl: string, memberId: string): Promise<string> {
  const secret = process.env.HEARTH_SECRET;
  if (!secret) return '';
  const token = await generateSecretToken(secret);
  return `${baseUrl}/invite?secret=${encodeURIComponent(token)}&memberId=${encodeURIComponent(memberId)}`;
}

/**
 * Generates a magic link for voting (redirects to discovery)
 */
export async function getVotingLink(baseUrl: string): Promise<string> {
  const secret = process.env.HEARTH_SECRET;
  if (!secret) return '';
  const token = await generateSecretToken(secret);
  return `${baseUrl}/invite?secret=${encodeURIComponent(token)}&redirect=${encodeURIComponent('/discovery')}`;
}

/**
 * Sets the x-family-member-id cookie
 */
export async function setFamilyMemberCookie(id: string): Promise<void> {
  const isTest = process.env.NEXT_PUBLIC_ENVIRONMENT === 'test';
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  const maxAge = 60 * 60 * 24 * 365;

  // Only set Secure if in production AND not in a test/localhost environment.
  // This prevents cookies from being rejected when running E2E tests over HTTP.
  const isSecure =
    process.env.NODE_ENV === 'production' && !isTest && !domain?.includes('localhost');

  (await cookies()).set('x-family-member-id', id, {
    maxAge,
    httpOnly: false, // Must be accessible to client-side store/scripts
    sameSite: 'lax',
    secure: isSecure,
    path: '/',
    ...(domain ? { domain } : {}),
  });
}
